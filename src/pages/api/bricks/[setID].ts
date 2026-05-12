import { getInventoryBricksSet } from '@/lib/inventoryStore'

export async function GET({ request }: { request: Request }) {
  const setID = new URL(request.url).pathname.split("/").pop();
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