'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Mail, Lock } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { loginSchema, type LoginFormValues } from '@/validators/auth.schema'

export default function ConnexionPage() {
  const router = useRouter()
  const params = useParams<{ locale: string }>()
  const locale = params?.locale ?? 'fr'
  const t = useTranslations('auth')
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function onSubmit(values: LoginFormValues) {
    setServerError(null)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    if (error) {
      if (error.message === 'Invalid login credentials') {
        setServerError(t('invalidCredentials'))
      } else if (error.message === 'Email not confirmed') {
        setServerError(t('emailNotConfirmed'))
      } else {
        setServerError(t('genericSignInError'))
      }
      return
    }

    // Ensure we actually got a valid session
    if (!data.session?.access_token) {
      setServerError(t('invalidSession'))
      return
    }

    // Profile verification + role-based routing is now handled server-side
    // by the locale homepage (src/app/[locale]/page.tsx). Doing it from the
    // browser here was fragile: VPNs / privacy extensions / CORS quirks all
    // turned the call into a "Failed to fetch" and blocked legitimate logins.
    // Pushing to "/" lets the Next.js server read the freshly-set Supabase
    // session cookie, fetch the profile node-to-node, and redirect to the
    // correct dashboard.
    router.replace(`/${locale}`)
    router.refresh()
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-[#1C2B20]">{t('signInTitle')}</h1>
        <p className="mt-1 text-sm text-[#607060]">
          {t('signInSubtitle')}
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

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t('password')}</Label>
            <Link
              href="/mot-de-passe-oublie"
              className="text-xs font-semibold text-[#2E7D52] hover:underline"
            >
              {t('forgotPassword')}
            </Link>
          </div>
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

        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full rounded-xl bg-[#2E7D52] text-[15px] font-semibold text-white hover:bg-[#1B5E38]"
        >
          {isSubmitting ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            t('signIn')
          )}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[#D8EAE0]" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-3 text-[#607060]">{t('divider')}</span>
        </div>
      </div>

      <p className="text-center text-sm text-[#607060]">
        {t('noAccount')}{' '}
        <Link
          href="/inscription"
          className="font-semibold text-[#2E7D52] hover:underline"
        >
          {t('createAccountLink')}
        </Link>
      </p>
    </>
  )
}
