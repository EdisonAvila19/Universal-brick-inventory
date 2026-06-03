import type { BrickRecord, SpareBrickRecord, CatalogEntry } from "@/types/archiveData";
import type { RebrickablePartDetails, RebrickablePartColorDetails } from '@/types/rebrickable'

export const GetNewBricksForSet = async (setNumber: string): Promise<BrickRecord[]> => {
  try {
    const response = await fetch(`/api/bricks/set/${setNumber}`);
    if (!response.ok) throw new Error("Failed to fetch bricks for set " + setNumber);
    const bricks = await response.json();
    return bricks;
  } catch (error) {
    console.error("Error fetching bricks for set:", error);
    return [];
  }
}

export const UpdateBrickData = async (brick: BrickRecord, formData: FormData) => {
  try {
    const response = await fetch(`/api/bricks/${brick.brickId}`, {
      method: "PUT",
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to update brick data");
    }
    
    return { updated: true, reason: data.message || "Brick data updated successfully" };

  } catch (error) {
    console.error("Error updating brick data:", error);
    return { updated: false, reason: error instanceof Error ? error.message : "Unknown error" };
  }
}

export const DeleteBrick = async (brickId: string, setId:string) => {
  try {
    const response = await fetch(`/api/bricks/${brickId}`, {
      method: "DELETE",
      body: JSON.stringify({ setId }),
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to delete brick");
    }

    return { deleted: true, reason: data.message || "Brick deleted successfully" };

  } catch (error) {
    console.error("Error deleting brick:", error);
    return { deleted: false, reason: error instanceof Error ? error.message : "Unknown error" };
  }
}

export const UpdateBrickStock = async (setNumber: string, formData: FormData) => {
  try {
    const response = await fetch(`/api/bricks/set/${setNumber}`, {
      method: "POST",
      body: formData
    })

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to update brick stock");
    }

    return { updated: true, reason: data.message || "Brick stock updated successfully" };

  } catch (error) {
    console.error("Error updating brick stock:", error);
    return { updated: false, reason: error instanceof Error ? error.message : "Unknown error" };
  }
}

export const searchNewBrick = async (formData: FormData) : Promise<{ status: string, message?: string, data?: { info: RebrickablePartDetails,colors:RebrickablePartColorDetails[]} }> => {
  const reference = formData.get("reference");
  if (typeof reference !== "string" || !reference.trim()) {
    return ({ status: "error", message: "Invalid reference" });
  }
  try {
    const response = await fetch(`/api/bricks/external/${reference}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to search for the part");
    }
    
    const searchResult = await response.json();
    return ({ status: "ok", data: searchResult });

  } catch (error) {
    console.error("Error adding new brick:", error);
    if (error instanceof Error) {
      return ({ status: "error", message: error.message });
    } else {
      return ({ status: "error", message: String(error) });
    }
  }
}

export const addNewBrick = async (formData: FormData) : Promise<{ status: string, message?: string }> => {
  const element = formData.get("brickId") || formData.get("elementId");
  const brickID = typeof element === "string" ? element.trim() : "";

  try {
    if (!brickID) {
      throw new Error("Invalid brick ID");
    }

    const response = await fetch(`/api/bricks/${brickID}`, {
      method: "POST",
      body: formData
    });
    
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to add the brick");
    }

    return {status: "ok", message: "Brick added successfully"};
  } catch (error) {
    console.error("Error adding new brick:", error);
    return {status: "error", message: error instanceof Error ? error.message : "Failed to add the brick"};
  }
}

// --- Spare Parts API ---

export const fetchSpareBricks = async (): Promise<SpareBrickRecord[]> => {
  try {
    const response = await fetch("/api/bricks/spare");
    if (!response.ok) throw new Error("Failed to fetch spare bricks");
    const { spareBricks } = await response.json();
    return spareBricks;
  } catch (error) {
    console.error("Error fetching spare bricks:", error);
    return [];
  }
};

export const addSpareBrick = async (formData: FormData): Promise<{ status: string; message?: string }> => {
  try {
    const response = await fetch("/api/bricks/spare", {
      method: "POST",
      body: formData
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to add spare brick");
    return { status: "ok", message: "Spare brick added successfully" };
  } catch (error) {
    console.error("Error adding spare brick:", error);
    return { status: "error", message: error instanceof Error ? error.message : "Failed to add spare brick" };
  }
};

export const updateSpareBrick = async (brickId: string, formData: FormData): Promise<{ status: string; message?: string }> => {
  try {
    const response = await fetch(`/api/bricks/spare/${encodeURIComponent(brickId)}`, {
      method: "PUT",
      body: formData
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to update spare brick");
    return { status: "ok", message: "Spare brick updated successfully" };
  } catch (error) {
    console.error("Error updating spare brick:", error);
    return { status: "error", message: error instanceof Error ? error.message : "Failed to update spare brick" };
  }
};

export const deleteSpareBrick = async (brickId: string): Promise<{ status: string; message?: string }> => {
  try {
    const response = await fetch(`/api/bricks/spare/${encodeURIComponent(brickId)}`, {
      method: "DELETE"
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to delete spare brick");
    return { status: "ok", message: "Spare brick removed successfully" };
  } catch (error) {
    console.error("Error deleting spare brick:", error);
    return { status: "error", message: error instanceof Error ? error.message : "Failed to delete spare brick" };
  }
};

export const assignSpareToSet = async (formData: FormData): Promise<{ status: string; message?: string }> => {
  try {
    const response = await fetch("/api/bricks/spare/assign", {
      method: "POST",
      body: formData
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to assign spare to set");
    return { status: "ok", message: "Spare assigned to set successfully" };
  } catch (error) {
    console.error("Error assigning spare to set:", error);
    return { status: "error", message: error instanceof Error ? error.message : "Failed to assign spare to set" };
  }
};

// --- Brick Catalog API ---

export const getBrickCatalogEntry = async (reference: string): Promise<{ status: string; data?: CatalogEntry; message?: string }> => {
  try {
    const response = await fetch(`/api/brick-catalog/${encodeURIComponent(reference)}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch catalog entry");
    }
    const data = await response.json();
    return { status: "ok", data };
  } catch (error) {
    console.error("Error fetching catalog entry:", error);
    return { status: "error", message: error instanceof Error ? error.message : "Failed to fetch catalog entry" };
  }
};

export const updateBrickCatalogEntry = async (reference: string, body: {
  reference?: string;
  name?: string;
  variants?: Array<{
    originalBrickId: string;
    elementId?: string;
    colorId?: number;
    image?: string;
  }>;
}): Promise<{ status: string; message?: string; newReference?: string }> => {
  try {
    const response = await fetch(`/api/brick-catalog/${encodeURIComponent(reference)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to update catalog entry");
    return { status: "ok", message: "Catalog entry updated successfully", newReference: data.newReference };
  } catch (error) {
    console.error("Error updating catalog entry:", error);
    return { status: "error", message: error instanceof Error ? error.message : "Failed to update catalog entry" };
  }
};