import { useState } from "preact/hooks";
import { updateFeedback } from '@stores/feedback';

type Mode = "rebrickable" | "manual" | null;

interface RebrickablePreview {
  setNumber: string;
  name: string;
  image: string;
  totalPieces: number;
}

export default function AddSetForm() {
  const [mode, setMode] = useState<Mode>(null);

  return (
    <>
      <section class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => setMode("rebrickable")}
          class={`rounded-xl p-6 text-left transition-all ${
            mode === "rebrickable"
              ? "text-secondary ring-2 ring-primary shadow-lg scale-[1.02]"
              : "bg-surface-container-lowest text-on-surface hover:bg-surface-container-low shadow-[0_0_13px_-6px] shadow-contrast"
          }`}
        >
          <span class="text-3xl block mb-2">&#x1F9E9;</span>
          <h2 class="text-xl font-black mb-1">LEGO via Rebrickable</h2>
          <p class="text-sm text-secondary">Search and import from the official Rebrickable API</p>
        </button>

        <button
          onClick={() => setMode("manual")}
          class={`rounded-xl p-6 text-left transition-all ${
            mode === "manual"
              ? "text-secondary ring-2 ring-primary shadow-lg scale-[1.02]"
              : "bg-surface-container-lowest text-on-surface hover:bg-surface-container-low shadow-[0_0_13px_-6px] shadow-contrast"
          }`}
        >
          <span class="text-3xl block mb-2">&#x1F527;</span>
          <h2 class="text-xl font-black mb-1">Third-party / Manual Set</h2>
          <p class="text-sm text-secondary">Add compatible brands or create custom entries manually</p>
        </button>
      </section>

      {mode === "rebrickable" && <RebrickableForm />}
      {mode === "manual" && <ManualForm />}
    </>
  );
}

