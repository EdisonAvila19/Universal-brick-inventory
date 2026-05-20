import type { BrickRecord } from "@/types/archiveData";
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
    const response = await fetch(`/api/bricks/${brick.elementId}`, {
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
  const element = formData.get("elementId");
  const brickID = typeof element === "string" ? element.trim() : "";

  try {
    if (!brickID) {
      throw new Error("Invalid element ID");
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