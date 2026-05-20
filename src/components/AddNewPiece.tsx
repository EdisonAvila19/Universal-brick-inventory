import { useStore } from '@nanostores/preact';
import { useEffect } from "preact/hooks";

import type { BrickRecord } from '@/types/archiveData'
import type { RebrickablePartColorDetails } from '@/types/rebrickable'

import { addNewBrick, searchNewBrick } from '@utils/bricksData'
import { updateFeedback } from '@stores/feedback';
import { $displayColors, $colorBricks, setDisplayColors, setColorBricks, resetForm } from '@stores/storage-newPieceForm';
import { $bricks, fetchBricks, setBricks } from '@stores/storage-bricks';


function SearchExternalPartForm({ selectedSet }: Readonly<{ selectedSet: { setNumber: string } }>) {

  const handleSearchExternalPart = async (event: Event) => {
    event.preventDefault();
    
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const reference = formData.get("reference") as string;
    
    try {
      if (!reference) {
        throw new Error("Reference is required to search for the part");
      }

      // API call to search for the part in Rebrickable
      const result = await searchNewBrick(formData);

      if (result.status === "error" || !result.data) {
        throw new Error(result.message || "No Part matches the given query.");
      }
      const { info, colors } = result.data;

      setDisplayColors(true);
      setColorBricks({info, colors});

    } catch (error) {
      console.error("Error searching for external part:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred while searching for the part.";
      resetForm();
      updateFeedback(errorMessage, "error");
    }
    
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

function AddExternalPieceForm({ selectedSet }: Readonly<{ selectedSet: { setNumber: string } }>) {

  const bricksData = useStore($colorBricks);
  const setNumber = selectedSet.setNumber;

  if (!bricksData) return null;

  const { part_num, name, part_img_url } = bricksData.info;
  const colors = bricksData.colors;

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      if (!formData.get("setNumber") || !formData.get("reference") || !formData.get("name") || !formData.get("colorId") || !formData.get("elementId")) {
        throw new Error("Missing required fields to add the brick");
      }

      const results = await addNewBrick(formData)
      
      if (results.status === "error") {
        throw new Error(results.message || "Failed to add the brick");
      }

      const updateBricksResults = await fetchBricks()

      if (updateBricksResults.status === "error") {
        throw new Error(updateBricksResults.message || "Brick added but failed to update the bricks list");
      }

      updateFeedback("Brick added successfully!", "info");
      resetForm();
    } catch (error) {
      console.error("Error adding new brick:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred while adding the brick.";
      updateFeedback(errorMessage, "error");
    }
  }

  return (
    <section class="bg-surface-container-highest rounded-xl p-6 mb-6">
      <h4 class="text-lg font-black mb-2">External Part Found</h4>
      <div class="flex gap-4 items-start mb-4">
        <img src={part_img_url ?? "https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=900&q=80"} alt={name} class="w-24 h-24 object-contain bg-surface-container-low p-2 rounded-lg" />
        <div>
          <p class="text-[10px] font-bold uppercase tracking-widest text-secondary">Ref. {part_num}</p>
          <h5 class="font-black text-base">{name}</h5>
          <p class="text-xs text-secondary">Select a color to add:</p>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {colors.map((colorData: RebrickablePartColorDetails) => {

            const brickID = colorData.elements?.[0] 
              ? `${colorData.elements[0]}`
              : `${part_num}-${colorData.color_id}`;

            return (
              <form method="post" class="bg-surface-container-lowest p-3 rounded-lg flex items-center gap-3" key={brickID} onSubmit={handleSubmit}>
                <input type="hidden" name="setNumber" value={setNumber} />
                <input type="hidden" name="reference" value={part_num} />
                <input type="hidden" name="name" value={name} />
                <input type="hidden" name="colorId" value={colorData.color_id} />
                <input type="hidden" name="elementId" value={brickID} />
                <input type="hidden" name="image" value={colorData.part_img_url ?? ""} />
                <input type="hidden" name="required" value="1"/>
                <input type="hidden" name="stock" value="0"/>
                <div class="w-6 h-6 rounded-full shadow-inner" style={`background:${colorData.colorRgb}`}></div>
                <div class="flex-1">
                  <p class="text-xs font-bold">{colorData.color_name}</p>
                  <p class="text-[9px] text-secondary">ID: {brickID}</p>
                </div>
                <button type="submit" class="bg-primary text-white px-3 py-1 rounded text-xs font-bold">Add</button>
              </form>
            )
        })}
      </div>
    </section>
  )
}

function AddManualPieceForm({selectedSet, allBricks}: Readonly<{ selectedSet: { setNumber: string }, allBricks: Array<BrickRecord> }>) {
  const bricks = useStore($bricks);

  useEffect(() => {
    setBricks(allBricks);
  }, []);

  const handleSubmit = (event: Event) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    console.log("Form data to submit:", Object.fromEntries(formData.entries()));
  }

  return (
    <form class="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
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
  )
}

export default function AddNewPiece({selectedSet, allBricks}: Readonly<{ selectedSet: { setNumber: string }, allBricks: Array<BrickRecord> }>) {
    const colorBricks = useStore($colorBricks);
    const displayColors = useStore($displayColors);

  return (
    <section class="bg-surface-container-low rounded-xl p-6">
      <h3 class="text-xl font-black mb-4">Add Piece to Set</h3>

      <SearchExternalPartForm selectedSet={selectedSet} />

      {(displayColors && colorBricks) && <AddExternalPieceForm selectedSet={selectedSet} />}

      <AddManualPieceForm selectedSet={selectedSet} allBricks={allBricks} />
    </section>
  )
}