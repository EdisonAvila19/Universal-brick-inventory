import type { BrickRecord, SetRecord } from '@/types/archiveData'
import { useState } from 'preact/hooks'

function UpdateStockForm ({ selectedSet, brick }: Readonly<{ selectedSet: SetRecord, brick: BrickRecord }>) {

  const handleSubmit = (event: Event) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    // Handle form submission logic here
    console.log("Updating stock with data:", Object.fromEntries(formData.entries()));
    
  }

  return (
    <form class="grid grid-cols-1 md:grid-cols-1 gap-2 lg:items-end" onSubmit={handleSubmit}>
      <input type="hidden" name="action" value="update-brick" />
      <input type="hidden" name="setNumber" value={selectedSet.setNumber} />
      <input type="hidden" name="originalElementId" value={brick.elementId} />
      <input type="hidden" name="elementId" value={brick.elementId} />
      <input type="hidden" name="reference" value={brick.reference} />
      <input type="hidden" name="name" value={brick.name} />
      <input type="hidden" name="colorId" value={brick.colorId} />
      <input type="hidden" name="image" value={brick.image} />
      <label class="block text-[10px] uppercase font-bold text-secondary">
        Required{" "}
        <input required min="1" type="number" name="required" value={brick.required} class="w-full bg-surface-container-highest border-none rounded-lg px-3 py-2 text-sm mt-1" />
      </label>
      <label class="block text-[10px] uppercase font-bold text-secondary">
        Stock{" "}
        <input required min="0" type="number" name="stock" value={brick.stock} class="w-full bg-surface-container-highest border-none rounded-lg px-3 py-2 text-sm mt-1" />
      </label>
      <button type="submit" class="bg-primary text-white px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest">Save Qty</button>
    </form>
  )
}

function DeleteBrickForm ({ selectedSet, brick }: Readonly<{ selectedSet: SetRecord, brick: BrickRecord }>) {

  const handleSubmit = (event: Event) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    // Handle form submission logic here
    console.log("Updating stock with data:", Object.fromEntries(formData.entries()));
    
  }

  return (
    <form class="lg:ml-2" onSubmit={handleSubmit}>
      <input type="hidden" name="action" value="remove-brick" />
      <input type="hidden" name="setNumber" value={selectedSet.setNumber} />
      <input type="hidden" name="elementId" value={brick.elementId} />
      <button type="submit" class="text-error text-xs font-bold uppercase tracking-widest">Remove Piece</button>
    </form>
  )
}

function SetInfoForm ({ selectedSet, brick }: Readonly<{ selectedSet: SetRecord, brick: BrickRecord }>) {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = (event: Event) => {
    setIsOpen((event.target as HTMLDetailsElement).open);
  }

  const handleSubmit = (event: Event) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    // Handle form submission logic here
    console.log("Updating stock with data:", Object.fromEntries(formData.entries()));
    handleToggle({ target: { open: false }} as unknown as Event);
  }

  return (
    <details class="mt-4" open={isOpen} onToggle={handleToggle}>
      <summary class="cursor-pointer text-xs font-bold uppercase tracking-widest text-secondary" > Edit Piece Details </summary>
      <form class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3" onSubmit={handleSubmit}>
        <input type="hidden" name="action" value="update-brick" />
        <input type="hidden" name="setNumber" value={selectedSet.setNumber} />
        <input type="hidden" name="originalElementId" value={brick.elementId} />
        <input type="hidden" name="elementId" value={brick.elementId} />
        <div>
          <label class="block text-[10px] uppercase font-bold text-secondary mb-1">
            Reference{" "}
            <input required name="reference" value={brick.reference} class="w-full bg-surface-container-highest border-none rounded-lg px-3 py-2 text-sm" />
          </label>
        </div>
        <div>
          <label class="block text-[10px] uppercase font-bold text-secondary mb-1">
            Name{" "}
            <input required name="name" value={brick.name} class="w-full bg-surface-container-highest border-none rounded-lg px-3 py-2 text-sm" />
          </label>
        </div>
        <div>
          <label class="block text-[10px] uppercase font-bold text-secondary mb-1">
            Color{" "}
            <input required name="color" value={brick.colorId} class="w-full bg-surface-container-highest border-none rounded-lg px-3 py-2 text-sm" />
          </label>
        </div>
        <div>
          <label class="block text-[10px] uppercase font-bold text-secondary mb-1">
            Color Hex{" "}
            <input name="colorHex" value={brick.colorHex} class="w-full bg-surface-container-highest border-none rounded-lg px-3 py-2 text-sm" />
          </label>
        </div>
        <div class="md:col-span-2">
          <label class="block text-[10px] uppercase font-bold text-secondary mb-1">
            Image URL{" "}
            <input type="url" name="image" value={brick.image} class="w-full bg-surface-container-highest border-none rounded-lg px-3 py-2 text-sm" />
          </label>
        </div>
        <div>
          <label class="block text-[10px] uppercase font-bold text-secondary mb-1">
            Required{" "}
            <input required min="1" type="number" name="required" value={brick.required} class="w-full bg-surface-container-highest border-none rounded-lg px-3 py-2 text-sm" />
          </label>
        </div>
        <div>
          <label class="block text-[10px] uppercase font-bold text-secondary mb-1">
            Stock{" "}
            <input required min="0" type="number" name="stock" value={brick.stock} class="w-full bg-surface-container-highest border-none rounded-lg px-3 py-2 text-sm" />
          </label>
        </div>
        <div class="md:col-span-2">
          <button type="submit" class="bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest">Save Details</button>
        </div>
      </form>
    </details>
  )
}


export default function BricksxSetList({ selectedSet, brick }: Readonly<{ selectedSet: SetRecord, brick: BrickRecord }>) {
  // console.log("Rendering BricksxSetList with brick:", brick);
  // console.log("Selected set:", selectedSet);
  
  
  return (
    <article class="bg-surface-container-lowest rounded-xl p-5">
      <div class="flex flex-col lg:flex-row gap-5 lg:items-center">
        <div class="flex gap-4 min-w-0 lg:flex-1">
          <img src={brick.image} alt={brick.name} class="max-w-max-h-32 max-h-32 rounded-lg bg-surface-container-low object-contain p-2" />
          <div class="min-w-0 flex gap-2 flex-col justify-center">
            <p class="text-[10px] font-bold uppercase tracking-widest text-secondary">Ref. {brick.reference}</p>
            <p class="text-[9px] font-semibold text-tertiary tracking-wider">ID: {brick.elementId}</p>
            <h3 class="font-black text-base leading-tight">{brick.name}</h3>
            <p class="text-xs text-secondary">{brick.colorName} · <span class="inline-block w-4 h-w-4 rounded aspect-square shadow-md border" style={`background:${brick.colorHex}`}></span></p>
          </div>
        </div>
        <UpdateStockForm selectedSet={selectedSet} brick={brick} />
        <DeleteBrickForm selectedSet={selectedSet} brick={brick} />
      </div>
        <SetInfoForm selectedSet={selectedSet} brick={brick} />
    </article>
  )
}