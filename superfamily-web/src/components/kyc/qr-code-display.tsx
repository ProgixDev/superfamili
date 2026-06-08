"use client"

import * as React from "react"
import { QRCodeSVG } from "qrcode.react"

export interface QrCodeDisplayProps {
  /** The URL to encode (Didit verification Unilink). */
  url: string
  /** Overall pixel size of the rendered QR block. Default 224. */
  size?: number
  /** Optional className applied to the outer wrapper. */
  className?: string
  /**
   * Whether to embed the SuperFamily logo in the center of the QR.
   * Disabled by default — logo overlays reduce scan reliability on
   * dense QR payloads, and Didit URLs are long. Enable only if you've
   * confirmed your logo doesn't degrade scanning.
   */
  withLogo?: boolean
}

/**
 * Renders a high-contrast QR code for a Didit verification URL.
 *
 * We use `QRCodeSVG` (not `QRCodeCanvas`) so the output is vector and
 * looks crisp at any size on retina / high-DPI displays. Error
 * correction level is "H" (high) — the most tolerant of partial
 * occlusion, in case users take photos at an angle or with finger
 * smudges on the screen.
 */
export function QrCodeDisplay({
  url,
  size = 224,
  className,
  withLogo = false,
}: QrCodeDisplayProps) {
  return (
    <div
      className={`inline-flex items-center justify-center rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#E8E4DF] ${className ?? ""}`}
      role="img"
      aria-label="QR code"
    >
      <QRCodeSVG
        value={url}
        size={size}
        level="H"
        bgColor="#FFFFFF"
        fgColor="#1A1A1A"
        imageSettings={
          withLogo
            ? {
                src: "/images/logo.png",
                height: Math.round(size * 0.18),
                width: Math.round(size * 0.18),
                excavate: true,
              }
            : undefined
        }
      />
    </div>
  )
}
