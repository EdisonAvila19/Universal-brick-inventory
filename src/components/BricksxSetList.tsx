import type { ArchiveColor, BrickRecord, SetRecord } from '@/types/archiveData'
import { DeleteBrick, UpdateBrickData, UpdateBrickStock, assignSpareToSet } from '@/utils/bricksData'
import { useState } from 'preact/hooks'
import { updateFeedback } from '@stores/feedback'
import { fetchBricks } from '@stores/storage-bricks'
import { refreshSpareBricks } from '@stores/storage-spare-bricks'
import '@styles/select.css'

function UpdateStockForm ({ selectedSet, brick }: Readonly<{ selectedSet: SetRecord, brick: BrickRecord }>) {

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    // Handle form submission logic here

    const response = await UpdateBrickStock(selectedSet.setNumber, formData)
    if (!response.updated) {
      console.error("Failed to update brick stock");
      updateFeedback( "Failed to update brick stock. Please try again.", "error" );
      return;
    }

    fetchBricks();
    updateFeedback( "Brick stock updated successfully!", "info" );
  }

  return (
    <form class="grid grid-cols-1 md:grid-cols-1 gap-2 lg:items-end" onSubmit={handleSubmit}>
      <input type="hidden" name="action" value="update-brick" />
      <input type="hidden" name="setNumber" value={selectedSet.setNumber} />
      <input type="hidden" name="elementId" value={brick.elementId} />
      <label className="block text-[10px] uppercase font-bold text-secondary">
        Required{" "}
        <input required min="1" type="number" name="required" value={brick.required} className="w-full bg-box text-contrast border-none rounded-lg px-3 py-2 text-sm mt-1" disabled/>
      </label>
      <label className="block text-[10px] uppercase font-bold text-secondary">
        Stock{" "}
        <input required min="0" type="number" name="stock" value={brick.stock} className="w-full bg-box text-contrast border-none rounded-lg px-3 py-2 text-sm mt-1" />
      </label>
      <button type="submit" className="bg-primary text-white px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-widest">Save Qty</button>
    </form>
  )
}

function DeleteBrickForm ({ selectedSet, brick }: Readonly<{ selectedSet: SetRecord, brick: BrickRecord }>) {

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    // Handle form submission logic here
    const response = await DeleteBrick(brick.elementId, selectedSet.setNumber);

    if (!response.deleted) {
      console.error("Failed to delete brick");
      updateFeedback( "Failed to remove brick. Please try again.", "error" );
      return;
    }

    fetchBricks();
    updateFeedback( "Brick removed successfully!", "info" );
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

function UpdateInfoForm ({ selectedSet, brick, colors }: Readonly<{ selectedSet: SetRecord, brick: BrickRecord, colors: ArchiveColor[] }>) {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = (event: Event) => {
    setIsOpen((event.target as HTMLDetailsElement).open);
  }

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    const formData = new FormData(event.target as HTMLFormElement);
    // Handle form submission logic here
    const response = await UpdateBrickData(brick, formData);

    if (!response) {
      console.error("Failed to update brick");
      updateFeedback( "Failed to update brick details. Please try again.", "error" );
    }

    fetchBricks();
    handleToggle({ target: { open: false }} as unknown as Event);
    updateFeedback( "Brick details updated successfully!", "info" );
  }

  return (
    <details className="mt-4" open={isOpen} onToggle={handleToggle}>
      <summary className="cursor-pointer text-xs font-bold uppercase tracking-widest text-secondary" > Edit Piece Details </summary>
      <form className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3" onSubmit={handleSubmit}>
        <input type="hidden" name="action" value="update-brick" />
        <input type="hidden" name="setNumber" value={selectedSet.setNumber} />
        <input type="hidden" name="originalElementId" value={brick.elementId} />
        <input type="hidden" name="elementId" value={brick.elementId} />
        <div>
          <label className="block text-[10px] uppercase font-bold text-secondary mb-1">
            Reference{" "}
            <input required name="reference" value={brick.reference} className="w-full bg-box text-contrast border-none rounded-lg px-3 py-2 text-sm " />
          </label>
        </div>
        <div>
          <label className="block text-[10px] uppercase font-bold text-secondary mb-1">
            Name{" "}
            <input required name="name" value={brick.name} className="w-full bg-box text-contrast border-none rounded-lg px-3 py-2 text-sm" />
          </label>
        </div>
        {/* <div>
          <label className="block text-[10px] uppercase font-bold text-secondary mb-1">
            Color{" "}
            <input required name="color" type='number' value={brick.colorId} min={-1} className="w-full bg-box text-contrast border-none rounded-lg px-3 py-2 text-sm" />
          </label>
        </div> */}
        <div>
          <label className="block text-[10px] uppercase font-bold text-secondary mb-1">
            Color{" "}
            <select required name="color" className="w-full bg-box text-contrast border-none rounded-lg px-3 py-2 text-sm">
              {colors.map((color) => (
                <option value={color.id} selected={color.id === brick.colorId} key={color.id}>
                  <span className="w-4 h-4 rounded-full border border-black" style={{ backgroundColor: color.rgb }} aria-hidden="true"></span>
                  <span className="">{color.name}</span>
                </option>
              ))}
            </select>
          </label>
        </div>
        {/* <div>
          <label className="block text-[10px] uppercase font-bold text-secondary mb-1">
            Color Hex{" "}
            <input name="colorHex" value={brick.colorHex} className="w-full bg-box text-contrast border-none rounded-lg px-3 py-2 text-sm" />
          </label>
        </div> */}
        <div>
          <label className="block text-[10px] uppercase font-bold text-secondary mb-1">
            Image URL{" "}
            <input type="url" name="image" value={brick.image} className="w-full bg-box text-contrast border-none rounded-lg px-3 py-2 text-sm" />
          </label>
        </div>
        <div>
          <label className="block text-[10px] uppercase font-bold text-secondary mb-1">
            Required{" "}
            <input required min="1" type="number" name="required" value={brick.required} className="w-full bg-box text-contrast border-none rounded-lg px-3 py-2 text-sm" />
          </label>
        </div>
        <div>
          <label className="block text-[10px] uppercase font-bold text-secondary mb-1">
            Stock{" "}
            <input required min="0" type="number" name="stock" value={brick.stock} className="w-full bg-box text-contrast border-none rounded-lg px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="md:col-span-2">
          <button type="submit" className="bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest">Save Details</button>
        </div>
      </form>
    </details>
  )
}

