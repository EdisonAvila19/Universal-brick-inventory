import { useState } from "preact/hooks";
import type { Category } from "@/types/archiveData";
import { updateFeedback } from "@stores/feedback";

interface Props {
  initialCategories: Category[];
}

export default function CategoryManager({ initialCategories }: Readonly<Props>) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  async function refresh() {
    const res = await fetch("/api/categories");
    if (res.ok) {
      const { categories: updated } = await res.json();
      setCategories(updated);
    }
  }

  async function handleAdd(e: Event) {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", name: newName.trim() })
    });
    const json = await res.json();
    if (res.ok) {
      updateFeedback("Category created", "info");
      setNewName("");
      await refresh();
    } else {
      updateFeedback(json.error ?? "Failed to create category", "error");
    }
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditName(cat.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
  }

  async function handleUpdate(id: number) {
    if (!editName.trim()) return;
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", id, name: editName.trim() })
    });
    const json = await res.json();
    if (res.ok) {
      updateFeedback("Category updated", "info");
      setEditingId(null);
      await refresh();
    } else {
      updateFeedback(json.error ?? "Failed to update category", "error");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this category? It will be removed from all bricks.")) return;
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id })
    });
    const json = await res.json();
    if (res.ok) {
      updateFeedback("Category deleted", "info");
      await refresh();
    } else {
      updateFeedback(json.error ?? "Failed to delete category", "error");
    }
  }

  return (
    <div class="bg-surface-container-low rounded-xl overflow-hidden shadow-[0_0_13px_-6px] shadow-contrast">
      <form onSubmit={handleAdd} class="flex items-end gap-3 p-4 border-b border-outline-variant/20">
        <div class="flex-1">
          <label class="text-xs font-bold uppercase tracking-wider text-secondary block mb-1">New Category</label>
          <input
            type="text"
            value={newName}
            onInput={(e) => setNewName((e.target as HTMLInputElement).value)}
            placeholder="Enter category name"
            class="w-full bg-surface-container-high rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          type="submit"
          class="bg-primary-container text-primary-container-contrast font-bold px-6 py-2.5 rounded-lg hover:bg-[#f5d140] disabled:opacity-50 transition-colors text-sm whitespace-nowrap"
        >
          Add
        </button>
      </form>

      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="text-secondary text-xs uppercase tracking-wider border-b border-outline-variant/20">
              <th class="text-left px-4 py-3 font-bold">ID</th>
              <th class="text-left px-4 py-3 font-bold">Name</th>
              <th class="text-right px-4 py-3 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr
                key={cat.id}
                class="border-b border-outline-variant/10 hover:bg-surface-container-high transition-colors"
              >
                <td class="px-4 py-3 text-secondary font-mono text-xs">{cat.id}</td>
                <td class="px-4 py-3">
                  {editingId === cat.id ? (
                    <input
                      type="text"
                      value={editName}
                      onInput={(e) => setEditName((e.target as HTMLInputElement).value)}
                      class="w-full bg-surface-container-high rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary"
                      autoFocus
                    />
                  ) : (
                    <span class="font-medium">{cat.name}</span>
                  )}
                </td>
                <td class="px-4 py-3 text-right">
                  {editingId === cat.id ? (
                    <div class="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleUpdate(cat.id)}
                        class="text-xs font-bold uppercase tracking-wider text-primary hover:text-primary-container-contrast transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        class="text-xs font-bold uppercase tracking-wider text-secondary hover:text-on-surface transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div class="flex items-center justify-end gap-2">
                      <button
                        onClick={() => startEdit(cat)}
                        class="text-xs font-bold uppercase tracking-wider text-primary hover:text-primary-container-contrast transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        class="text-xs font-bold uppercase tracking-wider text-error hover:text-error-container transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colspan="3" class="text-center text-secondary py-12">
                  No categories yet. Add one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
