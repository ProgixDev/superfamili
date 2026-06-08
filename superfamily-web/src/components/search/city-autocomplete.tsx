'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MapPin, X, Loader2 } from 'lucide-react'
import { useCityAutocomplete } from '@/hooks/use-educators'

interface CityAutocompleteProps {
  onSelect: (city: string) => void
  selectedCity: string
}

export function CityAutocomplete({ onSelect, selectedCity }: CityAutocompleteProps) {
  const [inputValue, setInputValue] = useState(selectedCity)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { data: suggestionsRaw, isLoading } = useCityAutocomplete(inputValue)
  // API may wrap data in { data: [...] } or return directly
  const suggestions: { city: string; province: string }[] =
    (suggestionsRaw as any)?.data ?? suggestionsRaw ?? []

  // Sync external selectedCity changes
  useEffect(() => {
    if (selectedCity && selectedCity !== inputValue) {
      setInputValue(selectedCity)
    }
  }, [selectedCity])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    setIsOpen(value.length >= 2)
    setHighlightedIndex(-1)
  }, [])

  const handleSelect = useCallback((city: string, province: string) => {
    const display = `${city}, ${province}`
    setInputValue(display)
    setIsOpen(false)
    onSelect(city)
  }, [onSelect])

  const handleClear = useCallback(() => {
    setInputValue('')
    setIsOpen(false)
    onSelect('')
    inputRef.current?.focus()
  }, [onSelect])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || suggestions.length === 0) {
        if (e.key === 'Enter') {
          e.preventDefault()
          // If they typed something but didn't select, try to use it as-is
          if (inputValue.length >= 2) {
            onSelect(inputValue)
            setIsOpen(false)
          }
        }
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setHighlightedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : suggestions.length - 1
          )
          break
        case 'Enter':
          e.preventDefault()
          if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
            const s = suggestions[highlightedIndex]
            handleSelect(s.city, s.province)
          } else if (suggestions.length > 0) {
            const s = suggestions[0]
            handleSelect(s.city, s.province)
          }
          break
        case 'Escape':
          setIsOpen(false)
          break
      }
    },
    [isOpen, suggestions, highlightedIndex, handleSelect, inputValue, onSelect]
  )

  const handleFocus = useCallback(() => {
    if (inputValue.length >= 2) {
      setIsOpen(true)
    }
  }, [inputValue])

  return (
    <div className="relative">
      <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#607060]" />
      <input
        ref={inputRef}
        type="text"
        placeholder="Tapez une ville... ex: Montreal"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        className="h-12 w-full border-0 bg-transparent pl-10 pr-10 text-sm outline-none placeholder:text-[#8C8279]"
        autoComplete="off"
      />

      {/* Clear button */}
      {inputValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#8C8279] transition-colors hover:bg-[#F4FAF6] hover:text-[#1C2B20]"
        >
          <X className="size-4" />
        </button>
      )}

      {/* Loading indicator */}
      {isLoading && inputValue.length >= 2 && (
        <div className="absolute right-10 top-1/2 -translate-y-1/2">
          <Loader2 className="size-4 animate-spin text-[#2E7D52]" />
        </div>
      )}

      {/* Dropdown */}
      {isOpen && inputValue.length >= 2 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[280px] overflow-y-auto rounded-xl border border-[#D8EAE0] bg-white shadow-[0_8px_40px_rgba(28,43,32,0.12)]"
        >
          {isLoading ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-[#8C8279]">
              <Loader2 className="size-4 animate-spin" />
              Recherche...
            </div>
          ) : suggestions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[#8C8279]">
              Aucune ville trouvee pour &quot;{inputValue}&quot;
            </div>
          ) : (
            suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.city}-${suggestion.province}`}
                type="button"
                onClick={() => handleSelect(suggestion.city, suggestion.province)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${
                  index === highlightedIndex
                    ? 'bg-[#E8F5EE] text-[#1C2B20]'
                    : 'text-[#3A3A3A] hover:bg-[#F4FAF6]'
                }`}
              >
                <MapPin className="size-4 shrink-0 text-[#2E7D52]" />
                <div>
                  <span className="font-medium">{suggestion.city}</span>
                  <span className="ml-1.5 text-xs text-[#8C8279]">
                    {suggestion.province}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
