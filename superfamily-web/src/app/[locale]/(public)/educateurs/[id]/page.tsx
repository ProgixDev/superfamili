import { notFound } from 'next/navigation'
import { apiGet } from '@/lib/api/client'
import type { Educator, Review, PaginatedResponse } from '@/types/api'
import { EducatorProfileView } from '@/components/educator/educator-profile-view'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  try {
    const educator = await apiGet<Educator>(`/educators/${id}`)
    return {
      title: `${educator.prenom} ${educator.nom} | SuperFamili`,
      description: educator.bio ?? `Profil de ${educator.prenom} ${educator.nom} sur SuperFamili`,
    }
  } catch {
    return {
      title: 'Educateur | SuperFamili',
    }
  }
}

export default async function EducateurProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  let educator: Educator
  let reviews: Review[] = []

  try {
    educator = await apiGet<Educator>(`/educators/${id}`)
  } catch {
    notFound()
  }

  try {
    const reviewsData = await apiGet<PaginatedResponse<Review>>(
      `/educators/${id}/reviews`,
      { page: '1', par_page: '10' }
    )
    reviews = reviewsData.data
  } catch {
    // Reviews might not be available; continue without them
  }

  return <EducatorProfileView educator={educator} reviews={reviews} />
}
