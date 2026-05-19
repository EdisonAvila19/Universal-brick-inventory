import { searchNewBrick } from '@/utils/bricksData'
import type { BrickRecord } from '@/types/archiveData'
import { updateFeedback } from '@/stores/feedback';
import { useState } from 'preact/compat'


function SearchExternalPartForm({ selectedSet, setDisplayColors }: Readonly<{ selectedSet: { setNumber: string }, setDisplayColors: (value: boolean) => void }>) {

  const handleSearchExternalPart = async (event: Event) => {
    event.preventDefault();
    
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const reference = formData.get("reference") as string;
    if (!reference) {
      updateFeedback("Reference is required to search for the part", "error");
      return;
    }

    // API call to search for the part in Rebrickable
    const result = await searchNewBrick(formData);
    if (result.status === "error") {
      updateFeedback("No Part matches the given query.", "error");
      return;
    }

    setDisplayColors(true);
  }

  return (
    <form class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4" onSubmit={handleSearchExternalPart}>
      <input type="hidden" name="action" value="search-external-part" />
      <input type="hidden" name="setNumber" value={selectedSet.setNumber} />
      <div class="md:col-span-2">
        <label class="block text-[10px] uppercase font-bold text-secondary mb-1">
          Search External Part (Rebrickable){""}
          <input name="reference" placeholder="Enter part number (e.g. 3001)" class="w-full bg-surface-container-highest border-none rounded-lg px-3 py-2 text-sm" />
        </label>
      </div>
      <div class="md:col-span-2">
        <button type="submit" class="bg-primary text-white px-6 py-3 rounded-lg font-bold text-sm">Search Part</button>
      </div>
    </form>
  )
}

function SelectionColorsList() {
  return (
    <section class="bg-surface-container-highest rounded-xl p-6 mb-6">
      <h4 class="text-lg font-black mb-2">External Part Found</h4>
      <div class="flex gap-4 items-start mb-4">
        <img src={Astro.locals.externalPart.part.part_img_url ?? "https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=900&q=80"} alt={Astro.locals.externalPart.part.name} class="w-24 h-24 object-contain bg-surface-container-low p-2 rounded-lg" />
        <div>
          <p class="text-[10px] font-bold uppercase tracking-widest text-secondary">Ref. {Astro.locals.externalPart.part.part_num}</p>
          <h5 class="font-black text-base">{Astro.locals.externalPart.part.name}</h5>
          <p class="text-xs text-secondary">Select a color to add:</p>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Astro.locals.externalPart.colors
          .map((colorData: RebrickablePartColorDetails) => (
          <form method="post" class="bg-surface-container-lowest p-3 rounded-lg flex items-center gap-3">
            <input type="hidden" name="action" value="add-brick" />
            <input type="hidden" name="setNumber" value={selectedSet?.setNumber} />
            <input type="hidden" name="reference" value={Astro.locals.externalPart.part.part_num} />
            <input type="hidden" name="name" value={Astro.locals.externalPart.part.name} />
            <input type="hidden" name="colorId" value={colorData.color_id} />
            <input type="hidden" name="elementId" value={(colorData.elements && colorData.elements[0]) ? colorData.elements[0] : `${Astro.locals.externalPart.part.part_num}-${colorData.color_id}`} />
            <input type="hidden" name="image" value={colorData.part_img_url ?? ""} />
            <div class="w-6 h-6 rounded-full shadow-inner" style={`background:${colorData.colorRgb}`}></div>
            <div class="flex-1">
              <p class="text-xs font-bold">{colorData.color_name}</p>
              <p class="text-[9px] text-secondary">ID: {(colorData.elements && colorData.elements[0]) ? colorData.elements[0] : "N/A"}</p>
            </div>
            <button type="submit" class="bg-primary text-white px-3 py-1 rounded text-xs font-bold">Add</button>
          </form>
        ))}
      </div>
    </section>
  )
}


export default function AddNewPiece({selectedSet, allBricks}: Readonly<{ selectedSet: { setNumber: string }, allBricks: Array<BrickRecord> }>) {
  const [displayColors, setDisplayColors] = useState(false);

  return (
    <section class="bg-surface-container-low rounded-xl p-6">
      <h3 class="text-xl font-black mb-4">Add Piece to Set</h3>

      { displayColors 
        ? <p class="text-sm text-secondary my-4">Colors for the selected part will be displayed here.</p>
        : <SearchExternalPartForm selectedSet={selectedSet} setDisplayColors={setDisplayColors} />
      }

      <form class="grid grid-cols-1 md:grid-cols-2 gap-4" id="add-brick-form">
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