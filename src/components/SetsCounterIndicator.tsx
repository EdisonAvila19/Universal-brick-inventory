import { useStore } from '@nanostores/preact';
import { $filteredSets } from '@stores/storage-sets';

export default function SetCounterIndicator() {
  const filteredSets = useStore($filteredSets);

  return (
    <div>
      <p class="text-[0.65rem] font-bold text-secondary uppercase tracking-widest mb-1">Total Sets</p>
      <p class="text-4xl font-black tracking-tighter">{filteredSets.length}</p>
    </div>
  )
}