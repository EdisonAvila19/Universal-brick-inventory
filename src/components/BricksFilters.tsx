import { useEffect } from 'preact/hooks'
import { useStore } from '@nanostores/preact';
import { $filters, updateFilters } from '@stores/storage-bricks';
import type { ArchiveColor } from '@/types/archiveData'
import "@styles/select.css"

export default function BricksFilters({ initialFilters, sets, colors }: Readonly<{ initialFilters: { piece: string, set: string[], status: string, color: string }, sets: { value: string, label: string }[], colors: ArchiveColor[] }>) {
  const filters = useStore($filters);

  useEffect(()=> {
    $filters.set(initialFilters);
  }, [])

  const handleSubmit = (event: Event) => {
    event.preventDefault();
    if (!(event.target instanceof HTMLFormElement)) return;
    const formData = new FormData(event.target);

    const rawPiece = formData.get("piece");
    const piece = typeof rawPiece === "string" ? rawPiece.trim() : "";
    const set = formData.getAll("set").filter((v): v is string => typeof v === "string");
    const rawStatus = formData.get("status");
    const status = typeof rawStatus === "string" ? rawStatus : "all";
    const rawColor = formData.get("color");
    const color = typeof rawColor === "string" ? rawColor : "";

    updateFilters({ piece, set, status, color });

    const params = new URLSearchParams();
    if (piece) params.append("piece", piece);
    set.forEach((s) => params.append("set", s));
    if (status && status !== "all") params.append("status", status);
    if (color) params.append("color", color);

    const stringParams = params.toString() ? `?${params.toString()}` : '';
    const newUrl = `${globalThis.location.pathname}${stringParams}`;
    globalThis.history.pushState({}, "", newUrl);
  }

  return (
    <form class="bg-surface-container-lowest p-6 rounded-xl mb-10 grid grid-cols-1 md:grid-cols-5 gap-4 items-end shadow-[0_0_13px_-6px] shadow-contrast" onSubmit={handleSubmit}>
      <div>
        <label class="block text-[10px] uppercase font-bold text-secondary px-2">
          Piece Number or Name{" "}
          <input class="w-full bg-box text-contrast placeholder:text-contrast placeholder:opacity-60 rounded-lg px-4 py-3 text-sm mt-2 border-none" placeholder="e.g. 3001" type="text" name="piece" value={filters.piece} />
        </label>
      </div>
      <div>
        <label class="block text-[10px] uppercase font-bold text-secondary px-2">
          Set Source{" "}
          <select class="w-full h-[46px] bg-box text-contrast rounded-lg px-4 py-3 text-sm mt-2 border-none" name="set" multiple size={1}>
            {sets.map((set) => (
              <option key={set.value} selected={filters.set.includes(set.value)} value={set.value}>{set.label}</option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <label class="block text-[10px] uppercase font-bold text-secondary px-2">
          Status{" "}
          <select class="w-full bg-box text-contrast rounded-lg px-4 py-3 text-sm mt-2 border-none" name="status">
            <option value="all" selected={filters.status === "all"}>All</option>
            <option value="missing" selected={filters.status === "missing"}>Missing</option>
            <option value="in-stock" selected={filters.status === "in-stock"}>In Stock</option>
          </select>
        </label>
      </div>
      <div>
        <label class="block text-[10px] uppercase font-bold text-secondary px-2">
          Color{" "}
          <select class="w-full bg-box text-contrast rounded-lg px-4 py-3 text-sm mt-2 border-none" name="color">
            <option value="" selected={filters.color === ""}>All</option>
            {colors.map((c) => (
              <option key={c.id} value={c.id} selected={filters.color === String(c.id)}><span class={`block w-4 h-4 rounded-full`} style={`background-color: ${c.rgb};`}></span>{c.name}</option>
            ))}
          </select>
        </label>
      </div>
      <button type="submit" class="bg-primary-container text-primary-container-contrast py-3 px-8 rounded-lg font-bold text-sm">Apply Filters</button>
    </form>
  )
}