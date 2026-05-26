import { useEffect } from 'preact/hooks';
import type { BrickRecord } from '@/types/archiveData'
import BrickInfo from '@components/BrickInfo';
import { useBricks } from '@hooks/useBricks';
import { refreshSpareBricks } from '@stores/storage-spare-bricks';

export default function BricksResults({initialBricks}: {initialBricks: BrickRecord[]}) {
  const filteredBricks = useBricks(initialBricks);

  useEffect(() => {
    refreshSpareBricks();
  }, []);

  return (
    filteredBricks.length === 0 ? (
      <section class="text-center py-24 text-secondary">
        <h2 class="text-2xl font-black mb-2">No bricks found</h2>
        <p class="text-sm">Adjust filters or add a set via <a href="/add-set" class="text-primary font-bold">Catalog New Set</a>.</p>
      </section>
    ) : (
      <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {filteredBricks.map((group) => <BrickInfo {...group} key={group.brickId} />)}
      </section>
    )
  )
}