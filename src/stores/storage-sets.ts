import { atom } from 'nanostores';
import type { SetRecord } from '@/types/archiveData';

export const $sets = atom<SetRecord[]>([]);
export const $filters = atom<{ brand: string }>({ brand: "" });
export const $filteredSets = atom<SetRecord[]>([]);

function filterSets() {
  const { brand } = $filters.get();
  const sets = $sets.get();
  if (!sets) return;
  const filtered = sets.filter((set) => brand === "all" || (brand === "lego" ? set.brand === "LEGO" : set.brand !== "LEGO"));
  $filteredSets.set(filtered);
}

// Set the current sets
export async function setSets(sets: SetRecord[]) {
  $sets.set(sets);
  filterSets();
}

// Get all sets
export async function fetchSets() {
  try {
    const response = await fetch('/api/sets');
    if (!response.ok) throw new Error("Failed to fetch sets");

    const sets = await response.json();
    
    $sets.set(sets);
    return ({ status: "ok", message: "Sets Updated" });
  } catch (error) {
    console.error("Error fetching sets:", error);
    return ({ status: "error", message: "Failed to fetch sets" })
  }
}

// Update one set
export async function updateSet (formData: FormData) {
  try {
    const response = await fetch(`/api/sets`, {
      method: "POST",
      body: formData
    });

    const payload = await response.json();
    if (!response.ok) throw new Error(payload.message || "Failed to update stock");

    const { status, message } = await fetchSets();
    if (status === "error") {
      throw new Error(message);
    } else {
      return ({ status: "ok", message: "Set stock updated successfully!" });
    }
  } catch (error) {
    console.error("Error updating sets:", error);
    if (error instanceof Error) {
      return ({ status: "error", message: error.message });
    } else {
      return ({ status: "error", message: String(error) });
    }
  }
}

// Delete one set
export async function deleteSet (setNumber: string) {
  try {
    const response = await fetch(`/api/sets`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ setNumber })
    });

    const payload = await response.json();
    
    if (!response.ok) throw new Error(payload.message || "Failed to delete set");

    const { status, message } = await fetchSets();
    
    if (status === "error") {
      throw new Error(message);
    } else {
      return ({ status: "ok", message: "Set deleted successfully!" });
    }
  } catch (error) {
    console.error("Error deleting sets:", error);
    if (error instanceof Error) {
      return ({ status: "error", message: error.message });
    } else {
      return ({ status: "error", message: String(error) });
    }
  }
}

// Update set filters
export async function setFilters(filters: { brand: string }) {
  $filters.set(filters);
  filterSets();
}
