'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Mail, Lock, User, ArrowLeft, ShieldCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { signupSchema, type SignupFormValues } from '@/validators/auth.schema'
import { CitySelect } from '@/components/search/city-select'
import {
  SignupConsentModal,
  SIGNUP_CONSENT_VERSIONS,
  type SignupConsentDecisions,
} from '@/components/consents/signup-consent-modal'
import { apiPost } from '@/lib/api/client'

type Step = 'form' | 'otp'

export default function InscriptionPage() {
  const router = useRouter()
  const t = useTranslations('auth')
  const tc = useTranslations('common')
  const [serverError, setServerError] = useState<string | null>(null)
  const [step, setStep] = useState<Step>('form')
  const [savedValues, setSavedValues] = useState<SignupFormValues | null>(null)
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', ''])
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Consent gate. When the user clicks "Créer mon compte" we validate the
  // form, then stash the values and open the consent modal instead of
  // creating the account. `handleConsentAccept` drives the actual signup
  // once the user checks the required boxes.
  const [consentModalOpen, setConsentModalOpen] = useState(false)
  const [pendingSignupValues, setPendingSignupValues] = useState<SignupFormValues | null>(null)
  const [consentSubmitting, setConsentSubmitting] = useState(false)
  // Decisions survive the OTP step: we store them here when the modal
  // closes and POST them to /consents/accept from createBackendProfile
  // once the backend profile exists.
  const [pendingConsentDecisions, setPendingConsentDecisions] =
    useState<SignupConsentDecisions | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      role: 'parent',
      postal_code: '',
      city: '',
    },
  })

  const selectedRole = watch('role')

  // Step 0: Open consent modal. The form is valid at this point (react-
  // hook-form has already run the zod resolver), so we stash the values
  // and let `handleConsentAccept` do the actual signup once the user
  // ticks the terms + privacy checkboxes.
  async function onSubmit(values: SignupFormValues) {
    setServerError(null)
    setPendingSignupValues(values)
    setConsentModalOpen(true)
  }

  /**
   * Fired by the SignupConsentModal after the user checks the required
   * boxes and clicks Accept. Drives the original signup path (Supabase
   * auth → /auth/signup → OTP or redirect) and, once the profile exists,
   * records the three consent decisions via POST /consents/accept.
   */
  async function handleConsentAccept(decisions: SignupConsentDecisions) {
    if (!pendingSignupValues) return
    setConsentSubmitting(true)
    // Stash the decisions so createBackendProfile can pick them up —
    // that function runs either immediately (no OTP) or after the user
    // verifies their OTP code, so the decisions need to outlive the
    // consent modal lifetime.
    setPendingConsentDecisions(decisions)
    try {
      await runSignup(pendingSignupValues, decisions)
    } finally {
      setConsentSubmitting(false)
      setConsentModalOpen(false)
    }
  }

  // The original signup path, kept as a separate function so the consent
  // handler can await it. Takes the decisions as an extra arg so it
  // knows what to POST to /consents/accept after profile creation.
  //
  // Backend-driven signup flow (Supabase never sends its own confirmation
  // email — we create the auth.users row server-side with email_confirm:false
  // and handle verification via SMTP OTP):
  //   1) POST /auth/signup-init → creates the Supabase user + emails the OTP.
  //   2) User enters the code → POST /auth/verify-email confirms the user and
  //      returns an access/refresh session.
  //   3) Frontend installs the session, then POSTs /auth/signup to create
  //      the public.profiles row (existing endpoint, unchanged).
  async function runSignup(
    values: SignupFormValues,
    decisions: SignupConsentDecisions,
  ) {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const res = await fetch(`${API_URL}/auth/signup-init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          first_name: values.first_name,
          last_name: values.last_name,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const code = res.status
        const message: string =
          err?.error?.message || err?.message || ''
        if (code === 409 || /déjà utilisée|already/i.test(message)) {
          setServerError(t('emailAlreadyUsed'))
        } else if (/mot de passe|password/i.test(message)) {
          setServerError(t('passwordCriteria'))
        } else if (code === 429) {
          setServerError(t('tooManyAttempts'))
        } else if (/courriel|email/i.test(message)) {
          setServerError(t('invalidEmail'))
        } else {
          setServerError(t('errorPrefix', { message: message || `HTTP ${code}` }))
        }
        return
      }
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : t('verificationError'),
      )
      return
    }

    // Consent decisions survive the OTP step via `pendingConsentDecisions`.
    void decisions

    setSavedValues(values)
    setStep('otp')
    startResendCooldown()
  }

  // Step 2: Verify OTP code via the backend. On success the backend mints a
  // fresh session (access + refresh tokens) which we install into the
  // Supabase client before calling /auth/signup to create the profile.
  async function verifyOtp() {
    if (!savedValues) return
    setIsVerifying(true)
    setServerError(null)

    const code = otpCode.join('')
    if (code.length !== 6) {
      setServerError(t('enterCode'))
      setIsVerifying(false)
      return
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const res = await fetch(`${API_URL}/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: savedValues.email, code }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const msg = err?.error?.message || err.message || t('invalidCode')
        setServerError(msg)
        setIsVerifying(false)
        return
      }

      const payload = await res.json()
      const data = payload?.data ?? payload
      const accessToken = data?.access_token
      const refreshToken = data?.refresh_token
      if (!accessToken || !refreshToken) {
        setServerError(t('verificationError'))
        setIsVerifying(false)
        return
      }

      // Install the backend-minted session into Supabase so the existing
      // auth store + apiPost() helpers see the user as logged in.
      const supabase = createClient()
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      if (sessionError) {
        setServerError(t('verificationError'))
        setIsVerifying(false)
        return
      }

      await createBackendProfile(savedValues, accessToken)
    } catch {
      setServerError(t('verificationError'))
    }
    setIsVerifying(false)
  }

  // Create profile in NestJS backend, then record the consent decisions.
  async function createBackendProfile(values: SignupFormValues, token: string) {
    const supabase = createClient()

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          first_name: values.first_name,
          last_name: values.last_name,
          role: values.role,
          ...(values.postal_code ? { postal_code: values.postal_code.toUpperCase() } : {}),
          ...(values.city ? { city: values.city } : {}),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || t('profileCreationError'))
      }
    } catch (err) {
      try { await supabase.auth.signOut() } catch {}
      const message = err instanceof Error ? err.message : t('profileCreationError')
      setServerError(`${message}. ${t('pleaseRetry')}`)
      setStep('form')
      return
    }

    // Profile exists now — record the consent decisions. These POSTs are
    // best-effort: a failure here shouldn't block the signup flow, so we
    // swallow errors and log to console. The next time the user visits
    // a consent-gated feature (KYC, etc.), the backend gate will catch
    // any missing consent and the frontend will re-prompt.
    const decisions = pendingConsentDecisions
    if (decisions) {
      try {
        await apiPost('/consents/accept', {
          consent_type: 'terms_of_use',
          version: SIGNUP_CONSENT_VERSIONS.terms_of_use,
          accepted: true,
        })
        await apiPost('/consents/accept', {
          consent_type: 'privacy_policy',
          version: SIGNUP_CONSENT_VERSIONS.privacy_policy,
          accepted: true,
        })
        await apiPost('/consents/accept', {
          consent_type: 'marketing_emails',
          version: SIGNUP_CONSENT_VERSIONS.marketing_emails,
          accepted: decisions.marketing,
        })
      } catch (err) {
        // Non-fatal — logged for debugging, user proceeds to dashboard.
        console.error('Consent recording failed after signup:', err)
      }
      setPendingConsentDecisions(null)
    }

    if (values.role === 'educator') {
      router.push('/educateur/inscription/verification')
    } else {
      router.push('/parent/tableau-de-bord')
    }
    router.refresh()
  }

  // Resend OTP — hits the same backend endpoint as initial signup. The
  // backend invalidates prior unconsumed codes for (email, purpose) before
  // issuing a new one, so only the most recent code works.
  async function resendOtp() {
    if (!savedValues || resendCooldown > 0) return
    setIsResending(true)
    setServerError(null)

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const res = await fetch(`${API_URL}/auth/send-verification-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: savedValues.email, first_name: savedValues.first_name }),
      })
      if (!res.ok) throw new Error()
      setOtpCode(['', '', '', '', '', ''])
      startResendCooldown()
    } catch {
      setServerError(t('cannotResend'))
    }
    setIsResending(false)
  }

  function startResendCooldown() {
    setResendCooldown(60)
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // OTP input handlers
  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const newCode = [...otpCode]
    newCode[index] = value.slice(-1)
    setOtpCode(newCode)

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'Enter' && otpCode.join('').length === 6) {
      verifyOtp()
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 0) return
    const newCode = [...otpCode]
    for (let i = 0; i < 6; i++) {
      newCode[i] = pasted[i] || ''
    }
    setOtpCode(newCode)
    const focusIndex = Math.min(pasted.length, 5)
    inputRefs.current[focusIndex]?.focus()
  }

  // ─── OTP Verification Screen ───────────────────────────────
  if (step === 'otp') {
    return (
      <>
        <button
          onClick={() => { setStep('form'); setServerError(null); setOtpCode(['', '', '', '', '', '']) }}
          className="mb-4 flex items-center gap-1 text-sm text-[#607060] hover:text-[#1C2B20] transition-colors"
        >
          <ArrowLeft className="size-4" />
          {tc('back')}
        </button>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E8F5EE]">
            <ShieldCheck className="size-8 text-[#2E7D52]" />
          </div>
          <h1 className="text-2xl font-bold text-[#1C2B20]">{t('emailVerification')}</h1>
          <p className="mt-2 text-sm text-[#607060]">
            {t('codeSent')}
          </p>
          <p className="mt-1 text-sm font-semibold text-[#1C2B20]">
            {savedValues?.email}
          </p>
        </div>

        {serverError && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <div className="flex justify-center gap-2 mb-6" onPaste={handleOtpPaste}>
          {otpCode.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(index, e)}
              className="h-14 w-12 rounded-xl border-2 border-[#D8EAE0] bg-white text-center text-xl font-bold text-[#1C2B20] outline-none transition-colors focus:border-[#2E7D52] focus:ring-2 focus:ring-[#2E7D52]/20"
              autoFocus={index === 0}
            />
          ))}
        </div>

        <Button
          onClick={verifyOtp}
          disabled={isVerifying || otpCode.join('').length !== 6}
          className="h-12 w-full rounded-xl bg-[#2E7D52] text-[15px] font-semibold text-white hover:bg-[#1B5E38]"
        >
          {isVerifying ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            t('verifyAndContinue')
          )}
        </Button>

        <div className="mt-4 text-center">
          <p className="text-sm text-[#607060]">
            {t('didntReceiveCode')}
          </p>
          <button
            onClick={resendOtp}
            disabled={isResending || resendCooldown > 0}
            className="mt-1 text-sm font-semibold text-[#2E7D52] hover:underline disabled:text-[#607060] disabled:no-underline"
          >
            {isResending
              ? t('sending')
              : resendCooldown > 0
                ? t('resendIn', { seconds: resendCooldown })
                : t('resendCode')}
          </button>
        </div>

        <p className="mt-4 text-center text-xs text-[#607060]">
          {t('checkSpam')}
        </p>
      </>
    )
  }

  // ─── Signup Form ───────────────────────────────────────────
  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-[#1C2B20]">{t('createAccount')}</h1>
        <p className="mt-1 text-sm text-[#607060]">
          {t('joinSuperFamily')}
        </p>
      </div>

      {/* Role selector tabs */}
      <div className="mb-6 flex overflow-hidden rounded-xl bg-[#F4FAF6]">
        <button
          type="button"
          onClick={() => setValue('role', 'parent')}
          className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
            selectedRole === 'parent'
              ? 'bg-[#2E7D52] text-white'
              : 'text-[#607060] hover:text-[#1C2B20]'
          }`}
        >
          {t('iAmParent')}
        </button>
        <button
          type="button"
          onClick={() => setValue('role', 'educator')}
          className={`flex-1 px-4 py-3 text-sm font-semibold transition-colors ${
            selectedRole === 'educator'
              ? 'bg-[#2E7D52] text-white'
              : 'text-[#607060] hover:text-[#1C2B20]'
          }`}
        >
          {t('iAmEducator')}
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="first_name">{t('firstName')}</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#607060]" />
              <Input
                id="first_name"
                placeholder={t('firstNamePlaceholder')}
                className="h-12 rounded-xl border-[#D8EAE0] pl-10 text-sm"
                {...register('first_name')}
                aria-invalid={!!errors.first_name}
              />
            </div>
            {errors.first_name && (
              <p className="text-xs text-red-600">{errors.first_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="last_name">{t('lastName')}</Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#607060]" />
              <Input
                id="last_name"
                placeholder={t('lastNamePlaceholder')}
                className="h-12 rounded-xl border-[#D8EAE0] pl-10 text-sm"
                {...register('last_name')}
                aria-invalid={!!errors.last_name}
              />
            </div>
            {errors.last_name && (
              <p className="text-xs text-red-600">{errors.last_name.message}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t('email')}</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#607060]" />
            <Input
              id="email"
              type="email"
              placeholder={t('emailPlaceholder')}
              className="h-12 rounded-xl border-[#D8EAE0] pl-10 text-sm"
              {...register('email')}
              aria-invalid={!!errors.email}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t('password')}</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#607060]" />
            <Input
              id="password"
              type="password"
              placeholder={t('passwordPlaceholder')}
              className="h-12 rounded-xl border-[#D8EAE0] pl-10 text-sm"
              {...register('password')}
              aria-invalid={!!errors.password}
            />
          </div>
          {errors.password && (
            <p className="text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>{t('cityLabel')}</Label>
          <CitySelect
            value={watch('city') || ''}
            onChange={(city) => setValue('city', city, { shouldDirty: true })}
            placeholder={t('cityPlaceholder')}
          />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full rounded-xl bg-[#2E7D52] text-[15px] font-semibold text-white hover:bg-[#1B5E38]"
        >
          {isSubmitting ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            t('createMyAccount')
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[#607060]">
        {t('alreadyHaveAccount')}{' '}
        <Link
          href="/connexion"
          className="font-semibold text-[#2E7D52] hover:underline"
        >
          {t('signIn')}
        </Link>
      </p>

      {/* Consent gate — opens when the form is submitted, closes only
          when the user accepts or explicitly declines. */}
      <SignupConsentModal
        open={consentModalOpen}
        onClose={() => {
          if (!consentSubmitting) {
            setConsentModalOpen(false)
            setPendingSignupValues(null)
          }
        }}
        onAccept={handleConsentAccept}
        submitting={consentSubmitting}
      />
    </>
  )
}
