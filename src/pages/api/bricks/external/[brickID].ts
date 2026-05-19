import { fetchRebrickablePart, fetchRebrickablePartColors } from "@lib/rebrickable";

export async function GET({ params }: { params: { brickID: string } }) {
  const { brickID } = params;
  
  try {
    const brickData = await fetchRebrickablePart(brickID);
    
    if (!brickData) {
      throw new Error(`No data found for part number ${brickID}`);
    }

    return new Response(JSON.stringify(brickData), {
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error(`Error fetching part details for ${brickID}:`, error);
    return new Response(JSON.stringify({ error: "No Part matches the given query." }), {
      status: 404
    });
  }
}