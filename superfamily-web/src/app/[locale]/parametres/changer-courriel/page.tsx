'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Loader2,
  Mail,
  ShieldCheck,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiPost, apiGet } from '@/lib/api/client'
import {
  changeEmailSchema,
  type ChangeEmailFormValues,
} from '@/validators/auth.schema'

type Step = 'request' | 'verify' | 'done'

interface ProfileMe {
  email?: string
  data?: { email?: string }
}

export default function ChangerCourrielPage() {
  const router = useRouter()
  const t = useTranslations('auth')
  const tc = useTranslations('common')
  const [step, setStep] = useState<Step>('request')
  const [serverError, setServerError] = useState<string | null>(null)
  const [currentEmail, setCurrentEmail] = useState<string>('')
  const [pendingEmail, setPendingEmail] = useState<string>('')
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', ''])
  const [isVerifying, setIsVerifying] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangeEmailFormValues>({
    resolver: zodResolver(changeEmailSchema),
    defaultValues: { new_email: '' },
  })

  useEffect(() => {
    // Show the user's current address so they know what they're changing from.
    apiGet<ProfileMe>('/profiles/me')
      .then((p) => {
        const email = p?.email ?? p?.data?.email ?? ''
        setCurrentEmail(email)
      })
      .catch(() => {
        router.push('/connexion')
      })
  }, [router])

  async function onSubmit(values: ChangeEmailFormValues) {
    setServerError(null)
    try {
      await apiPost('/auth/request-email-change', { new_email: values.new_email })
      setPendingEmail(values.new_email)
      setStep('verify')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : tc('error'))
    }
  }

  async function verifyOtp() {
    setIsVerifying(true)
    setServerError(null)
    const code = otpCode.join('')
    if (code.length !== 6) {
      setServerError(t('enterCode'))
      setIsVerifying(false)
      return
    }
    try {
      await apiPost('/auth/confirm-email-change', {
        new_email: pendingEmail,
        code,
      })
      setStep('done')
    } catch (err) {
      setServerError(err instanceof Error ? err.message : t('invalidCode'))
    }
    setIsVerifying(false)
  }

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const next = [...otpCode]
    next[index] = value.slice(-1)
    setOtpCode(next)
    if (value && index < 5) inputRefs.current[index + 1]?.focus()
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
    if (e.key === 'Enter' && otpCode.join('').length === 6) verifyOtp()
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = [...otpCode]
    for (let i = 0; i < 6; i++) next[i] = pasted[i] || ''
    setOtpCode(next)
    const focusIndex = Math.min(pasted.length, 5)
    inputRefs.current[focusIndex]?.focus()
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="rounded-3xl bg-white p-8 shadow-[0_4px_24px_rgba(28,43,32,0.08)] ring-1 ring-[#D8EAE0]">
        {step !== 'done' && (
          <Link
            href="/parametres"
            className="mb-4 flex items-center gap-1 text-sm text-[#607060] hover:text-[#1C2B20] transition-colors"
          >
            <ArrowLeft className="size-4" />
            {tc('back')}
          </Link>
        )}

        {step === 'request' && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-[#1C2B20]">
                {t('changeEmailTitle')}
              </h1>
              <p className="mt-1 text-sm text-[#607060]">
                {t('changeEmailSubtitle')}
              </p>
            </div>

            {currentEmail && (
              <div className="mb-4 rounded-xl bg-[#F4FAF6] px-4 py-3 text-sm text-[#1C2B20]">
                <span className="text-[#607060]">{t('currentEmail')}:</span>{' '}
                <span className="font-semibold">{currentEmail}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {serverError && (
                <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {serverError}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="new_email">{t('newEmail')}</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#607060]" />
                  <Input
                    id="new_email"
                    type="email"
                    placeholder={t('emailPlaceholder')}
                    className="h-12 rounded-xl border-[#D8EAE0] pl-10 text-sm"
                    {...register('new_email')}
                    aria-invalid={!!errors.new_email}
                  />
                </div>
                {errors.new_email && (
                  <p className="text-xs text-red-600">
                    {errors.new_email.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 w-full rounded-xl bg-[#2E7D52] text-[15px] font-semibold text-white hover:bg-[#1B5E38]"
              >
                {isSubmitting ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  t('changeEmailSend')
                )}
              </Button>
            </form>
          </>
        )}

        {step === 'verify' && (
          <>
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E8F5EE]">
                <ShieldCheck className="size-8 text-[#2E7D52]" />
              </div>
              <h1 className="text-2xl font-bold text-[#1C2B20]">
                {t('changeEmailVerifyTitle')}
              </h1>
              <p className="mt-2 text-sm text-[#607060]">
                {t('changeEmailVerifySubtitle')}
              </p>
              <p className="mt-1 text-sm font-semibold text-[#1C2B20]">
                {pendingEmail}
              </p>
            </div>

            {serverError && (
              <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            <div
              className="flex justify-center gap-2 mb-6"
              onPaste={handleOtpPaste}
            >
              {otpCode.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputRefs.current[i] = el
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="h-14 w-12 rounded-xl border-2 border-[#D8EAE0] bg-white text-center text-xl font-bold text-[#1C2B20] outline-none transition-colors focus:border-[#2E7D52] focus:ring-2 focus:ring-[#2E7D52]/20"
                  autoFocus={i === 0}
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
                t('confirm')
              )}
            </Button>
          </>
        )}

        {step === 'done' && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E8F5EE]">
              <CheckCircle2 className="size-8 text-[#2E7D52]" />
            </div>
            <h1 className="text-2xl font-bold text-[#1C2B20]">
              {t('changeEmailSuccess')}
            </h1>
            <p className="mt-2 text-sm text-[#607060]">{pendingEmail}</p>
            <Link
              href="/parametres"
              className="mt-6 inline-block font-semibold text-[#2E7D52] hover:underline"
            >
              {tc('back')}
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
