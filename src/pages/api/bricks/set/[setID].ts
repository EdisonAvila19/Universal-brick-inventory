import { getInventoryBricksSet } from '@/lib/inventoryStore'
import { updateBrickStock } from '@lib/inventoryStore'

export async function GET({ params, request }: { params: { setID: string }, request: Request }) {
  const setID = params.setID;
  
  if (!setID) {
    return new Response("Set ID is required", { status: 400 });
  }

  try {
    const response = await getInventoryBricksSet(setID);
    if (!response) throw new Error("Failed to fetch bricks for set " + setID);

    return new Response(JSON.stringify(response), {
      status: 200
    });
  }
  catch (error) {
    console.error("Error fetching bricks for set:", error);
    return new Response("Error fetching bricks for set", { status: 500 });
  }
}

export async function POST({ params, request }: { params: { setID: string }, request: Request }) {
  const setID = params.setID;
  if (!setID) {
    return new Response(JSON.stringify({ message: "Set ID is required" }), { status: 400 });
  }

  try {
    const formData = await request.formData();
    const action = formData.get("action");

    
    if (action === "update-brick") {
      // Handle updating an existing brick in the set
      const { brickId, fromSet, stock } = {
        brickId: formData.get("brickId") as string,
        fromSet: setID,
        stock: Number(formData.get("stock"))
      }
      const response = await updateBrickStock({ brickId, fromSet, stock })

      if (!response.updated) {
        throw new Error( "Failed to update brick stock");
      }

      return new Response(JSON.stringify({ message: "Brick stock updated successfully" }), { status: 200 });
    } else {
      throw new Error("Invalid action specified");
    }

  } catch (error) {
    console.error("Error processing form data:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ message }), { status: 400 });
  }
}