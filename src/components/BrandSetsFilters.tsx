import { useStore } from '@nanostores/preact';
import { $filters, setFilters } from '@stores/storage-sets';

export default function BrandSetsFilters() {
  const { brand: brandFilter } = useStore($filters);

  const handleClick = (event: Event) => {
    event.preventDefault();
    if (!(event.target instanceof HTMLButtonElement)) return;

    const brand = event.target.dataset.setFilter;
    if (!brand) return;

    setFilters({ brand });

    const params = new URLSearchParams();
    if (brand && brand !== "all") params.append("brand", brand);

    const stringParams = params.toString() ? `?${params.toString()}` : '';
    const newUrl = `${globalThis.location.pathname}${stringParams}`;
    globalThis.history.pushState({}, "", newUrl);
  }

  return (
    <section class="flex flex-wrap items-center gap-4 mb-8">
      <button data-set-filter="all" className={`px-6 py-2 rounded-full text-xs font-bold tracking-wide ${brandFilter === "all" ? "bg-on-surface text-white" : "bg-white text-secondary"}`} onClick={handleClick}>All Brands</button>
      <button data-set-filter="lego" className={`px-6 py-2 rounded-full text-xs font-bold tracking-wide ${brandFilter === "lego" ? "bg-on-surface text-white" : "bg-white text-secondary"}`} onClick={handleClick}>Lego Only</button>
      <button data-set-filter="third-party" className={`px-6 py-2 rounded-full text-xs font-bold tracking-wide ${brandFilter === "third-party" ? "bg-on-surface text-white" : "bg-white text-secondary"}`} onClick={handleClick}>Third Party</button>
    </section>
  )
}