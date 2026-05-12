import { useStore } from '@nanostores/preact';
import type { SetRecord } from "@/types/archiveData";
import SetInfoForm from "@components/SetInfoForm";
import { $sets } from '@/stores/storage-sets';
import { useEffect, useState } from "preact/hooks";


export default function SetInfo({ activeSetNumber, initialSelectedSet }: Readonly<{ activeSetNumber: string | null, initialSelectedSet: SetRecord | null }>) {
  
  const sets = useStore($sets);
  const [selectedSet, setSelectedSet] = useState(initialSelectedSet)

  useEffect(() => {
    const selectedSet = sets.find((set) => set.setNumber === activeSetNumber) ?? null;
    setSelectedSet(selectedSet);
  }, [sets])

  // Handle cases where no set is selected or the selected set is not found
  if (!activeSetNumber) {
    return (
      <section class="bg-surface-container-lowest rounded-xl p-12 text-center text-secondary">
        <h2 class="text-2xl font-black mb-2">Select a set to continue</h2>
        <p class="text-sm">Pick a set above to edit its metadata.</p>
      </section>
    )
  }

  if (!selectedSet) {
    return (
      <section class="bg-error-container text-on-error-container rounded-xl p-6">
        <h2 class="text-xl font-black mb-2">Set not found</h2>
        <p class="text-sm">The selected set does not exist in inventory. Go back to <a href="/sets" class="font-bold underline">Set Catalog</a>.</p>
      </section>
    )
  }

  // If a set is selected and found, display the form
  return (
    <section class="bg-surface-container-lowest rounded-xl p-6">

      {/* Set Info */}
      <div class="flex flex-col md:flex-row gap-6 mb-6">
        <img src={selectedSet.image} alt={selectedSet.name} class="w-32 h-32 object-cover rounded-lg bg-surface-container-low" />
        <div class="space-y-2">
          <p class="text-[10px] font-bold uppercase tracking-widest text-secondary">Set No. {selectedSet.setNumber}</p>
          <h2 class="text-2xl font-black leading-tight">{selectedSet.name}</h2>
        </div>
      </div>

      {/* Set Info Form */}
      <SetInfoForm selectedSet={selectedSet} />

      {/* Set Bricks Form */}
      
    </section>
  )
}