import { z } from "zod"

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "L'adresse courriel est requise")
    .email("Veuillez entrer une adresse courriel valide"),
  password: z
    .string()
    .min(1, "Le mot de passe est requis")
    .min(8, "Le mot de passe doit contenir au moins 8 caracteres"),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export const signupSchema = z.object({
  first_name: z
    .string()
    .min(1, "Le prenom est requis")
    .max(50, "Le prenom ne peut pas depasser 50 caracteres")
    .trim(),
  last_name: z
    .string()
    .min(1, "Le nom est requis")
    .max(50, "Le nom ne peut pas depasser 50 caracteres")
    .trim(),
  email: z
    .string()
    .min(1, "L'adresse courriel est requise")
    .email("Veuillez entrer une adresse courriel valide")
    .trim()
    .toLowerCase(),
  password: z
    .string()
    .min(1, "Le mot de passe est requis")
    .min(8, "Le mot de passe doit contenir au moins 8 caracteres"),
  role: z.enum(["parent", "educator"], {
    error: "Veuillez selectionner un role",
  }),
  postal_code: z
    .string()
    .max(10, "Le code postal ne peut pas dépasser 10 caractères")
    .trim()
    .optional()
    .or(z.literal("")),
  city: z
    .string()
    .max(100)
    .trim()
    .optional()
    .or(z.literal("")),
})

export type SignupFormValues = z.infer<typeof signupSchema>

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "L'adresse courriel est requise")
    .email("Veuillez entrer une adresse courriel valide")
    .trim()
    .toLowerCase(),
})
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export const resetPasswordSchema = z
  .object({
    code: z
      .string()
      .regex(/^\d{6}$/, "Le code doit contenir 6 chiffres"),
    new_password: z
      .string()
      .min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm_password"],
  })
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>

export const changeEmailSchema = z.object({
  new_email: z
    .string()
    .min(1, "L'adresse courriel est requise")
    .email("Veuillez entrer une adresse courriel valide")
    .trim()
    .toLowerCase(),
})
export type ChangeEmailFormValues = z.infer<typeof changeEmailSchema>
