import { useStore } from '@nanostores/preact';
import { $filters, setFilters } from '@stores/storage-sets';
import { useEffect, useRef, useState } from 'preact/hooks';

export default function BrandSetsFilters() {
  const { brand: brandFilter, search: searchFilter } = useStore($filters);
  const [localSearch, setLocalSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const searchRef = useRef(localSearch);
  searchRef.current = localSearch;

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  useEffect(() => {
    setLocalSearch(searchFilter);
  }, [searchFilter]);

  const syncUrl = (brand: string, search: string) => {
    const params = new URLSearchParams();
    if (brand && brand !== "all") params.append("brand", brand);
    if (search) params.append("search", search);
    const qs = params.toString() ? `?${params.toString()}` : '';
    globalThis.history.pushState({}, "", `${globalThis.location.pathname}${qs}`);
  };

  const handleClick = (event: Event) => {
    event.preventDefault();
    if (!(event.target instanceof HTMLButtonElement)) return;

    const brand = event.target.dataset.setFilter;
    if (!brand) return;

    setFilters({ brand });
    syncUrl(brand, localSearch);
  };

  const handleSearchInput = (e: Event) => {
    const value = (e.target as HTMLInputElement).value;
    setLocalSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilters({ search: value });
      syncUrl(brandFilter, value);
    }, 400);
  };

  return (
    <section class="flex flex-wrap items-center gap-4 mb-8">
      <div class="flex-1 min-w-[200px]">
        <input
          type="text"
          placeholder="Search by set name or number..."
          value={localSearch}
          onInput={handleSearchInput}
          class="w-full bg-surface-container-highest border-none rounded-lg px-4 py-3 text-sm"
        />
      </div>
      <button data-set-filter="all" className={`px-6 py-2 rounded-full text-xs font-bold tracking-wide shadow-[0_0_13px_-6px] shadow-contrast ${brandFilter === "all" ? "bg-filter text-on-filter " : "bg-white text-filter"}`} onClick={handleClick}>All Brands</button>
      <button data-set-filter="lego" className={`px-6 py-2 rounded-full text-xs font-bold tracking-wide shadow-[0_0_13px_-6px] shadow-contrast ${brandFilter === "lego" ? "bg-filter text-on-filter" : "bg-white text-filter"}`} onClick={handleClick}>Lego Only</button>
      <button data-set-filter="third-party" className={`px-6 py-2 rounded-full text-xs font-bold tracking-wide shadow-[0_0_13px_-6px] shadow-contrast ${brandFilter === "third-party" ? "bg-filter text-on-filter" : "bg-white text-filter"}`} onClick={handleClick}>Third Party</button>
    </section>
  )
}