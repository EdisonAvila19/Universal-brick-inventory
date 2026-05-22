import { useStore } from '@nanostores/preact';
import { useState } from "preact/hooks";

import type { SetRecord, ArchiveColor } from "@/types/archiveData";
import { useSetStore } from '@/hooks/useSetStore'

import { $sets } from '@stores/storage-sets';

import SetInfoForm from "@components/SetInfoForm";
import BricksxSetList from '@components/BricksxSetList'

const PAGE_SIZES = [10, 15, 20, 30, 40, 50];

export default function SetInfo({ activeSetNumber, initialSelectedSet, colors }: Readonly<{ activeSetNumber: string | null, initialSelectedSet: SetRecord | null, colors: ArchiveColor[] }>) {
  
  // Handle cases where no set is selected or the selected set is not found
  if (!activeSetNumber) {
    return (
      <section class="bg-surface-container-lowest rounded-xl p-12 text-center text-secondary">
        <h2 class="text-2xl font-black mb-2">Select a set to continue</h2>
        <p class="text-sm">Pick a set above to edit its metadata.</p>
      </section>
    )
  }

  const sets = useStore($sets);
  const [selectedSet, setSelectedSet] = useState(initialSelectedSet)

  const { totalRequired, totalOwned, bricks, loading } = useSetStore(activeSetNumber, sets, setSelectedSet);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const totalPages = Math.max(1, Math.ceil(bricks.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const visibleBricks = bricks.slice(startIndex, startIndex + pageSize);

  const handlePageSizeChange = (e: Event) => {
    const size = Number((e.target as HTMLSelectElement).value);
    setPageSize(size);
    setCurrentPage(1);
  };

  const paginationBar = (total: number, current: number, size: number, totalItems: number, goToPage: (p: number) => void, onSizeChange: (e: Event) => void) => (
    <>
      <div class="flex items-center gap-2 text-sm text-secondary ">
        <span class="font-bold text-on-surface">{totalItems}</span> pieces total —
        <span>Show</span>
        <select value={size} onChange={onSizeChange} class="bg-surface-container-high border-none rounded-lg px-2 py-1 text-sm font-bold text-on-surface">
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span>per page</span>
      </div>

      <div class="flex items-center gap-1">
        <button
          disabled={current <= 1}
          onClick={() => goToPage(current - 1)}
          class="px-3 py-1.5 rounded-lg text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed bg-surface-container-high text-on-surface hover:bg-primary hover:text-white transition-colors"
        >
          &laquo; Prev
        </button>

        {total <= 7 ? (
          Array.from({ length: total }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => goToPage(p)}
              class={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                p === current
                  ? 'bg-primary text-white'
                  : 'bg-surface-container-high text-on-surface hover:bg-surface-dim'
              }`}
            >
              {p}
            </button>
          ))
        ) : (
          <>
            {[1, 2, 3].map((p) => (
              <button
                key={p}
                onClick={() => goToPage(p)}
                class={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                  p === current
                    ? 'bg-primary text-white'
                    : 'bg-surface-container-high text-on-surface hover:bg-surface-dim'
                }`}
              >
                {p}
              </button>
            ))}
            <span class="px-2 text-secondary text-sm font-bold">&hellip;</span>
            <button
              onClick={() => goToPage(total)}
              class={`px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                total === current
                  ? 'bg-primary text-white'
                  : 'bg-surface-container-high text-on-surface hover:bg-surface-dim'
              }`}
            >
              {total}
            </button>
          </>
        )}

        <button
          disabled={current >= total}
          onClick={() => goToPage(current + 1)}
          class="px-3 py-1.5 rounded-lg text-sm font-bold disabled:opacity-30 disabled:cursor-not-allowed bg-surface-container-high text-on-surface hover:bg-primary hover:text-white transition-colors"
        >
          Next &raquo;
        </button>
      </div>
    </>
  );

  // If a set is selected but not found in the store, show an error message
  if (!selectedSet) return

  // If a set is selected and found, display the form
  return (
    <>
      <section class="bg-surface-container-lowest rounded-xl p-6 mb-6">

        {/* Set Info */}
        <div class="flex flex-col md:flex-row gap-6 mb-6">
          <img src={selectedSet.image} alt={selectedSet.name} class="max-w-[250px] max-h-[250px] object-cover rounded-lg bg-surface-container-low" />
          <div class="space-y-2">
            <p class="text-[10px] font-bold uppercase tracking-widest text-secondary">Set No. {selectedSet.setNumber}</p>
            <h2 class="text-2xl font-black leading-tight">{selectedSet.name}</h2>

            <p class="text-sm text-secondary">Unique pieces: <span class="font-bold text-on-surface">{bricks.length}</span> · Required units: <span class="font-bold text-on-surface">{totalRequired.toLocaleString()}</span> · Owned units: <span class="font-bold text-on-surface">{totalOwned.toLocaleString()}</span></p>
          </div>
        </div>

        {/* Set Info Form */}
        <SetInfoForm selectedSet={selectedSet} />
      </section>

      {/* Set Bricks Form */}
      {loading ? (
        <section class="bg-surface-container-lowest rounded-xl p-8 mb-8">
          <div class="animate-pulse space-y-4">
            <div class="h-6 bg-surface-container-high rounded w-1/3"></div>
            <div class="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} class="flex gap-4 items-center p-4 bg-surface-container-high rounded-xl">
                  <div class="w-20 h-20 bg-surface-dim rounded-lg"></div>
                  <div class="flex-1 space-y-2">
                    <div class="h-3 bg-surface-dim rounded w-1/4"></div>
                    <div class="h-4 bg-surface-dim rounded w-3/4"></div>
                    <div class="h-3 bg-surface-dim rounded w-1/3"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : bricks.length === 0 || selectedSet === null ? (
        <section class="bg-surface-container-lowest rounded-xl p-8 text-center text-secondary mb-8">
          <h3 class="text-xl font-black mb-2">No pieces in this set yet</h3>
          <p class="text-sm">Use the form below to add your first piece.</p>
        </section>
      ) : (
        <>
          <section class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-container-lowest rounded-xl p-4 mb-4 ">
            {paginationBar(totalPages, safePage, pageSize, bricks.length, setCurrentPage, handlePageSizeChange)}
          </section>

          <section class="space-y-4 mb-4">
            {visibleBricks.map((brick) => ( <BricksxSetList selectedSet={selectedSet} brick={brick} colors={colors} key={brick.elementId} />))}
          </section>

          <section class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-container-lowest rounded-xl p-4 mb-10">
            {paginationBar(totalPages, safePage, pageSize, bricks.length, setCurrentPage, handlePageSizeChange)}
          </section>
        </>
      )}
    </>
  )
}