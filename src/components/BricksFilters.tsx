import { useEffect, useRef, useState } from 'preact/hooks'
import { useStore } from '@nanostores/preact';
import { $filters, updateFilters } from '@stores/storage-bricks';
import type { ArchiveColor, Category } from '@/types/archiveData'
import ColorMultiSelect from '@components/ColorMultiSelect'
import CategoryMultiSelect from '@components/CategoryMultiSelect'
import "@styles/select.css"

export default function BricksFilters({ initialFilters, sets, colors, categories }: Readonly<{ initialFilters: { piece: string, set: string[], status: string, color: string[], category: string[], spareOnly: boolean }, sets: { value: string, label: string }[], colors: ArchiveColor[], categories: Category[] }>) {
  const filters = useStore($filters);
  const [localPiece, setLocalPiece] = useState(filters.piece);
  const [localSets, setLocalSets] = useState<string[]>(filters.set);
  const [localColors, setLocalColors] = useState<string[]>(filters.color);
  const [localCategories, setLocalCategories] = useState<string[]>(filters.category);
  const [localSpareOnly, setLocalSpareOnly] = useState(filters.spareOnly);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const pieceRef = useRef(localPiece);
  const setsRef = useRef(localSets);
  const colorsRef = useRef(localColors);
  const categoriesRef = useRef(localCategories);
  const spareOnlyRef = useRef(localSpareOnly);

  pieceRef.current = localPiece;
  setsRef.current = localSets;
  colorsRef.current = localColors;
  categoriesRef.current = localCategories;
  spareOnlyRef.current = localSpareOnly;

  useEffect(() => {
    $filters.set(initialFilters);
    setLocalPiece(initialFilters.piece);
    setLocalSets(initialFilters.set);
    setLocalColors(initialFilters.color);
    setLocalCategories(initialFilters.category);
    setLocalSpareOnly(initialFilters.spareOnly);
  }, []);

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  const syncUrl = (piece: string, set: string[], status: string, color: string[], category: string[], spareOnly: boolean) => {
    const params = new URLSearchParams();
    if (piece) params.append("piece", piece);
    set.forEach((s) => params.append("set", s));
    if (status && status !== "all") params.append("status", status);
    color.forEach((c) => params.append("color", c));
    category.forEach((c) => params.append("category", c));
    if (spareOnly) params.append("spareOnly", "true");
    const qs = params.toString() ? `?${params.toString()}` : '';
    globalThis.history.pushState({}, "", `${globalThis.location.pathname}${qs}`);
  };

  const apply = (piece: string, set: string[], status: string, color: string[], category: string[], spareOnly: boolean) => {
    updateFilters({ piece, set, status, color, category, spareOnly });
    syncUrl(piece, set, status, color, category, spareOnly);
  };

  const scheduleApply = () => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      apply(pieceRef.current, setsRef.current, filters.status, colorsRef.current, categoriesRef.current, spareOnlyRef.current);
    }, 400);
  };

  const handlePieceChange = (e: Event) => {
    const value = (e.target as HTMLInputElement).value.trim();
    setLocalPiece(value);
    scheduleApply();
  };

  const handleSetChange = (e: Event) => {
    const selected = Array.from((e.target as HTMLSelectElement).selectedOptions).map((o) => o.value);
    setLocalSets(selected);
    scheduleApply();
  };

  const handleStatusChange = (e: Event) => {
    apply(localPiece, localSets, (e.target as HTMLSelectElement).value, localColors, localCategories, localSpareOnly);
  };

  const handleColorChange = (selected: string[]) => {
    setLocalColors(selected);
    apply(localPiece, localSets, filters.status, selected, localCategories, localSpareOnly);
  };

  const handleCategoryChange = (selected: string[]) => {
    setLocalCategories(selected);
    apply(localPiece, localSets, filters.status, localColors, selected, localSpareOnly);
  };

  const handleSpareChange = (e: Event) => {
    const checked = (e.target as HTMLInputElement).checked;
    setLocalSpareOnly(checked);
    apply(localPiece, localSets, filters.status, localColors, localCategories, checked);
  };

  return (
    <div class="bg-surface-container-lowest p-6 rounded-xl mb-10 grid grid-cols-1 md:grid-cols-6 gap-4 items-end shadow-[0_0_13px_-6px] shadow-contrast">
      <div>
        <label class="block text-[10px] uppercase font-bold text-secondary px-2">
          Piece Number or Name{" "}
          <input class="w-full bg-box text-contrast placeholder:text-contrast placeholder:opacity-60 rounded-lg px-4 py-3 text-sm mt-2 border-none" placeholder="e.g. 3001" type="text" name="piece" value={localPiece} onInput={handlePieceChange} />
        </label>
      </div>
      <div>
        <label class="block text-[10px] uppercase font-bold text-secondary px-2">
          Set Source{" "}
          <select class="w-full h-[46px] bg-box text-contrast rounded-lg px-4 ps-3 pe-8 text-sm mt-2 border-none" name="set" multiple size={1} onChange={handleSetChange}>
            {sets.map((set) => (
              <option key={set.value} selected={localSets.includes(set.value)} value={set.value}>{set.label}</option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <label class="block text-[10px] uppercase font-bold text-secondary px-2">
          Status{" "}
          <select class="w-full bg-box text-contrast rounded-lg px-4 py-3 text-sm mt-2 border-none" name="status" onChange={handleStatusChange}>
            <option value="all" selected={filters.status === "all"}>All</option>
            <option value="missing" selected={filters.status === "missing"}>Missing</option>
            <option value="in-stock" selected={filters.status === "in-stock"}>In Stock</option>
          </select>
        </label>
      </div>
      <div>
        <label class="block text-[10px] uppercase font-bold text-secondary px-2">
          Color{" "}
          <ColorMultiSelect colors={colors} selected={localColors} onChange={handleColorChange} />
        </label>
      </div>
      <div>
        <label class="block text-[10px] uppercase font-bold text-secondary px-2">
          Category{" "}
          <CategoryMultiSelect categories={categories} selected={localCategories} onChange={handleCategoryChange} />
        </label>
      </div>
      <div class="flex items-end">
        <label class="block text-[10px] uppercase font-bold text-secondary px-2 flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={localSpareOnly} onChange={handleSpareChange} class="w-4 h-4 rounded border-none" />
          Spare Only
        </label>
      </div>
    </div>
  )
}
