import { getBricksCatalog } from '@/lib/inventoryStore'

// Get Bricks
export async function GET({ request, }: { request: Request }) {
  try {
    const bricks = await getBricksCatalog();
  
    return new Response(JSON.stringify({ bricks }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error fetching bricks catalog:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch bricks catalog" }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}