import { useStore } from '@nanostores/preact';
import type { SetRecord } from "@/types/archiveData";
import SetCard from './Set-card'
import { $filteredSets, setSets, setFilters } from '@/stores/storage-sets';
import { useEffect } from 'preact/hooks'

export function SetsResults({initialSets, initialFilters}: {initialSets: SetRecord[], initialFilters: { brand: string; search?: string } } ) {
  const sets = useStore($filteredSets);

  useEffect(() => {
    setSets(initialSets);
    setFilters(initialFilters);
  }, []);

  return (
    sets.length === 0
    ? (
      <section class="bg-surface-container-lowest rounded-xl p-12 text-center text-secondary">
        <h2 class="text-2xl font-black mb-2">No sets in catalog</h2>
        <p class="text-sm">Start by adding one in <a href="/add-set" class="text-primary font-bold">Catalog New Set</a>.</p>
      </section>
    ) : (
      <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {sets.map((set) => <SetCard {...set} />)}
      </section>
    )
  )
}