import { useState } from "preact/hooks";
import type { ArchiveColor } from "@/types/archiveData";
import { updateFeedback } from "@stores/feedback";

interface Props {
  initialColors: ArchiveColor[];
}

export default function ColorManager({ initialColors }: Props) {
  const [colors, setColors] = useState<ArchiveColor[]>(initialColors);
  const [newName, setNewName] = useState("");
  const [newRgb, setNewRgb] = useState("#");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editRgb, setEditRgb] = useState("");

  async function handleAdd(e: Event) {
    e.preventDefault();
    if (!newName.trim() || !newRgb.trim()) return;
    const formData = new FormData();
    formData.set("action", "add");
    formData.set("name", newName.trim());
    formData.set("rgb", newRgb.trim());
    const res = await fetch("/api/colors", { method: "POST", body: formData });
    const json = await res.json();
    if (json.success) {
      updateFeedback(json.message, "info");
      setNewName("");
      setNewRgb("#");
      const updated = await fetch("/api/colors").then((r) => r.json());
      setColors(updated);
    } else {
      updateFeedback(json.message, "error");
    }
  }

  function startEdit(color: ArchiveColor) {
    setEditingId(color.id);
    setEditName(color.name);
    setEditRgb(color.rgb);
  }

  async function handleUpdate(id: number) {
    if (!editName.trim() || !editRgb.trim()) return;
    const formData = new FormData();
    formData.set("action", "update");
    formData.set("id", String(id));
    formData.set("name", editName.trim());
    formData.set("rgb", editRgb.trim());
    const res = await fetch("/api/colors", { method: "POST", body: formData });
    const json = await res.json();
    if (json.success) {
      updateFeedback(json.message, "info");
      setEditingId(null);
      const updated = await fetch("/api/colors").then((r) => r.json());
      setColors(updated);
    } else {
      updateFeedback(json.message, "error");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this color?")) return;
    const res = await fetch("/api/colors", { method: "DELETE", body: JSON.stringify({ id }), headers: { "Content-Type": "application/json" } });
    const json = await res.json();
    if (res.ok) {
      updateFeedback(json.message, "info");
      const updated = await fetch("/api/colors").then((r) => r.json());
      setColors(updated);
    } else {
      updateFeedback(json.message, "error");
    }
  }

  return (
    <div class="flex flex-col gap-8">
      {/* Add form */}
      <form onSubmit={handleAdd} class="bg-surface-container-low rounded-xl p-6 flex flex-col md:flex-row gap-4 items-end">
        <div class="flex-1 w-full">
          <label class="text-xs font-bold uppercase tracking-wider text-secondary">Name{" "}</label>
          <input type="text" value={newName} onInput={(e) => setNewName((e.target as HTMLInputElement).value)} placeholder="e.g. Bright Red" class="w-full bg-surface-container-high rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div class="w-auto md:w-40">
          <label class="text-xs font-bold uppercase tracking-wider text-secondary">RGB{" "}</label>
          <div class="flex gap-2 items-center">
            <input type="text" value={newRgb} onInput={(e) => setNewRgb((e.target as HTMLInputElement).value)} placeholder="#FFFFFF" class="flex-1 bg-surface-container-high rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary font-mono" />
            <input type="color" value={newRgb} onInput={(e) => setNewRgb((e.target as HTMLInputElement).value)} class="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0" />
          </div>
        </div>
        <button type="submit" class="h-10 bg-primary-container text-primary-container-contrast font-bold px-6 py-2.5 rounded-lg hover:bg-[#f5d140] whitespace-nowrap">Add Color</button>
      </form>

      {/* Color table */}
      <div class="bg-surface-container-low rounded-xl overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-secondary text-xs uppercase tracking-wider border-b border-outline-variant/20">
                <th class="text-left px-6 py-4 font-bold w-16">Swatch</th>
                <th class="text-left px-6 py-4 font-bold">Name</th>
                <th class="text-left px-6 py-4 font-bold">RGB</th>
                <th class="text-center px-6 py-4 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {colors.map((color) => (
                <tr key={color.id} class="border-b border-outline-variant/10 hover:bg-surface-container-high transition-colors">
                  {editingId === color.id ? (
                    <>
                      <td class="px-6 py-3">
                        <input type="color" value={editRgb} onInput={(e) => setEditRgb((e.target as HTMLInputElement).value)} class="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0" />
                      </td>
                      <td class="px-6 py-3">
                        <input type="text" value={editName} onInput={(e) => setEditName((e.target as HTMLInputElement).value)} class="w-full bg-surface-container-high rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary" />
                      </td>
                      <td class="px-6 py-3">
                        <input type="text" value={editRgb} onInput={(e) => setEditRgb((e.target as HTMLInputElement).value)} class="w-full bg-surface-container-high rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary font-mono" />
                      </td>
                      <td class="px-6 py-3 text-right">
                        <div class="flex gap-2 justify-end">
                          <button onClick={() => handleUpdate(color.id)} class="bg-primary text-primary-contrast font-bold px-4 py-1.5 rounded-lg text-xs uppercase tracking-wider">Save</button>
                          <button onClick={() => setEditingId(null)} class="bg-surface-container-high text-secondary px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider">Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td class="px-6 py-3">
                        <div class="rounded-lg shadow-sm border border-outline-variant/20 shrink-0" style={{ width: "2rem", height: "2rem", backgroundColor: color.rgb }}></div>
                      </td>
                      <td class="px-6 py-3 font-semibold">{color.name}</td>
                      <td class="px-6 py-3 font-mono text-secondary">{color.rgb}</td>
                      <td class="px-6 py-3 text-center w-fit">
                        <div class="flex gap-2 justify-center">
                          <button onClick={() => startEdit(color)} class="bg-box text-contrast px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider">Edit</button>
                          <button onClick={() => handleDelete(color.id)} class="bg-error-container text-on-error-container px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider">Delete</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {colors.length === 0 && (
                <tr>
                  <td colspan="4" class="text-center text-secondary py-12">No colors found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
