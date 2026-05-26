import { useStore } from '@nanostores/preact';
import { useEffect, useState } from "preact/hooks";

import type { SetRecord, ArchiveColor } from "@/types/archiveData";
import { useSetStore } from '@/hooks/useSetStore'

import { $sets } from '@stores/storage-sets';
import { $spareBricks, refreshSpareBricks } from '@stores/storage-spare-bricks';

import SetInfoForm from "@components/SetInfoForm";
import BricksxSetList from '@components/BricksxSetList'
import ColorMultiSelect from '@components/ColorMultiSelect'

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
  const spareBricksMap = useStore($spareBricks);

  const { totalRequired, totalOwned, bricks, loading, refreshBricks } = useSetStore(activeSetNumber, sets, setSelectedSet);

  useEffect(() => {
    refreshSpareBricks();
  }, [activeSetNumber]);

  const getSpareQty = (brickId: string) => {
    const found = spareBricksMap.find((s) => s.brickId === brickId);
    return found ? found.spareQuantity : 0;
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filterName, setFilterName] = useState("");
  const [filterColor, setFilterColor] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<"all" | "missings" | "completed">("all");

  const availableColors = colors.filter((c) => bricks.some((b) => b.colorId === c.id));

  const filteredBricks = bricks.filter((b) => {
    if (filterName) {
      const q = filterName.toLowerCase();
      if (
        !b.name.toLowerCase().includes(q) &&
        !b.reference.toLowerCase().includes(q) &&
        !b.brickId.toLowerCase().includes(q) &&
        !b.elementId.toLowerCase().includes(q)
      ) return false;
    }
    if (filterColor.length > 0 && !filterColor.includes(String(b.colorId))) return false;
    if (filterStatus === "missings" && b.stock >= b.required) return false;
    if (filterStatus === "completed" && b.stock < b.required) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredBricks.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const visibleBricks = filteredBricks.slice(startIndex, startIndex + pageSize);

  const handlePageSizeChange = (e: Event) => {
    const size = Number((e.target as HTMLSelectElement).value);
    setPageSize(size);
    setCurrentPage(1);
  };

  const paginationBar = (total: number, current: number, size: number, totalItems: number, goToPage: (p: number) => void, onSizeChange: (e: Event) => void) => (
    <>
      <div class="flex items-center gap-2 text-sm text-secondary ">
        <span class="font-bold text-on-surface">{totalItems}</span> pieces total — <span>Show</span>
        <select value={size} onChange={onSizeChange} class="bg-surface-container-high border-none rounded-lg px-3 py-1 text-sm font-bold text-on-surface">
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
                  ? 'bg-primary text-surface'
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
                    ? 'bg-primary text-surface'
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
                  ? 'bg-primary text-surface'
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

  return (
    <>
      {/* Set Info */}
      <section class="bg-surface-container-lowest rounded-xl p-6 mb-6 shadow-[0_0_13px_-6px] shadow-contrast">

        {/* Set Details */}
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
      ) : (bricks.length === 0 || selectedSet === null) ? (
        <section class="bg-surface-container-lowest rounded-xl p-8 text-center text-secondary mb-8">
          <h3 class="text-xl font-black mb-2">No pieces in this set yet</h3>
          <p class="text-sm">Use the form below to add your first piece.</p>
        </section>
      ) : (
        <>
          {/* Filters */}
          <section class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface-container-lowest rounded-xl p-4 mb-4">

            <div class="flex items-center gap-4 text-sm flex-wrap">
              <label class="flex items-center gap-2 text-secondary font-bold">{" "}
                <input
                  type="text"
                  value={filterName}
                  onInput={(e) => { setFilterName((e.target as HTMLInputElement).value); setCurrentPage(1); }}
                  placeholder="Search by reference, name or ID..."
                  class="bg-surface-container-high border-none rounded-lg px-3 py-2 text-sm font-bold text-on-surface placeholder:text-secondary/50 w-64"
                />
              </label>
              <label class="flex items-center gap-2 text-secondary font-bold">
                Color{" "}
                <ColorMultiSelect
                  colors={availableColors}
                  selected={filterColor}
                  onChange={(selected) => { setFilterColor(selected); setCurrentPage(1); }}
                />
              </label>
            </div>

            <div class="flex rounded-xl overflow-hidden border border-surface-dim text-sm font-bold">
              {(["all", "missings", "completed"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => { setFilterStatus(s); setCurrentPage(1); }}
                  class={`px-3 py-1.5 transition-colors capitalize ${
                    filterStatus === s
                      ? "bg-primary text-surface"
                      : "bg-surface-container-high text-on-surface hover:bg-surface-dim"
                  }`}
                >{s}</button>
              ))}
            </div>
          </section>

          {/* Pagination Top */}
          <section class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-container-lowest rounded-xl p-4 mb-4">
            {paginationBar(totalPages, safePage, pageSize, filteredBricks.length, setCurrentPage, handlePageSizeChange)}
          </section>

          {/* Brick Inventory */}
          <section class="space-y-4 mb-4">
            {visibleBricks.map((brick) => ( <BricksxSetList selectedSet={selectedSet} brick={brick} colors={colors} spareQuantity={getSpareQty(brick.brickId)} key={brick.brickId} onBrickUpdated={refreshBricks} />))}
          </section>

          {/* Pagination */}
          <section class="flex flex-col sm:flex-row items-center justify-between gap-4 bg-surface-container-lowest rounded-xl p-4 mb-10">
            {paginationBar(totalPages, safePage, pageSize, filteredBricks.length, setCurrentPage, handlePageSizeChange)}
          </section>
        </>
      )}
    </>
  )
}