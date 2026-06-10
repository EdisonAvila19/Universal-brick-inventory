import { useState, useRef, useEffect } from "preact/hooks"
import type { Category } from "@/types/archiveData"

interface CategoryMultiSelectProps {
  categories: Category[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  allLabel?: string
}

const NONE_VALUE = "_none";

export default function CategoryMultiSelect({ categories, selected, onChange, placeholder = "Search categories...", allLabel = "All Categories" }: Readonly<CategoryMultiSelectProps>) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const filtered = search.trim()
    ? categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : categories

  const toggleCategory = (id: number | string) => {
    const strId = String(id)
    const next = selected.includes(strId)
      ? selected.filter((s) => s !== strId)
      : [...selected, strId]
    onChange(next)
  }

  const clearAll = () => {
    onChange([])
    setSearch("")
  }

  const hasNone = selected.includes(NONE_VALUE);
  const categoryCount = selected.filter((s) => s !== NONE_VALUE).length;

  const displayText = selected.length === 0
    ? allLabel
    : `${selected.length} selected`

  return (
    <div ref={containerRef} class="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        class="w-full bg-box text-contrast rounded-lg px-4 py-3 text-sm border-none flex items-center justify-between gap-2"
      >
        <span class={selected.length === 0 ? "opacity-60" : ""}>{displayText}</span>
        <svg class={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div class="absolute z-50 mt-1 w-auto min-w-[200px] bg-surface-container-highest rounded-xl shadow-2xl border border-outline-variant/20 overflow-hidden">
          <div class="p-2 border-b border-outline-variant/10">
            <input
              type="text"
              value={search}
              onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
              placeholder={placeholder}
              class="w-full bg-surface-container-high text-on-surface rounded-lg px-3 py-2 text-sm border-none placeholder:text-secondary/60"
            />
          </div>

          <div class="max-h-60 overflow-y-auto">
            <button
              type="button"
              onClick={() => toggleCategory(NONE_VALUE)}
              class={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors hover:bg-surface-container-high ${
                hasNone ? "bg-primary/10 text-on-surface" : "text-secondary"
              }`}
            >
              <span
                class={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  hasNone ? "bg-primary border-primary" : "border-outline-variant bg-transparent"
                }`}
              >
                {hasNone && (
                  <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span class="italic text-secondary/70">No Category</span>
            </button>
            <div class="border-t border-outline-variant/10 mx-2"></div>
            {filtered.length === 0 ? (
              <p class="text-center text-secondary text-sm py-4">No categories match</p>
            ) : (
              filtered.map((c) => {
                const isSelected = selected.includes(String(c.id))
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCategory(c.id)}
                    class={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors hover:bg-surface-container-high ${
                      isSelected ? "bg-primary/10 text-on-surface" : "text-secondary"
                    }`}
                  >
                    <span
                      class={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? "bg-primary border-primary" : "border-outline-variant bg-transparent"
                      }`}
                    >
                      {isSelected && (
                        <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    <span class="truncate">{c.name}</span>
                  </button>
                )
              })
            )}
          </div>

          {selected.length > 0 && (
            <div class="border-t border-outline-variant/10 p-2">
              <button
                type="button"
                onClick={clearAll}
                class="w-full text-center text-xs font-bold text-error py-1.5 rounded-lg hover:bg-error/10 transition-colors uppercase tracking-wider"
              >
                Clear selection
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
