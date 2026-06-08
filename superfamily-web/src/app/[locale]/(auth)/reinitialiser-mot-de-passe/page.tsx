'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Lock, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  resetPasswordSchema,
  type ResetPasswordFormValues,
} from '@/validators/auth.schema'

export default function ReinitialiserMotDePassePage() {
  const router = useRouter()
  const params = useSearchParams()
  const t = useTranslations('auth')
  const tc = useTranslations('common')
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState(params.get('email') ?? '')

  useEffect(() => {
    // Keep the email field reactive if the user bounces between pages.
    const e = params.get('email')
    if (e) setEmail(e)
  }, [params])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { code: '', new_password: '', confirm_password: '' },
  })

  async function onSubmit(values: ResetPasswordFormValues) {
    setServerError(null)
    if (!email) {
      setServerError(t('forgotPasswordSubtitle'))
      return
    }
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code: values.code,
          new_password: values.new_password,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || err.message || t('invalidCode'))
      }
      setSuccess(true)
      setTimeout(() => router.push('/connexion'), 1500)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : tc('error'))
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E8F5EE]">
          <CheckCircle2 className="size-8 text-[#2E7D52]" />
        </div>
        <h1 className="text-2xl font-bold text-[#1C2B20]">
          {t('passwordResetSuccess')}
        </h1>
      </div>
    )
  }

  return (
    <>
      <Link
        href="/mot-de-passe-oublie"
        className="mb-4 flex items-center gap-1 text-sm text-[#607060] hover:text-[#1C2B20] transition-colors"
      >
        <ArrowLeft className="size-4" />
        {tc('back')}
      </Link>

      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-[#1C2B20]">
          {t('resetPasswordTitle')}
        </h1>
        <p className="mt-1 text-sm text-[#607060]">
          {t('resetPasswordSubtitle')}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {serverError && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">{t('email')}</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#607060]" />
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
              className="h-12 rounded-xl border-[#D8EAE0] pl-10 text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="code">{t('emailVerification')}</Label>
          <Input
            id="code"
            inputMode="numeric"
            maxLength={6}
            placeholder="123456"
            className="h-12 rounded-xl border-[#D8EAE0] text-center text-lg font-semibold tracking-[8px]"
            {...register('code')}
            aria-invalid={!!errors.code}
          />
          {errors.code && (
            <p className="text-xs text-red-600">{errors.code.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="new_password">{t('newPassword')}</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#607060]" />
            <Input
              id="new_password"
              type="password"
              placeholder={t('newPasswordPlaceholder')}
              className="h-12 rounded-xl border-[#D8EAE0] pl-10 text-sm"
              {...register('new_password')}
              aria-invalid={!!errors.new_password}
            />
          </div>
          {errors.new_password && (
            <p className="text-xs text-red-600">{errors.new_password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm_password">{t('confirmPassword')}</Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#607060]" />
            <Input
              id="confirm_password"
              type="password"
              className="h-12 rounded-xl border-[#D8EAE0] pl-10 text-sm"
              {...register('confirm_password')}
              aria-invalid={!!errors.confirm_password}
            />
          </div>
          {errors.confirm_password && (
            <p className="text-xs text-red-600">
              {errors.confirm_password.message}
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
            t('resetPassword')
          )}
        </Button>
      </form>
    </>
  )
}