function SpareAssignForm({ selectedSet, brick, spareQuantity }: Readonly<{ selectedSet: SetRecord; brick: BrickRecord; spareQuantity: number }>) {
  const [quantity, setQuantity] = useState(Math.min(spareQuantity, brick.required - brick.stock));
  const [assigning, setAssigning] = useState(false);

  const handleAssign = async () => {
    if (quantity < 1) return;
    setAssigning(true);
    const formData = new FormData();
    formData.set("elementId", brick.elementId);
    formData.set("setNumber", selectedSet.setNumber);
    formData.set("quantity", String(quantity));

    const result = await assignSpareToSet(formData);
    if (result.status === "error") {
      updateFeedback(result.message || "Failed to assign spare", "error");
      setAssigning(false);
      return;
    }

    await fetchBricks();
    await refreshSpareBricks();
    updateFeedback(`Assigned ${quantity} spare piece(s) to set!`, "info");
    setAssigning(false);
  };

  return (
    <div class="mt-3 pt-3 border-t border-primary/20 bg-primary-container/10 rounded-lg p-3 flex items-center gap-3">
      <span class="text-xs font-bold uppercase tracking-wider text-primary shrink-0">Spare: {spareQuantity} available</span>
      <input
        type="number"
        min="1"
        max={Math.min(spareQuantity, brick.required - brick.stock)}
        value={quantity}
        onInput={(e) => setQuantity(Number((e.target as HTMLInputElement).value))}
        class="w-16 bg-surface-container-highest border-none rounded-lg px-2 py-1.5 text-sm text-center"
      />
      <button
        onClick={handleAssign}
        disabled={assigning || quantity < 1}
        class="bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50"
      >
        {assigning ? "..." : "Assign"}
      </button>
    </div>
  );
}


export default function BricksxSetList({ selectedSet, brick, colors, spareQuantity = 0 }: Readonly<{ selectedSet: SetRecord, brick: BrickRecord, colors: ArchiveColor[], spareQuantity?: number }>) {
  const missing = brick.required - brick.stock;
  const hasSpare = spareQuantity > 0 && missing > 0;

  return (
    <article className={`bg-surface-container-lowest rounded-xl p-5 shadow-[0_0_13px_-6px] shadow-contrast ${hasSpare ? 'ring-1 ring-primary/30' : ''}`}>
      <div className="flex flex-col lg:flex-row gap-5 lg:items-center">
        <div className="flex gap-4 min-w-0 lg:flex-1">
          <img src={brick.image} alt={brick.name} className="max-w-max-h-32 max-h-32 rounded-lg bg-surface-container-low object-contain p-2" loading="lazy" />
          <div className="min-w-0 flex gap-2 flex-col justify-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">Ref. {brick.reference}</p>
            <p className="text-[9px] font-semibold text-tertiary tracking-wider">ID: {brick.elementId}</p>
            <h3 className="font-black text-base leading-tight">{brick.name}</h3>
            <p className="flex flex-row gap-1 text-xs text-secondary">{brick.colorName} · <span class="inline-block w-4 h-w-4 rounded aspect-square shadow-[0_0_13px_-6px] shadow-contrast" style={`background:${brick.colorHex}`}></span></p>
            {hasSpare && (
              <p class="text-[10px] font-bold text-primary flex items-center gap-1 mt-1">
                <span>📦</span> {spareQuantity} in spare parts
              </p>
            )}
          </div>
        </div>
        <UpdateStockForm selectedSet={selectedSet} brick={brick} />
        <DeleteBrickForm selectedSet={selectedSet} brick={brick} />
      </div>
        <UpdateInfoForm selectedSet={selectedSet} brick={brick} colors={colors} />
        {hasSpare && <SpareAssignForm selectedSet={selectedSet} brick={brick} spareQuantity={spareQuantity} />}
    </article>
  )
}