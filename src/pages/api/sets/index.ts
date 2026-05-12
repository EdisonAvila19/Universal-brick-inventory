import { deleteSetFromInventory, getInventorySets } from '@/lib/inventoryStore'

export async function DELETE({ request }: { request: Request }) {
  const { setNumber } = await request.json();
  
  try {
    const result = await deleteSetFromInventory(setNumber);
    
    if (result.removed) {
      return new Response(JSON.stringify({ message: `Set ${setNumber} removed from inventory.`}), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } else {
      return new Response(JSON.stringify({ message: "Could not remove set." }), { status: 500 });
    }
  } catch (error) {
    console.error('DELETE /api/sets error removing set', setNumber, error);
    return new Response(JSON.stringify({ message: "Internal Server Error" }), { status: 500 });
  }
}

export async function GET({ request }: { request: Request }) {
  try {
    const sets = await getInventorySets();
    
    return new Response(JSON.stringify(sets), { status: 200 });
  } catch (error) {
    console.error('GET /api/sets error fetching sets', error);
    return new Response(JSON.stringify({ message: "Internal Server Error" }), { status: 500 });
  }
}