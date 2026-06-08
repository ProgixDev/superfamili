"use client"

import * as React from "react"
import { Camera, Loader2, Upload, User } from "lucide-react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { apiUpload } from "@/lib/api/upload"
import { Button } from "@/components/ui/button"

const MAX_AVATAR_BYTES = 5 * 1024 * 1024
const ACCEPTED_AVATAR_MIME = ["image/jpeg", "image/png", "image/webp"] as const

interface ProfilePhotoUploaderProps {
  avatarUrl?: string | null
  firstName?: string | null
  lastName?: string | null
  onUploaded?: () => void
  compact?: boolean
}

export function ProfilePhotoUploader({
  avatarUrl,
  firstName,
  lastName,
  onUploaded,
  compact = false,
}: ProfilePhotoUploaderProps) {
  const t = useTranslations("profile")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = React.useState(false)
  const [percent, setPercent] = React.useState(0)

  const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`
    .trim()
    .toUpperCase()

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    if (file.size > MAX_AVATAR_BYTES) {
      toast.error(t("photoTooLarge"))
      return
    }
    if (!(ACCEPTED_AVATAR_MIME as readonly string[]).includes(file.type)) {
      toast.error(t("photoBadType"))
      return
    }

    setUploading(true)
    setPercent(0)
    try {
      await apiUpload("/profiles/me/avatar", file, {
        onProgress: (progress) => setPercent(progress.percent),
      })
      toast.success(t("photoUploaded"))
      onUploaded?.()
    } catch (err) {
      const message = err instanceof Error ? err.message : t("photoUploadError")
      toast.error(message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={compact ? "flex items-center gap-3" : "space-y-3"}>
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-[#E8E4DF] bg-[#E8F5EE]">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={t("profilePhotoAlt")}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-[#2E7D52]">
            {initials || <User className="h-8 w-8" />}
          </div>
        )}
        <div className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-[#2E7D52] text-white">
          <Camera className="h-3.5 w-3.5" />
        </div>
      </div>

      <div className="min-w-0">
        {!compact && (
          <>
            <p className="text-sm font-semibold text-[#1A1A1A]">
              {t("profilePhoto")}
            </p>
            <p className="mt-1 text-xs text-[#8C8279]">
              {t("profilePhotoHint")}
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFile}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="mt-2 gap-2 border-[#E8E4DF]"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("photoUploading", { percent })}
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              {avatarUrl ? t("replaceProfilePhoto") : t("addProfilePhoto")}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

