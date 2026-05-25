import { useState, useRef, useEffect } from "preact/hooks";
import type { ArchiveColor } from "@/types/archiveData";
import { updateFeedback } from "@stores/feedback";
import ColorMultiSelect from "./ColorMultiSelect";

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
  const [filterIds, setFilterIds] = useState<string[]>([]);

  const groupLeaders = colors.filter(
    (c) => c.colorGroupId != null && c.id === c.colorGroupId
  );

  async function refreshColors() {
    const updated = await fetch("/api/colors").then((r) => r.json());
    setColors(updated);
  }

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
      await refreshColors();
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
      await refreshColors();
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
      await refreshColors();
    } else {
      updateFeedback(json.message, "error");
    }
  }

  async function handleCreateGroup(colorId: number) {
    const formData = new FormData();
    formData.set("action", "create-group");
    formData.set("id", String(colorId));
    const res = await fetch("/api/colors", { method: "POST", body: formData });
    const json = await res.json();
    if (json.success) {
      updateFeedback(json.message, "info");
      await refreshColors();
    } else {
      updateFeedback(json.message, "error");
    }
  }

  async function handleDeleteGroup(colorId: number) {
    const formData = new FormData();
    formData.set("action", "delete-group");
    formData.set("id", String(colorId));
    const res = await fetch("/api/colors", { method: "POST", body: formData });
    const json = await res.json();
    if (json.success) {
      updateFeedback(json.message, "info");
      await refreshColors();
    } else {
      updateFeedback(json.message, "error");
    }
  }

  async function handleAssignGroup(colorId: number, groupId: number) {
    if (!groupId) return;
    const formData = new FormData();
    formData.set("action", "assign-group");
    formData.set("id", String(colorId));
    formData.set("groupId", String(groupId));
    const res = await fetch("/api/colors", { method: "POST", body: formData });
    const json = await res.json();
    if (json.success) {
      updateFeedback(json.message, "info");
      await refreshColors();
    } else {
      updateFeedback(json.message, "error");
    }
  }

  function getGroupLeader(id: number): ArchiveColor | undefined {
    return colors.find((c) => c.id === id);
  }

  function GroupSelect({ colorId }: { colorId: number }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      function handleClickOutside(e: MouseEvent) {
        if (ref.current && !ref.current.contains(e.target as Node)) {
          setOpen(false);
        }
      }
      if (open) document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    return (
      <div class="relative" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          class="flex items-center gap-1.5 bg-surface-container-high rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-primary cursor-pointer whitespace-nowrap"
        >
          <span class="text-secondary font-medium">Assign...</span>
          <svg class="w-3 h-3 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
        {open && (
          <div class="absolute top-full left-0 mt-1 bg-surface-container-high rounded-lg shadow-xl z-20 min-w-[160px] py-1 border border-outline-variant/20">
            {groupLeaders.map((leader) => (
              <button
                key={leader.id}
                onClick={() => {
                  handleAssignGroup(colorId, leader.id);
                  setOpen(false);
                }}
                class="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-surface-container text-left"
              >
                <div
                  class="w-3.5 h-3.5 rounded-full border border-outline-variant/30 shrink-0"
                  style={{ backgroundColor: leader.rgb }}
                ></div>
                <span class="font-medium">{leader.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const displayColors = filterIds.length > 0
    ? colors.filter((c) => filterIds.includes(String(c.id)))
    : colors;

  return (
    <div class="flex flex-col gap-8">
      {/* Add form */}
      <form onSubmit={handleAdd} class="bg-surface-container-low rounded-xl p-6 flex flex-col md:flex-row gap-4 items-end shadow-[0_0_13px_-6px] shadow-contrast">
        <div class="flex-1 w-full">
          <label class="text-xs font-bold uppercase tracking-wider text-secondary">Name{" "}</label>
          <input type="text" value={newName} onInput={(e) => setNewName((e.target as HTMLInputElement).value)} placeholder="e.g. Bright Red" class="w-full bg-surface-container-high rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <div class="w-auto">
          <label class="text-xs font-bold uppercase tracking-wider text-secondary">RGB{" "}</label>
          <div class="flex gap-2 items-center">
            <input type="text" value={newRgb} onInput={(e) => setNewRgb((e.target as HTMLInputElement).value)} placeholder="#FFFFFF" class="flex-1 bg-surface-container-high rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary font-mono" />
            <input type="color" value={newRgb} onInput={(e) => setNewRgb((e.target as HTMLInputElement).value)} class="w-10 h-10 rounded cursor-pointer bg-transparent border-0 p-0" />
          </div>
        </div>
        <button type="submit" class="h-10 bg-primary-container text-primary-container-contrast font-bold px-6 py-2.5 rounded-lg hover:bg-[#f5d140] whitespace-nowrap">Add Color</button>
      </form>

      {/* Color filter */}
      <div class="flex items-center gap-4">
        <div class="w-72">
          <ColorMultiSelect
            colors={colors}
            selected={filterIds}
            onChange={setFilterIds}
            placeholder="Filter colors..."
            allLabel="All Colors"
          />
        </div>
        {filterIds.length > 0 && (
          <p class="text-xs text-secondary font-medium">
            Showing {displayColors.length} of {colors.length}
          </p>
        )}
      </div>

      {/* Color table */}
      <div class="bg-surface-container-low rounded-xl overflow-hidden shadow-[0_0_13px_-6px] shadow-contrast">
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-secondary text-xs uppercase tracking-wider border-b border-outline-variant/20">
                <th class="text-left px-6 py-4 font-bold w-16">Swatch</th>
                <th class="text-left px-6 py-4 font-bold">Name</th>
                <th class="text-left px-6 py-4 font-bold">RGB</th>
                <th class="text-left px-6 py-4 font-bold min-w-[200px]">Color Group</th>
                <th class="text-center px-6 py-4 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayColors.map((color) => {
                const isGroupLeader = color.colorGroupId != null && color.id === color.colorGroupId;
                const belongsToGroup = color.colorGroupId != null && color.id !== color.colorGroupId;
                const hasNoGroup = color.colorGroupId == null;

                return (
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
                        <td class="px-6 py-3 text-secondary text-xs italic">Save to edit group</td>
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
                        <td class="px-6 py-3">
                          {isGroupLeader && (
                            <div class="flex items-center gap-2 flex-wrap">
                              <div class="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-bold py-1 rounded-full">
                                <div class="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color.rgb }}></div>
                                <span>Main: {color.name}</span>
                              </div>
                              
                            </div>
                          )}
                          {belongsToGroup && (() => {
                            const leader = getGroupLeader(color.colorGroupId!);
                            return (
                              <div class="flex items-center gap-1.5 text-xs text-secondary">
                                <div class="w-3 h-3 rounded-full shrink-0 border border-outline-variant/30" style={{ backgroundColor: leader?.rgb ?? "#ccc" }}></div>
                                <span>{leader?.name ?? "Unknown"}</span>
                              </div>
                            );
                          })()}
                          {hasNoGroup && groupLeaders.length > 0 && (
                            <div class="flex items-center gap-2">
                              <GroupSelect colorId={color.id} />
                            </div>
                          )}
                          {hasNoGroup && groupLeaders.length === 0 && (
                            <div class="flex items-center gap-2">
                              <span class="text-secondary text-xs italic">No groups</span>
                            </div>
                          )}
                        </td>
                        <td class="px-6 py-3 text-center w-fit">
                          <div class="flex gap-2 justify-center">
                            { isGroupLeader &&
                              <button onClick={() => handleDeleteGroup(color.id)} class="bg-error-container text-on-error-container px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">Delete Group</button>
                            }
                            {
                              hasNoGroup && groupLeaders.length === 0 &&
                              <button onClick={() => handleCreateGroup(color.id)} class="bg-tertiary-container text-on-tertiary-container px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0">Create Group</button>
                            }
                            
                            <button onClick={() => startEdit(color)} class="bg-box text-contrast px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider">Edit</button>
                            <button onClick={() => handleDelete(color.id)} class="bg-error-container text-on-error-container px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider">Delete</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
              {colors.length === 0 && (
                <tr>
                  <td colspan="5" class="text-center text-secondary py-12">No colors found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
