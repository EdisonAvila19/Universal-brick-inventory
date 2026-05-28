import { useStore } from '@nanostores/preact';
import { useEffect, useState, useRef } from "preact/hooks";

import type { ArchiveColor, BrickRecord } from '@/types/archiveData'
import type { RebrickablePartColorDetails } from '@/types/rebrickable'

import { addNewBrick, searchNewBrick } from '@utils/bricksData'
import { updateFeedback } from '@stores/feedback';
import { $displayColors, $colorBricks, setDisplayColors, setColorBricks, resetForm } from '@stores/storage-newPieceForm';
import { $bricks, $BricksCatalog, fetchBricks, setBricksCatalog } from '@stores/storage-bricks';



function SearchExternalPartForm({ selectedSet }: Readonly<{ selectedSet: { setNumber: string } }>) {
  const existingBricks = useStore($bricks);

  const filterExistingBricks = async (colorBricks: RebrickablePartColorDetails[], reference: string) => {
    const setBricks = existingBricks.filter(brick => brick.fromSet === selectedSet.setNumber);

    const tempColorBricks = [...colorBricks]
    tempColorBricks.forEach(colorBrick => {
      if (colorBrick.elements[0]) return;
      colorBrick.elements[0] = `${reference}-${colorBrick.color_id}`;
    });

    const filteredColors = tempColorBricks.filter(({color_name, elements}) => {
      const brickId = elements[0] ? elements[0] : `${reference}-${color_name}`;
      return !setBricks.some((brick) => brick.elementId === brickId || brick.brickId === brickId);
    })

    return filteredColors;
  }

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

      const filteredBricks = await filterExistingBricks(colors, info.part_num);

      setDisplayColors(true);
      setColorBricks({info, colors: filteredBricks});

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

function AddExternalPieceForm({ selectedSet, onSuccess }: Readonly<{ selectedSet: { setNumber: string }, onSuccess?: () => void }>) {

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
      onSuccess?.();
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

            const brickId = `${part_num}-${colorData.color_id}`;
            const elementId = colorData.elements?.[0] || "-";

            return (
              <form method="post" class="bg-surface-container-lowest border border-contrast p-3 rounded-lg flex items-center gap-3" key={brickId} onSubmit={handleSubmit}>
                <input type="hidden" name="setNumber" value={setNumber} />
                <input type="hidden" name="reference" value={part_num} />
                <input type="hidden" name="name" value={name} />
                <input type="hidden" name="colorId" value={colorData.color_id} />
                <input type="hidden" name="brickId" value={brickId} />
                <input type="hidden" name="elementId" value={elementId} />
                <input type="hidden" name="image" value={colorData.part_img_url ?? ""} />
                <input type="hidden" name="required" value="1"/>
                <input type="hidden" name="stock" value="0"/>
                <div class="w-6 h-6 rounded-full shadow-inner" style={`background:${colorData.colorRgb}`}></div>
                <div class="flex-1">
                  <p class="text-xs font-bold">{colorData.color_name}</p>
                  <p class="text-[9px] text-secondary">ID: {brickId}</p>
                </div>
                <button type="submit" class="bg-primary text-white px-3 py-1 rounded text-xs font-bold">Add</button>
              </form>
            )
        })}
      </div>
    </section>
  )
}

