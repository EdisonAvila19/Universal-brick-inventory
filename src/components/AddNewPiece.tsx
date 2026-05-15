export default function AddNewPiece({selectedSet}: Readonly<{ selectedSet: { setNumber: string | null } }>) {
  return (
    <section class="bg-surface-container-low rounded-xl p-6">
      <h3 class="text-xl font-black mb-4">Add Piece to Set</h3>

      <form method="post" class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4" id='search-rebrickable'>
        <input type="hidden" name="action" value="search-external-part" />
        <input type="hidden" name="setNumber" value={selectedSet.setNumber} />
        <div class="md:col-span-2">
          <label class="block text-[10px] uppercase font-bold text-secondary mb-1">Search External Part (Rebrickable)</label>
          <input name="reference" placeholder="Enter part number (e.g. 3001)" class="w-full bg-surface-container-highest border-none rounded-lg px-3 py-2 text-sm" />
        </div>
        <div class="md:col-span-2">
          <button type="submit" class="bg-primary text-white px-6 py-3 rounded-lg font-bold text-sm">Search Part</button>
        </div>
      </form>

      <form method="post" class="grid grid-cols-1 md:grid-cols-2 gap-4" id="add-brick-form">
        <input type="hidden" name="action" value="add-brick" />
        <input type="hidden" name="setNumber" value={selectedSet.setNumber} />
        <div class="md:col-span-2 relative">
          <label class="block text-[10px] uppercase font-bold text-secondary mb-1">
            Search Existing Piece{" "}
            <input name="existingElementId" id="existingElementId" placeholder="Search by typing reference, name or color" class="w-full bg-surface-container-highest border-none rounded-lg px-3 py-2 text-sm" />
          </label>
          <div id="existing-bricks-suggestions" class="hidden absolute z-10 w-full bg-surface-container-highest rounded-lg shadow-lg max-h-60 overflow-y-auto mt-1"></div>
        </div>
        <div id="manual-fields" style="display: contents;">
          <div>
            <label class="block text-[10px] uppercase font-bold text-secondary mb-1">
              Reference{" "}
              <input name="reference" class="w-full bg-surface-container-highest border-none rounded-lg px-3 py-2 text-sm" />
            </label>
          </div>
          <div>
            <label class="block text-[10px] uppercase font-bold text-secondary mb-1">
              Name{" "}
              <input name="name" class="w-full bg-surface-container-highest border-none rounded-lg px-3 py-2 text-sm" />
            </label>
          </div>
          <div>
            <label class="block text-[10px] uppercase font-bold text-secondary mb-1">
              Color ID{" "}
              <input type="number" name="colorId" class="w-full bg-surface-container-highest border-none rounded-lg px-3 py-2 text-sm" />
            </label>
          </div>
          <div class="md:col-span-2">
            <label class="block text-[10px] uppercase font-bold text-secondary mb-1">
              Image URL{" "}
              <input type="url" name="image" placeholder="https://..." class="w-full bg-surface-container-highest border-none rounded-lg px-3 py-2 text-sm" />
            </label>
          </div>
        </div>
        <div id="existing-preview" class="md:col-span-2" style="display:none;"></div>
        <div>
          <label class="block text-[10px] uppercase font-bold text-secondary mb-1">
            Required{" "}
            <input required min="1" type="number" name="required" value="1" class="w-full bg-surface-container-highest border-none rounded-lg px-3 py-2 text-sm" />
          </label>
        </div>
        <div>
          <label class="block text-[10px] uppercase font-bold text-secondary mb-1">
            Stock{" "}
            <input required min="0" type="number" name="stock" value="0" class="w-full bg-surface-container-highest border-none rounded-lg px-3 py-2 text-sm" />
          </label>
        </div>
        <div class="md:col-span-2">
          <button type="submit" class="bg-primary text-white px-6 py-3 rounded-lg font-bold text-sm">Add Piece</button>
        </div>
      </form>
    </section>
  )
}