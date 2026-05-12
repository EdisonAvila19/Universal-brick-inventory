import { SaveStockForm } from "@/components/SaveStockForm";
import type { GroupedBrick } from "@/types/archiveData";

import { useState } from 'preact/hooks';

function BrickStats({ group }: Readonly<{ group: GroupedBrick }>) {
  return (
    <div class="grid grid-cols-3 gap-2 border-t border-outline-variant/20 pt-4 mb-4 mt-auto">
      <div class="text-center">
        <p class="text-[10px] text-secondary font-bold uppercase mb-1">Required</p>
        <p data-required-value class="font-black">{group.totalRequired}</p>
      </div>
      <div class="text-center">
        <p class="text-[10px] text-secondary font-bold uppercase mb-1">Stock</p>
        <p data-stock-value class="font-black">{group.totalStock}</p>
      </div>
      <div class="text-center">
        <p class="text-[10px] text-error font-bold uppercase mb-1">Needed</p>
        <p data-needed-value class="font-black text-error">{group.needed}</p>
      </div>
    </div>
  )
}

export function BrickStock({ group }: Readonly<{ group: GroupedBrick }>) {
  const [isOpen, setIsOpen] = useState(false);

  const handleCloseList = () => {
    setIsOpen(false);
  }

  const handleSwitchList = () => {
    setIsOpen(!isOpen)
  }

  return (
    <section class="mb-0 mt-auto">
      <BrickStats group={group} />

      <div class="mb-0 flex justify-center flex-col items-center gap-1">
        <button class="list-none cursor-pointer bg-surface-container-highest rounded-lg px-3 py-2 mx-auto w-fit text-xs font-bold uppercase tracking-wider text-secondary" onClick={handleSwitchList} >Edit Stock</button>
        {isOpen && <SaveStockForm group={group} closeList={handleCloseList} />}
      </div>
      
    </section>
  )
}