function RebrickableForm() {
  const [setNumber, setSetNumber] = useState("");
  const [searching, setSearching] = useState(false);
  const [preview, setPreview] = useState<RebrickablePreview | null>(null);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  const handleSearch = async (e: Event) => {
    e.preventDefault();
    if (!setNumber.trim()) return;
    setSearching(true);
    setError("");
    setPreview(null);
    try {
      const res = await fetch(`/api/sets/rebrickable-preview?set=${encodeURIComponent(setNumber.trim())}`);
      const data = await res.json();
      if (!data.success) {
        setError(data.message);
      } else {
        setPreview(data.set);
      }
    } catch {
      setError("Failed to search Rebrickable. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async () => {
    if (!preview) return;
    setAdding(true);
    const formData = new FormData();
    formData.append("action", "add-rebrickable");
    formData.append("setNumber", preview.setNumber);
    try {
      const res = await fetch("/api/sets", { method: "POST", body: formData });
      const data = await res.json();
      updateFeedback(data.message, data.success ? "info" : "error");
      if (data.success) setPreview(null);
    } catch {
      updateFeedback("Failed to add set. Please try again.", "error");
    } finally {
      setAdding(false);
    }
  };

  return (
    <article class="bg-surface-container-lowest rounded-xl p-6 space-y-4 shadow-[0_0_13px_-6px] shadow-contrast">
      <h2 class="text-xl font-black">LEGO via Rebrickable</h2>
      <form onSubmit={handleSearch} class="space-y-4">
        <label class="block text-xs font-bold uppercase tracking-widest text-secondary">Set Number{" "}</label>
        <div class="flex gap-3">
          <input
            type="text"
            value={setNumber}
            onInput={(e) => setSetNumber((e.target as HTMLInputElement).value)}
            placeholder="Example: 42130-1"
            class="flex-1 bg-box text-contrast placeholder:text-contrast placeholder:opacity-60 border-none rounded-lg px-4 py-3 text-sm"
          />
          <button type="submit" disabled={searching} class="bg-primary text-primary-container-contrast px-5 py-3 rounded-lg font-bold text-sm disabled:opacity-50">
            {searching ? "Searching..." : "Search"}
          </button>
        </div>
      </form>

      {error && (
        <section class="bg-error-container text-on-error-container rounded-xl p-6">
          <h2 class="text-xl font-black">Set not found</h2>
          <p class="text-sm">The selected set does not found, please try another one.</p>
        </section>
      )}

      {preview && (
        <div class="bg-surface-container-low rounded-xl p-4 space-y-4">
          <div class="flex items-start gap-4">
            <div class="rounded-lg overflow-hidden bg-surface-container-high">
              <img src={preview.image} alt={preview.name} class="max-w-[250px] max-h-[250px] object-cover rounded-lg bg-surface-container-low" />
            </div>
            <div class="space-y-1">
              <p class="text-[10px] font-bold uppercase tracking-widest text-secondary">Set No. {preview.setNumber}</p>
              <h3 class="font-black text-lg">{preview.name}</h3>
              <p class="text-sm text-secondary">{preview.totalPieces.toLocaleString()} pieces reported by Rebrickable</p>
            </div>
          </div>
          <button onClick={handleAdd} disabled={adding} class="bg-primary text-primary-container-contrast px-5 py-3 rounded-lg font-bold text-sm disabled:opacity-50">
            {adding ? "Adding..." : "Add to Inventory"}
          </button>
        </div>
      )}
    </article>
  );
}

function ManualForm() {
  const [adding, setAdding] = useState(false);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (!(e.target instanceof HTMLFormElement)) return;
    setAdding(true);
    const formData = new FormData(e.target);
    try {
      const res = await fetch("/api/sets", { method: "POST", body: formData });
      const data = await res.json();
      updateFeedback(data.message, data.success ? "info" : "error");
      if (data.success) e.target.reset();
    } catch {
      updateFeedback("Failed to add set. Please try again.", "error");
    } finally {
      setAdding(false);
    }
  };

  return (
    <article class="bg-surface-container-lowest rounded-xl p-6 space-y-4 shadow-[0_0_13px_-6px] shadow-contrast">
      <h2 class="text-xl font-black">Third-party / Manual Set</h2>
      <form onSubmit={handleSubmit} class="space-y-4">
        <input type="hidden" name="action" value="add-manual" />
        <input type="hidden" name="totalPieces" value="0" />
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">
              Set Name{" "}
              <input name="name" required type="text" class="w-full bg-box text-contrast placeholder:text-contrast placeholder:opacity-60 border-none rounded-lg px-4 py-3 text-sm" placeholder="Enter set name..." />
            </label>
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">
              Set Number{" "}
              <input name="setNumber" required type="text" class="w-full bg-box text-contrast placeholder:text-contrast placeholder:opacity-60 border-none rounded-lg px-4 py-3 text-sm" placeholder="1234 - 1"/>
            </label>
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">
              Brand{" "}
              <select name="brand" class="w-full bg-box text-contrast border-none rounded-lg px-4 py-3 text-sm">
                <option>CaDA</option>
                <option>Mould King</option>
                <option>Other</option>
              </select>
            </label>
          </div>
          {/* <div>
            <label class="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">
              Total Pieces{" "}
              <input name="totalPieces" required min="1" type="number" class="w-full bg-box text-contrast placeholder:text-contrast placeholder:opacity-60 border-none rounded-lg px-4 py-3 text-sm" />
            </label>
          </div> */}
          <div>
            <label class="block text-xs font-bold uppercase tracking-widest text-secondary mb-2">
              Image URL{" "}
              <input name="image" type="url" placeholder="https://..." class="w-full bg-box text-contrast placeholder:text-contrast placeholder:opacity-60 border-none rounded-lg px-4 py-3 text-sm" />
            </label>
          </div>
        </div>
        <label class="flex items-center gap-2 text-sm text-secondary"><input type="checkbox" name="homologatedToLego" class="rounded" />Homologate to LEGO equivalent pieces where possible</label>
        <button type="submit" disabled={adding} class="bg-primary text-primary-container-contrast px-6 py-3 rounded-lg font-bold text-sm disabled:opacity-50">{adding ? "Saving..." : "Save Manual Set"}</button>
      </form>
    </article>
  );
}
