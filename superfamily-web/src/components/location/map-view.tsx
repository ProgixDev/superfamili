"use client"

import { useEffect, useRef, useState } from "react"

interface MapViewProps {
  lat: number
  lng: number
  onMapClick: (lat: number, lng: number) => void
}

export function MapView({ lat, lng, onMapClick }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const onMapClickRef = useRef(onMapClick)
  onMapClickRef.current = onMapClick
  const [ready, setReady] = useState(false)

  // Load leaflet CSS via link tag
  useEffect(() => {
    if (document.querySelector('link[href*="leaflet.css"]')) {
      setReady(true)
      return
    }
    const link = document.createElement("link")
    link.rel = "stylesheet"
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
    link.onload = () => setReady(true)
    document.head.appendChild(link)
  }, [])

  useEffect(() => {
    if (!ready || !mapRef.current || mapInstanceRef.current) return

    let cancelled = false

    import("leaflet").then((L) => {
      if (cancelled || !mapRef.current) return

      const map = L.map(mapRef.current, {
        center: [lat, lng],
        zoom: 13,
        zoomControl: true,
        attributionControl: false,
      })

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
      }).addTo(map)

      const icon = L.divIcon({
        html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 24 30" fill="none">
          <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 18 12 18s12-9 12-18C24 5.4 18.6 0 12 0z" fill="#2E7D52"/>
          <circle cx="12" cy="11" r="4" fill="white"/>
        </svg>`,
        className: "",
        iconSize: [32, 40],
        iconAnchor: [16, 40],
      })

      const marker = L.marker([lat, lng], { icon }).addTo(map)

      map.on("click", (e: any) => {
        marker.setLatLng([e.latlng.lat, e.latlng.lng])
        onMapClickRef.current(e.latlng.lat, e.latlng.lng)
      })

      mapInstanceRef.current = map
      markerRef.current = marker

      setTimeout(() => map.invalidateSize(), 200)
    })

    return () => {
      cancelled = true
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markerRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  // Update marker and view when lat/lng change externally
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current) return
    markerRef.current.setLatLng([lat, lng])
    mapInstanceRef.current.setView([lat, lng], 13)
  }, [lat, lng])

  return (
    <div
      ref={mapRef}
      style={{ height: "300px", width: "100%" }}
      className="rounded-xl"
    />
  )
}