function AddManualPieceForm({selectedSet, colors, onSuccess}: Readonly<{ selectedSet: { setNumber: string }, colors: Array<ArchiveColor>, onSuccess?: () => void }>) {
  const BricksCatalog = useStore($BricksCatalog);
  const [previewBrick, setPreviewBrick] = useState<BrickRecord | null>(null);
  const [suggestions, setSuggestions] = useState<Array<BrickRecord>>([]);
  const suggestionBoxRef = useRef<HTMLDivElement | null>(null);

  const elementIdRef = useRef<string>("")
  const referenceRef = useRef<string>("")
  const nameRef = useRef<string>("")
  const colorIdRef = useRef<string>("")
  const imageRef = useRef<string>("")

  useEffect(() => {
    fetchBricks();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestionBoxRef.current && !suggestionBoxRef.current.contains(event.target as Node)) {
        setSuggestions([]);
        setPreviewBrick(null);
      }
    }

    if (suggestions.length > 0) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [suggestions]);

  useEffect(() => {
    const unsub = $colorBricks.subscribe((bricksData) => {
      if (bricksData) {
        referenceRef.current = bricksData.info.part_num;
        nameRef.current = bricksData.info.name;
      }
    });
    return unsub;
  }, []);

  const resetManualForm = () => {
    elementIdRef.current = "";
    brickIdRef.current = "";
    referenceRef.current = "";
    nameRef.current = "";
    colorIdRef.current = "";
    imageRef.current = "";
    setPreviewBrick(null);
  }

  const handleSearchSuggestions = (event: Event) => {
    event.preventDefault();
    const input = event.target as HTMLInputElement;
    const query = input.value.trim().toLowerCase();

    if (!query || query === "") {
      setSuggestions([]);
      setPreviewBrick(null);
      return;
    }

    const matches = BricksCatalog.filter(b =>
      b.brickId.toLowerCase().includes(query) ||
      b.elementId.toLowerCase().includes(query) ||
      b.reference.toLowerCase().includes(query) ||
      b.name.toLowerCase().includes(query) ||
      (b.colorName?.toLowerCase().includes(query))
    ).slice(0, 20);

    setSuggestions(matches);
  }

  const handleSuggestionClick = (brick: BrickRecord) => {
    elementIdRef.current = brick.elementId;
    referenceRef.current = brick.reference;
    nameRef.current = brick.name;
    colorIdRef.current = brick.colorId.toString();
    imageRef.current = brick.image;

    setPreviewBrick(brick);
    setSuggestions([]);
  }

  const brickIdRef = useRef<string>("")

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);

    try {
      if (!formData.get("setNumber") || !formData.get("reference") || !formData.get("name") || !formData.get("colorId")) {
        throw new Error("Missing required fields to add the brick");
      }

      const rawReference = formData.get("reference")
      const reference = typeof rawReference === "string" ? rawReference.trim() : "";
      const colorId = Number(formData.get("colorId") ?? "0");
      
      if (!formData.get("brickId")) {
        formData.set("brickId", `${reference}-${colorId}`);
      }
      if (!formData.get("elementId")) {
        formData.set("elementId", "-");
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
      suggestionBoxRef.current = null;
      resetManualForm();
      onSuccess?.();
    } catch (error) {
      console.error("Error adding new brick:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred while adding the brick.";
      updateFeedback(errorMessage, "error");
    }

    
  }

  return (
    <>
      <div class="md:col-span-2 relative mb-4">

        <label class="block text-[10px] uppercase font-bold text-secondary mb-1">
          Search Existing Piece{" "}
          <input name="existingElementId" id="existingElementId" placeholder="Search by typing reference, name or color" class="w-full bg-surface-container-highest border-none rounded-lg px-3 py-2 text-sm" onInput={handleSearchSuggestions}/>
        </label>

        {suggestions.length > 0 && (
          <div ref={suggestionBoxRef} class="absolute z-10 w-full bg-surface-container-highest rounded-lg shadow-lg max-h-60 overflow-y-auto mt-1">
            {suggestions.map(b => (
              <button class="w-full px-3 py-2 cursor-pointer hover:bg-surface-container-low flex items-center gap-3" data-brick-id={b.brickId} key={b.brickId} onClick={() => handleSuggestionClick(b)}>
                <img src={b.image} alt={b.name} class="w-h-10 h-10 rounded object-contain bg-surface-container-low p-1" />
                <div class="min-w-0 flex flex-col items-start">
                  
                  <p class="text-xs font-bold truncate">{b.name}</p>
                  <p class="flex gap-1 text-[12px] text-secondary">{b.reference} · {b.colorName ?? 'Unknown'} · <span class="inline-block w-3 h-3 border border-black rounded-full" style={`background:${b.colorHex}`}></span></p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {previewBrick && (
        <div id="existing-preview" class="md:col-span-2">
          <div class="bg-surface-container-highest rounded-lg p-4 flex gap-4 items-center">
            <img src={previewBrick.image} alt={previewBrick.name} class="w-20 h-20 rounded-lg object-contain p-2 bg-surface-container-low" />
            <div>
              <p class="text-[10px] font-bold uppercase tracking-widest text-secondary">Id. {previewBrick.brickId} · Element: {previewBrick.elementId}</p>
              <p class="text-[10px] font-bold uppercase tracking-widest text-secondary">Ref. {previewBrick.reference}</p>
              <h4 class="font-black text-base">{previewBrick.name}</h4>
              <p class="text-xs text-secondary">{previewBrick.colorName} · <span class="inline-block w-3 h-3 rounded" style={`background:${previewBrick.colorHex}`}></span></p>
            </div>
          </div>
        </div>
      )}

      <form class="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit}>
        <input type="hidden" name="setNumber" value={selectedSet.setNumber} />
        {previewBrick 
          ? (
            <>
              <input value={elementIdRef.current || "-"} type="hidden" name="elementId" />
              <input value={brickIdRef.current || `${referenceRef.current}-${colorIdRef.current}`} type="hidden" name="brickId" />
              <input value={referenceRef.current} type="hidden" name="reference"/>
              <input value={nameRef.current} type="hidden" name="name"/>
              <input value={colorIdRef.current} type="hidden" name="colorId"/>
              <input value={imageRef.current} type="hidden" name="image"/>
            </>
          )
          : (
            <div id="manual-fields" style="display: contents;">
              <input type="hidden" name="elementId" value="-" />
              <input type="hidden" name="brickId" />
              <div>
                <label class="block text-[10px] uppercase font-bold text-secondary mb-1">
                  Reference{" "}
                  <input name="reference" class="w-full bg-surface-container-highest border-none rounded-lg px-3 py-2 text-sm" value={referenceRef.current} required />
                </label>
              </div>
              <div>
                <label class="block text-[10px] uppercase font-bold text-secondary mb-1">
                  Name{" "}
                  <input name="name" class="w-full bg-surface-container-highest border-none rounded-lg px-3 py-2 text-sm" value={nameRef.current} required />
                </label>
              </div>
              <div>
                <label class="block text-[10px] uppercase font-bold text-secondary mb-1">
                  Color ID{" "}
                  <select required name="colorId" className="w-full bg-surface-container-highest border-none rounded-lg px-3 py-2 text-sm" value={colorIdRef.current} onChange={(e) => colorIdRef.current = e.currentTarget.value}>
                    {colors.map((color) => (
                      <option value={color.id} key={color.id}>
                        <span className="w-4 h-4 rounded-full border border-black" style={{ backgroundColor: color.rgb }} aria-hidden="true"></span>
                        <span className="">{color.name}</span>
                      </option>
                    ))}
                  </select>
                  {/* <input type="number" name="colorId" class="w-full bg-surface-container-highest border-none rounded-lg px-3 py-2 text-sm" value={colorIdRef.current} required /> */}
                </label>
              </div>
              <div>
                <label class="block text-[10px] uppercase font-bold text-secondary mb-1">
                  Image URL{" "}
                  <input type="url" name="image" placeholder="https://..." class="w-full bg-surface-container-highest border-none rounded-lg px-3 py-2 text-sm" value={imageRef.current} required />
                </label>
              </div>
            </div>
        )}

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
    </>
  )
}

export default function AddNewPiece({selectedSet, colors}: Readonly<{ selectedSet: { setNumber: string }, colors: Array<ArchiveColor> }>) {
  const colorBricks = useStore($colorBricks);
  const displayColors = useStore($displayColors);
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    setBricksCatalog();
  }, [$bricks])

  const openModal = () => {
    setMounted(true);
    requestAnimationFrame(() => setEntered(true));
  };

  const closeModal = () => {
    setEntered(false);
    setTimeout(() => {
      setMounted(false);
      resetForm();
    }, 350);
  };

  const toggle = () => {
    if (mounted) {
      closeModal();
    } else {
      openModal();
    }
    setShaking(true);
    setTimeout(() => setShaking(false), 600);
  };

  return (
    <>
      <button
        onClick={toggle}
        class={`fixed top-6 right-0 z-[70] w-14 h-14 bg-primary-container text-[#6a5700] rounded-s-lg shadow-lg flex items-center justify-center text-3xl font-bold hover:bg-primary/90 hover:text-white transition-colors ${shaking ? 'animate-shake' : ''}`}
        aria-label={mounted ? "Close" : "Add piece to set"}
      >
        <span
          className="block transition-transform duration-300 ease-in-out"
          style={`transform: rotate(${mounted ? 45 : 0}deg)`}
        >
          +
        </span>
      </button>

      {mounted && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-12 pb-12 items-center ml-64"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className={`absolute inset-0 bg-black/40 ${entered ? 'animate-fade-in' : 'animate-fade-out'}`} onClick={closeModal}/>

          <div className={`relative bg-surface-container-low rounded-xl p-6 w-full max-w-7xl max-h-full overflow-y-auto mx-4 shadow-2xl ${entered ? 'animate-fade-in animate-slide-in-top' : 'animate-fade-out animate-slide-out-top'}`}>
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-xl font-black">Add Piece to Set</h3>
            </div>

            <SearchExternalPartForm selectedSet={selectedSet} />

            {(displayColors && colorBricks) && <AddExternalPieceForm selectedSet={selectedSet} onSuccess={closeModal} />}

            <AddManualPieceForm selectedSet={selectedSet} colors={colors} onSuccess={closeModal} />
          </div>
        </div>
      )}
    </>
  )
}