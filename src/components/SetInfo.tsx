import { useStore } from '@nanostores/preact';
import { useState } from "preact/hooks";

import type { BrickRecord, SetRecord } from "@/types/archiveData";
import { useSetStore } from '@/hooks/useSetStore'

import { $sets } from '@stores/storage-sets';

import SetInfoForm from "@components/SetInfoForm";
import BricksxSetList from '@components/BricksxSetList'

export default function SetInfo({ activeSetNumber, initialSelectedSet, initialSetBricks }: Readonly<{ activeSetNumber: string | null, initialSelectedSet: SetRecord | null, initialSetBricks: BrickRecord[] }>) {
  
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

  const { fetchBricks, totalRequired, totalOwned, bricks } = useSetStore(activeSetNumber, initialSetBricks, sets, setSelectedSet);

  // If a set is selected but not found in the store, show an error message
  if (!selectedSet) return

  // If a set is selected and found, display the form
  return (
    <>
      <section class="bg-surface-container-lowest rounded-xl p-6 mb-6">

        {/* Set Info */}
        <div class="flex flex-col md:flex-row gap-6 mb-6">
          <img src={selectedSet.image} alt={selectedSet.name} class="w-32 h-32 object-cover rounded-lg bg-surface-container-low" />
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
      {bricks.length === 0 || selectedSet === null ? (
        <section class="bg-surface-container-lowest rounded-xl p-8 text-center text-secondary mb-8">
          <h3 class="text-xl font-black mb-2">No pieces in this set yet</h3>
          <p class="text-sm">Use the form below to add your first piece.</p>
        </section>
      ) : (
        <section class="space-y-4 mb-10">
          {bricks.map((brick) => ( <BricksxSetList selectedSet={selectedSet} brick={brick} updateBricks={fetchBricks} key={brick.elementId} />))}
        </section>
      )}
    </>
  )
}