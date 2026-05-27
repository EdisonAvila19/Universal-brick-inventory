import { useEffect, useRef, useState } from "preact/hooks";
import type { DesignGroup, DesignGroupMember } from "@/types/archiveData";

export default function DesignGroupManager() {
  const [groups, setGroups] = useState<DesignGroup[]>([]);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "info" | "error" } | null>(null);
  const [searchQueries, setSearchQueries] = useState<Record<number, string>>({});
  const [searchResults, setSearchResults] = useState<Record<number, DesignGroupMember[]>>({});
  const [searching, setSearching] = useState<Record<number, boolean>>({});
  const searchTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const showMessage = (text: string, type: "info" | "error") => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch("/api/design-groups");
      const data = await res.json();
      setGroups(data.groups ?? []);
    } catch {
      showMessage("Failed to load design groups", "error");
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/design-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create" })
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage(data.error ?? "Failed to create group", "error");
      } else {
        showMessage("New group created", "info");
        await fetchGroups();
      }
    } catch {
      showMessage("Failed to create group", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (groupId: number) => {
    if (!confirm(`Delete this group? Bricks will be unassigned.`)) return;
    try {
      const res = await fetch("/api/design-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", groupId })
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage(data.error ?? "Failed to delete group", "error");
      } else {
        showMessage(`Group deleted`, "info");
        await fetchGroups();
      }
    } catch {
      showMessage("Failed to delete group", "error");
    }
  };

  const handleSearchInput = (groupId: number, value: string) => {
    setSearchQueries(prev => ({ ...prev, [groupId]: value }));
    if (searchTimers.current[groupId]) {
      clearTimeout(searchTimers.current[groupId]);
    }
    if (value.trim().length < 2) {
      setSearchResults(prev => ({ ...prev, [groupId]: [] }));
      return;
    }
    setSearching(prev => ({ ...prev, [groupId]: true }));
    searchTimers.current[groupId] = setTimeout(async () => {
      try {
        const res = await fetch("/api/design-groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "search", query: value.trim() })
        });
        const data = await res.json();
        setSearchResults(prev => ({ ...prev, [groupId]: data.references ?? [] }));
      } catch {
        setSearchResults(prev => ({ ...prev, [groupId]: [] }));
      } finally {
        setSearching(prev => ({ ...prev, [groupId]: false }));
      }
    }, 250);
  };

  const handleAssign = async (reference: string, groupId: number) => {
    try {
      const res = await fetch("/api/design-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "assign", reference, groupId })
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage(data.error ?? "Failed to assign reference", "error");
      } else {
        setSearchQueries(prev => ({ ...prev, [groupId]: "" }));
        setSearchResults(prev => ({ ...prev, [groupId]: [] }));
        showMessage("Reference added to group", "info");
        await fetchGroups();
      }
    } catch {
      showMessage("Failed to assign reference", "error");
    }
  };

  const handleUnassign = async (reference: string) => {
    try {
      const res = await fetch("/api/design-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unassign", reference })
      });
      const data = await res.json();
      if (!res.ok) {
        showMessage(data.error ?? "Failed to remove reference", "error");
      } else {
        showMessage("Reference removed from group", "info");
        await fetchGroups();
      }
    } catch {
      showMessage("Failed to remove reference", "error");
    }
  };

  return (
    <div class="space-y-8">
      {/* Feedback */}
      {message && (
        <div class={`rounded-xl p-4 text-sm font-bold ${
          message.type === "info"
            ? "bg-primary-container text-primary-container-contrast"
            : "bg-error-container text-on-error-container"
        }`}>
          {message.text}
        </div>
      )}

      {/* Create Group Button */}
      <section class="bg-surface-container-lowest rounded-xl p-6 shadow-[0_0_13px_-6px] shadow-contrast">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-black">Design Groups</h2>
          <button
            onClick={handleCreate}
            disabled={creating}
            class="bg-primary text-white px-6 py-2.5 rounded-lg font-bold text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {creating ? "Creating..." : "+ New Group"}
          </button>
        </div>
      </section>

      {/* Group List */}
      {groups.length === 0 ? (
        <section class="bg-surface-container-lowest rounded-xl p-12 text-center text-secondary">
          <h3 class="text-xl font-black mb-2">No design groups yet</h3>
          <p class="text-sm">Click "+ New Group" to create your first group.</p>
        </section>
      ) : (
        groups.map((group) => (
          <section key={group.id} class="bg-surface-container-lowest rounded-xl p-6 shadow-[0_0_13px_-6px] shadow-contrast">
            {/* Group Header */}
            <div class="flex items-center justify-between mb-4">
              <div>
                <h3 class="text-lg font-black">Group #{group.id}</h3>
                <p class="text-xs text-secondary font-bold">{group.bricks.length} reference{group.bricks.length !== 1 ? "s" : ""}</p>
              </div>
              <button
                onClick={() => handleDelete(group.id)}
                class="text-error text-xs font-bold uppercase tracking-widest hover:underline"
              >
                Delete Group
              </button>
            </div>

            {/* Search Bar */}
            <div class="relative mb-4">
              <input
                type="text"
                value={searchQueries[group.id] ?? ""}
                onInput={(e) => handleSearchInput(group.id, (e.target as HTMLInputElement).value)}
                placeholder="Search reference by name or reference..."
                class="w-full bg-surface-container-highest border-none rounded-lg px-4 py-2.5 text-sm font-bold text-on-surface placeholder:text-secondary/50"
              />
              {searching[group.id] && (
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-secondary">Searching...</span>
              )}
              {/* Search Results Dropdown */}
              {searchResults[group.id] && searchResults[group.id].length > 0 && (
                <div class="absolute z-10 w-full bg-surface-container-highest rounded-lg shadow-lg mt-1 max-h-72 overflow-y-auto">
                  {searchResults[group.id].map((ref) => (
                    <div key={ref.reference} class="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-container-low border-b border-surface-dim last:border-b-0">
                      <img
                        src={ref.image}
                        alt={ref.name}
                        class="w-10 h-10 rounded object-contain bg-surface-container-low p-1 shrink-0"
                        loading="lazy"
                      />
                      <div class="min-w-0 flex-1">
                        <p class="text-xs font-bold truncate">{ref.name}</p>
                        <p class="text-[11px] text-secondary">{ref.reference}</p>
                      </div>
                      <button
                        onClick={() => handleAssign(ref.reference, group.id)}
                        class="bg-primary text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider shrink-0 hover:bg-primary/90 transition-colors"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Member List */}
            {group.bricks.length > 0 ? (
              <div class="space-y-2">
                {group.bricks.map((ref) => (
                  <div key={ref.reference} class="flex items-center gap-3 bg-surface-container-high rounded-lg px-4 py-3">
                    <img
                      src={ref.image}
                      alt={ref.name}
                      class="w-12 h-12 rounded object-contain bg-surface-container-low p-1 shrink-0"
                      loading="lazy"
                    />
                    <div class="min-w-0 flex-1">
                      <p class="text-xs font-bold truncate">{ref.name}</p>
                      <p class="text-[11px] text-secondary">{ref.reference}</p>
                    </div>
                    <button
                      onClick={() => handleUnassign(ref.reference)}
                      class="text-error text-[10px] font-bold uppercase tracking-wider shrink-0 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p class="text-xs text-secondary italic">No references assigned yet. Use the search bar above to add references.</p>
            )}
          </section>
        ))
      )}
    </div>
  );
}
