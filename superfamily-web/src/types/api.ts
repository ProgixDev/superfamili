// -- Reponses generiques de l'API --

export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    parPage: number
    dernierePage: number
  }
}

// -- Profil --

export interface Profile {
  id: string
  userId: string
  prenom: string
  nom: string
  email: string
  telephone: string | null
  avatarUrl: string | null
  role: 'parent' | 'educator' | 'admin'
  createdAt: string
  updatedAt: string
}

// -- Educateur --

export interface Educator {
  id: string
  profileId: string
  prenom: string
  nom: string
  avatarUrl: string | null
  bio: string | null
  ville: string
  codePostal: string
  tarifHoraire: number
  langues: string[]
  typeGarde: string[]
  ageMinimum: number
  ageMaximum: number
  anneesExperience: number
  certifications: string[]
  disponibilites: Disponibilite[]
  note: number | null
  nombreAvis: number
  verifie: boolean
  actif: boolean
  createdAt: string
  updatedAt: string
}

export interface Disponibilite {
  jour: string
  heureDebut: string
  heureFin: string
}

// -- Reservation --

export interface Booking {
  id: string
  parentId: string
  educateurId: string
  dateDebut: string
  dateFin: string
  statut: BookingStatus
  tarifTotal: number
  nombreEnfants: number
  notes: string | null
  adresse: string | null
  createdAt: string
  updatedAt: string
  educateur?: Educator
  parent?: Profile
}

export type BookingStatus =
  | 'en_attente'
  | 'confirmee'
  | 'annulee'
  | 'completee'
  | 'refusee'

// -- Avis --

export interface Review {
  id: string
  bookingId: string
  parentId: string
  educateurId: string
  note: number
  commentaire: string | null
  createdAt: string
  parent?: Profile
}

// -- Message --

export interface Message {
  id: string
  conversationId: string
  senderId: string
  contenu: string
  lu: boolean
  createdAt: string
  sender?: Profile
}

export interface Conversation {
  id: string
  participantIds: string[]
  dernierMessage: string | null
  dernierMessageAt: string | null
  createdAt: string
  participants?: Profile[]
}
