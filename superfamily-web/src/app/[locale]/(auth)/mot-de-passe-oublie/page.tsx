'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Mail, ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from '@/validators/auth.schema'

export default function MotDePasseOubliePage() {
  const router = useRouter()
  const t = useTranslations('auth')
  const tc = useTranslations('common')
  const [serverError, setServerError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  async function onSubmit(values: ForgotPasswordFormValues) {
    setServerError(null)
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error?.message || err.message || tc('error'))
      }
      setSent(true)
      // Short delay so the "email sent" confirmation flashes before we
      // jump the user into the code-entry screen.
      setTimeout(() => {
        const email = encodeURIComponent(values.email)
        router.push(`/reinitialiser-mot-de-passe?email=${email}`)
      }, 1200)
    } catch (err) {
      setServerError(err instanceof Error ? err.message : tc('error'))
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#1C2B20]">
          {t('forgotPasswordTitle')}
        </h1>
        <p className="mt-4 rounded-xl bg-[#E8F5EE] px-4 py-3 text-sm text-[#1B5E38]">
          {t('forgotPasswordSent')}
        </p>
        <p className="mt-2 text-sm font-semibold text-[#1C2B20]">
          {getValues('email')}
        </p>
      </div>
    )
  }

  return (
    <>
      <Link
        href="/connexion"
        className="mb-4 flex items-center gap-1 text-sm text-[#607060] hover:text-[#1C2B20] transition-colors"
      >
        <ArrowLeft className="size-4" />
        {t('backToLogin')}
      </Link>

      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-[#1C2B20]">
          {t('forgotPasswordTitle')}
        </h1>
        <p className="mt-1 text-sm text-[#607060]">
          {t('forgotPasswordSubtitle')}
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

        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full rounded-xl bg-[#2E7D52] text-[15px] font-semibold text-white hover:bg-[#1B5E38]"
        >
          {isSubmitting ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            t('sendCode')
          )}
        </Button>
      </form>
    </>
  )
}
