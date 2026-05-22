import { useEffect } from 'preact/hooks'
import { useStore } from '@nanostores/preact';
import { $filters, updateFilters } from '@stores/storage-bricks';

export default function BricksFilters({ initialFilters, sets }: Readonly<{ initialFilters: { piece: string, set: string[], status: string }, sets: { value: string, label: string }[] }>) {
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

    updateFilters({ piece, set, status });

    const params = new URLSearchParams();
    if (piece) params.append("piece", piece);
    set.forEach((s) => params.append("set", s));
    if (status && status !== "all") params.append("status", status);

    const stringParams = params.toString() ? `?${params.toString()}` : '';
    const newUrl = `${globalThis.location.pathname}${stringParams}`;
    globalThis.history.pushState({}, "", newUrl);
  }

  return (
    <form class="bg-surface-container-low p-6 rounded-xl mb-10 grid grid-cols-1 md:grid-cols-4 gap-4 items-end" onSubmit={handleSubmit}>
      <div>
        <label class="block text-[10px] uppercase font-bold text-secondary px-2">
          Piece Number or Name{" "}
          <input class="w-full bg-surface-container-highest border-none rounded-lg px-4 py-3 text-sm mt-2" placeholder="e.g. 3001" type="text" name="piece" value={filters.piece} />
        </label>
      </div>
      <div>
        <label class="block text-[10px] uppercase font-bold text-secondary px-2">
          Set Source{" "}
          <select class="w-full h-[46px] bg-surface-container-highest border-none rounded-lg px-4 py-3 text-sm mt-2" name="set" multiple size={1}>
            {sets.map((set) => (
              <option key={set.value} selected={filters.set.includes(set.value)} value={set.value}>{set.label}</option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <label class="block text-[10px] uppercase font-bold text-secondary px-2">
          Status{" "}
          <select class="w-full bg-surface-container-highest border-none rounded-lg px-4 py-3 text-sm mt-2" name="status">
            <option value="all" selected={filters.status === "all"}>All</option>
            <option value="missing" selected={filters.status === "missing"}>Missing</option>
            <option value="in-stock" selected={filters.status === "in-stock"}>In Stock</option>
          </select>
        </label>
      </div>
      <button type="submit" class="bg-primary-container text-primary-container-contrast py-3 px-8 rounded-lg font-bold text-sm">Apply Filters</button>
    </form>
  )
}