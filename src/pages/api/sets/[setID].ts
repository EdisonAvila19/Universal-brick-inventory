import {updateSetInInventory } from "@lib/inventoryStore";
import type { Brand } from "@/types/archiveData";

// Update set details in db
export async function POST({ request }: { request: Request }) {
  const setID = new URL(request.url).pathname.split("/").pop();

  try {
    const formDataRaw = await request.formData();

    const action = formDataRaw.get("action");
    
    if (action === "update-info") {
      const formData = {
        originalSetNumber: (() => {
          const v = formDataRaw.get("originalSetNumber");
          return typeof v === "string" ? v.trim() : "";
        })(),
        setNumber: (() => {
          const v = formDataRaw.get("setNumber");
          return typeof v === "string" ? v.trim() : "";
        })(),
        name: (() => {
          const v = formDataRaw.get("name");
          return typeof v === "string" ? v.trim() : "";
        })(),
        brand: (() => {
          const v = formDataRaw.get("brand");
          return typeof v === "string" ? v.trim() : "Other";
        })() as Brand,
        totalPieces: Number(formDataRaw.get("totalPieces") ?? 0),
        image: (() => {
          const v = formDataRaw.get("image");
          return typeof v === "string" ? v.trim() : "";
        })(),
        homologatedToLego: formDataRaw.get("homologatedToLego") === "on"
      }
  
      const result = await updateSetInInventory(formData);
  
      if (result.updated) {
        return new Response(JSON.stringify({ message: `Set ${setID} updated successfully.`}), {
          headers: { 'Content-Type': 'application/json' },
          status: 200
        });
      } else {
        return new Response(JSON.stringify({ message: "Could not update set." }), { status: 500 });
      }
    } else if (action === "update-bricks") {
      // Handle brick updates here (not implemented in this snippet)  
    } else {
      return new Response("Invalid action", { status: 400 });
    }

  } catch (error) {
    console.error("Error processing form data:", error);
    return new Response("Failed to process form data", { status: 400 });
  }
}