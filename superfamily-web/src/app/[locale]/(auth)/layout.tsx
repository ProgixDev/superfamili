import Link from "next/link"

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4FAF6] px-4 py-12">
      <div className="w-full max-w-[480px]">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-block">
            <img src="/images/logo.png" alt="SuperFamili" className="h-10 mx-auto" />
          </Link>
        </div>
        <div className="rounded-3xl bg-white p-8 shadow-[0_4px_24px_rgba(28,43,32,0.08)] ring-1 ring-[#D8EAE0]">
          {children}
        </div>
      </div>
    </div>
  )
}
