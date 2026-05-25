import { useStore } from "@nanostores/preact";
import { useEffect, useState } from "preact/hooks";

import type { SpareBrickRecord, ArchiveColor } from "@/types/archiveData";
import type { RebrickablePartColorDetails } from "@/types/rebrickable";

import { $spareBricks, refreshSpareBricks } from "@stores/storage-spare-bricks";
import { addSpareBrick as apiAddSpare, updateSpareBrick as apiUpdateSpare, deleteSpareBrick as apiDeleteSpare, searchNewBrick } from "@utils/bricksData";
import { updateFeedback } from "@stores/feedback";

import "@styles/select.css"

function SpareBrickCard({ brick, isEditing, onStartEdit, onDelete, onSave, onCancel }: Readonly<{
  brick: SpareBrickRecord;
  isEditing: boolean;
  onStartEdit: (b: SpareBrickRecord) => void;
  onDelete: (b: SpareBrickRecord) => void;
  onSave: (elementId: string, quantity: number) => Promise<void>;
  onCancel: () => void;
}>) {
  const [editQty, setEditQty] = useState(brick.spareQuantity);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEditing) setEditQty(brick.spareQuantity);
  }, [isEditing]);

  const handleSave = async () => {
    setSaving(true);
    await onSave(brick.elementId, editQty);
    setSaving(false);
  };

  return (
    <article class="bg-surface-container-lowest rounded-xl p-5 shadow-[0_0_13px_-6px] shadow-contrast flex flex-col h-full">
      <div class="w-full aspect-square bg-box rounded-md mb-4 overflow-hidden">
        <img src={brick.image} alt={brick.name} class="w-full h-full object-contain p-4" loading="lazy" />
      </div>
      <div class="flex-1">
        <p class="text-[10px] font-bold text-secondary tracking-widest uppercase">Ref. {brick.reference}</p>
        <p class="text-[9px] font-semibold text-tertiary tracking-wider">ID: {brick.elementId}</p>
        <h3 class="font-black text-base leading-tight mt-1">{brick.name}</h3>
        <p class="flex flex-row gap-1 text-xs text-secondary mt-1">
          {brick.colorName}
          {brick.colorHex && <span class="inline-block w-4 h-4 rounded aspect-square shadow-[0_0_13px_-6px] shadow-contrast ml-1" style={`background:${brick.colorHex}`}></span>}
        </p>
      </div>
      <div class="flex items-end gap-1 justify-between mt-4 pt-4 border-t border-outline-variant/20">
        <div>
          <p class="text-[10px] text-secondary font-bold uppercase">Spare Qty</p>
          {isEditing ? (
            <input
              type="number"
              min="0"
              value={editQty}
              onInput={(e) => setEditQty(Number((e.target as HTMLInputElement).value))}
              class="w-full bg-box text-contrast border-none rounded-lg px-3 py-2 text-sm font-black mt-0.5"
            />
          ) : (
            <p class="font-black text-xl">{brick.spareQuantity}</p>
          )}
        </div>
        <div class="flex gap-2">
          {isEditing ? (
            <>
              <button onClick={handleSave} disabled={saving} class="bg-primary text-surface px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider">{saving ? "Saving..." : "Save"}</button>
              <button onClick={onCancel} class="bg-box text-contrast px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider">Cancel</button>
            </>
          ) : (
            <>
              <button onClick={() => onStartEdit(brick)} class="bg-box text-contrast px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider">Edit</button>
              <button onClick={() => onDelete(brick)} class="bg-error-container text-on-error-container px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider">Remove</button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function AddSpareModal({ colors, onClose }: Readonly<{ colors: ArchiveColor[]; onClose: () => void }>) {
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const [tab, setTab] = useState<"rebrickable" | "manual">("rebrickable");
  const [searchResult, setSearchResult] = useState<{ part_num: string; name: string; part_img_url: string } | null>(null);
  const [colorOptions, setColorOptions] = useState<RebrickablePartColorDetails[]>([]);
  const [reference, setReference] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualColorId, setManualColorId] = useState(colors[0]?.id ?? 0);
  const [manualImage, setManualImage] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    requestAnimationFrame(() => setEntered(true));
  }, []);

  const close = () => {
    setEntered(false);
    setTimeout(onClose, 350);
  };

  const handleSearch = async (e: Event) => {
    e.preventDefault();
    if (!reference.trim()) return;
    setLoading(true);
    const formData = new FormData();
    formData.set("reference", reference.trim());
    const result = await searchNewBrick(formData);
    setLoading(false);
    if (result.status === "error" || !result.data) {
      updateFeedback(result.message || "Part not found", "error");
      return;
    }
    setSearchResult(result.data.info);
    setColorOptions(result.data.colors);
    setTab("rebrickable");
  };

  const handleAddFromRebrickable = async (color: RebrickablePartColorDetails) => {
    if (!searchResult) return;
    const elementId = color.elements?.[0] || `${searchResult.part_num}-${color.color_id}`;
    const formData = new FormData();
    formData.set("elementId", elementId);
    formData.set("reference", searchResult.part_num);
    formData.set("name", searchResult.name);
    formData.set("colorId", String(color.color_id));
    formData.set("image", color.part_img_url || "");
    formData.set("spareQuantity", String(quantity));

    const result = await apiAddSpare(formData);
    if (result.status === "error") {
      updateFeedback(result.message || "Failed to add spare brick", "error");
      return;
    }
    await refreshSpareBricks();
    updateFeedback("Spare brick added!", "info");
    close();
  };

  const handleAddManual = async (e: Event) => {
    e.preventDefault();
    const generatedId = `${reference.trim()}-${manualColorId}`;
    const formData = new FormData();
    formData.set("elementId", generatedId);
    formData.set("reference", reference.trim());
    formData.set("name", manualName || reference.trim());
    formData.set("colorId", String(manualColorId));
    formData.set("image", manualImage || "https://images.unsplash.com/photo-1587654780291-39c9404d746b?auto=format&fit=crop&w=900&q=80");
    formData.set("spareQuantity", String(quantity));

    const result = await apiAddSpare(formData);
    if (result.status === "error") {
      updateFeedback(result.message || "Failed to add spare brick", "error");
      return;
    }
    await refreshSpareBricks();
    updateFeedback("Spare brick added!", "info");
    close();
  };

  if (!mounted) return null;

  return (
    <div class="fixed inset-0 z-50 flex items-start justify-center pt-12 pb-12 items-center ml-64" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div class={`absolute inset-0 bg-black/40 ${entered ? "animate-fade-in" : "animate-fade-out"}`} onClick={close} />
      <div class={`relative bg-surface-container-low rounded-xl p-6 w-full max-w-3xl max-h-full overflow-y-auto mx-4 shadow-2xl ${entered ? "animate-slide-in-top" : "animate-slide-out-top"}`}>
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-black">Add Spare Brick</h3>
          <button onClick={close} class="text-secondary text-lg font-bold">&times;</button>
        </div>

        <div class="flex gap-2 mb-6">
          <button onClick={() => setTab("rebrickable")} class={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider ${tab === "rebrickable" ? "bg-primary text-surface" : "bg-surface-container-highest text-secondary"}`}>Search Rebrickable</button>
          <button onClick={() => setTab("manual")} class={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider ${tab === "manual" ? "bg-primary text-surface" : "bg-surface-container-highest text-secondary"}`}>Manual Entry</button>
        </div>

        {tab === "rebrickable" && !searchResult && (
          <form onSubmit={handleSearch} class="grid grid-cols-1 gap-4">
            <label class="block text-[10px] uppercase font-bold text-secondary mb-1">
              Part Number
              <input name="reference" placeholder="e.g. 3001" class="w-full bg-surface-container-highest border-none rounded-lg px-3 py-2 text-sm mt-1" value={reference} onInput={(e) => setReference((e.target as HTMLInputElement).value)} required />
            </label>
            <div>
              <button type="submit" class="bg-primary text-white px-6 py-3 rounded-lg font-bold text-sm" disabled={loading}>{loading ? "Searching..." : "Search Part"}</button>
            </div>
          </form>
        )}

        {tab === "rebrickable" && searchResult && (
          <div>
            <div class="bg-surface-container-highest rounded-xl p-4 mb-4 flex gap-4 items-start">
              <img src={searchResult.part_img_url || ""} alt={searchResult.name} class="w-20 h-20 object-contain bg-surface-container-low p-2 rounded-lg" />
              <div>
                <p class="text-[10px] font-bold uppercase tracking-widest text-secondary">Ref. {searchResult.part_num}</p>
                <h4 class="font-black text-base">{searchResult.name}</h4>
              </div>
            </div>
            <label class="block text-[10px] uppercase font-bold text-secondary mb-3">
              Quantity{" "}
              <input type="number" min="1" value={quantity} onInput={(e) => setQuantity(Number((e.target as HTMLInputElement).value))} class="w-24 bg-surface-container-highest border-none rounded-lg px-3 py-2 text-sm mt-1" />
            </label>
            <p class="text-xs text-secondary mb-3">Select a color:</p>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
              {colorOptions.map((color) => {
                const elementId = color.elements?.[0] || `${searchResult.part_num}-${color.color_id}`;
                return (
                  <button key={elementId} onClick={() => handleAddFromRebrickable(color)} class="bg-surface-container-highest p-3 rounded-lg flex items-center gap-3 hover:bg-surface-container-high transition-colors text-left justify-between">
                    <div className="flex flex-row gap-3">
                      <img src={color.part_img_url} alt={color.color_name} class="w-6 h-6 rounded-full shadow-inner shrink-0" loading="lazy" />
                      <div class="min-w-0">
                        <p class="text-xs font-bold truncate">{color.color_name}</p>
                        <p class="text-[9px] text-secondary">ID: {elementId}</p>
                      </div>
                    </div>
                    <div class="w-6 h-6 rounded-full shadow-inner shrink-0" style={`background:${color.colorRgb}`}></div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {tab === "manual" && (
          <form onSubmit={handleAddManual} class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="md:col-span-2">
              <label class="block text-[10px] uppercase font-bold text-secondary mb-1">
                Reference *{" "}
                <input name="reference" placeholder="e.g. 3001" class="w-full bg-surface-container-highest border-none rounded-lg px-3 py-2 text-sm mt-1" value={reference} onInput={(e) => setReference((e.target as HTMLInputElement).value)} required />
              </label>
            </div>
            <div>
              <label class="block text-[10px] uppercase font-bold text-secondary mb-1">
                Name{" "}
                <input name="name" placeholder="Piece name" class="w-full bg-surface-container-highest border-none rounded-lg px-3 py-2 text-sm mt-1" value={manualName} onInput={(e) => setManualName((e.target as HTMLInputElement).value)} />
              </label>
            </div>
            <div>
              <label class="block text-[10px] uppercase font-bold text-secondary mb-1">
                Color{" "}
                <select name="color" class="w-full bg-surface-container-highest border-none rounded-lg px-3 py-2 text-sm mt-1" value={manualColorId} onChange={(e) => setManualColorId(Number((e.target as HTMLSelectElement).value))}>
                  {colors.map((c) => <option value={c.id} key={c.id}><span className="block w-4 h-4 rounded-full" style={`background:${c.rgb}`}></span> {c.name}</option>)}
                </select>
              </label>
            </div>
            <div>
              <label class="block text-[10px] uppercase font-bold text-secondary mb-1">
                Image URL{" "}
                <input type="url" name="image" placeholder="https://..." class="w-full bg-surface-container-highest border-none rounded-lg px-3 py-2 text-sm mt-1" value={manualImage} onInput={(e) => setManualImage((e.target as HTMLInputElement).value)} />
              </label>
            </div>
            <div>
              <label class="block text-[10px] uppercase font-bold text-secondary mb-1">
                Quantity *{" "}
                <input type="number" min="1" name="spareQuantity" value={quantity} onInput={(e) => setQuantity(Number((e.target as HTMLInputElement).value))} class="w-full bg-surface-container-highest border-none rounded-lg px-3 py-2 text-sm mt-1" required />
              </label>
            </div>
            <div class="md:col-span-2">
              <button type="submit" class="bg-primary text-white px-6 py-3 rounded-lg font-bold text-sm">Add Spare Brick</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}



export default function SparePartsManager({ colors }: Readonly<{ colors: ArchiveColor[] }>) {
  const spareBricks = useStore($spareBricks);
  const [search, setSearch] = useState("");
  const [colorFilter, setColorFilter] = useState<number | "all">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SpareBrickRecord | null>(null);

  useEffect(() => {
    refreshSpareBricks();
    const btn = document.getElementById("add-spare-btn");
    const handler = () => setShowAddModal(true);
    btn?.addEventListener("click", handler);
    return () => btn?.removeEventListener("click", handler);
  }, []);

  const filtered = spareBricks.filter((b) => {
    if (colorFilter !== "all" && b.colorId !== colorFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return b.reference.toLowerCase().includes(q) || b.name.toLowerCase().includes(q) || b.elementId.toLowerCase().includes(q);
  });

  const handleSaveEdit = async (elementId: string, quantity: number) => {
    const formData = new FormData();
    formData.set("spareQuantity", String(quantity));
    const result = await apiUpdateSpare(elementId, formData);
    if (result.status === "error") {
      updateFeedback(result.message || "Failed to update", "error");
      return;
    }
    await refreshSpareBricks();
    updateFeedback("Quantity updated!", "info");
    setEditingId(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const result = await apiDeleteSpare(deleteTarget.elementId);
    if (result.status === "error") {
      updateFeedback(result.message || "Failed to delete", "error");
      return;
    }
    await refreshSpareBricks();
    updateFeedback("Spare brick removed!", "info");
    setDeleteTarget(null);
  };

  return (
    <div>
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div class="flex-1 w-full md:w-auto flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search by reference, name or ID..."
            value={search}
            onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
            class="w-full md:w-72 bg-surface-container-highest border-none rounded-lg px-4 py-3 text-sm"
          />
          <select
            value={colorFilter}
            onChange={(e) => setColorFilter(e.currentTarget.value === "all" ? "all" : Number(e.currentTarget.value))}
            class="bg-surface-container-highest border-none rounded-lg px-4 py-3 text-sm min-w-40"
          >
            <option value="all">All Colors</option>
            {colors.map((c) => (
              <option key={c.id} value={c.id}><span class={`block w-4 h-4 rounded-full`} style={{ backgroundColor: c.rgb }}></span> {c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div class="text-center py-24 text-secondary">
          <h2 class="text-2xl font-black mb-2">{spareBricks.length === 0 ? "No spare bricks yet" : "No bricks match your search"}</h2>
          <p class="text-sm">{spareBricks.length === 0 ? 'Click "Add Spare Brick" to start building your spare parts inventory.' : "Try a different search term."}</p>
        </div>
      ) : (
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map((brick) => (
            <SpareBrickCard key={brick.elementId} brick={brick} isEditing={editingId === brick.elementId} onStartEdit={(b) => setEditingId(b.elementId)} onDelete={setDeleteTarget} onSave={handleSaveEdit} onCancel={() => setEditingId(null)} />
          ))}
        </div>
      )}

      {showAddModal && <AddSpareModal colors={colors} onClose={() => setShowAddModal(false)} />}
      {deleteTarget && (
        <div class="fixed inset-0 z-50 flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}>
          <div class="absolute inset-0 bg-black/40" />
          <div class="relative bg-surface-container-low rounded-xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <h3 class="text-lg font-black mb-2">Remove Spare Brick</h3>
            <p class="text-sm text-secondary mb-4">Remove <strong>{deleteTarget.name}</strong> (Ref. {deleteTarget.reference}) from spare inventory? This cannot be undone.</p>
            <div class="flex gap-2">
              <button onClick={handleDelete} class="bg-error text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider">Remove</button>
              <button onClick={() => setDeleteTarget(null)} class="bg-surface-container-highest text-secondary px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
