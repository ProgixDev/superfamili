import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formate un montant en dollars canadiens selon la convention franco-canadienne.
 * Exemple : formatCurrency(25) => "25,00 $"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-CA", {
    style: "currency",
    currency: "CAD",
  }).format(amount)
}

/**
 * Formate une date selon la locale fr-CA avec date-fns.
 * Par defaut, le format est "d MMMM yyyy" (ex: "25 mars 2026").
 */
export function formatDate(
  date: Date | string | number,
  formatStr: string = "d MMMM yyyy"
): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date
  return format(d, formatStr, { locale: fr })
}
