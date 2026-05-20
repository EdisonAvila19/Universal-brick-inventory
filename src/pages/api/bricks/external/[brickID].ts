import { getColors } from '@lib/inventoryStore'
import { fetchRebrickablePart, fetchRebrickablePartColors } from "@lib/rebrickable";

export async function GET({ params }: { params: { brickID: string } }) {
  const { brickID } = params;
  
  try {
    const brickData = await fetchRebrickablePart(brickID);
    
    if (!brickData) {
      throw new Error(`No data found for part number ${brickID}`);
    }

    const brickColors = await fetchRebrickablePartColors(brickID);

    if (!brickColors || brickColors.length === 0) {
      throw new Error(`No colors found for part number ${brickID}`);
    }

    const dbColors = await getColors();

    if (!dbColors || dbColors.length === 0) {
      throw new Error(`No colors found in local database.`);
    }

    const enrichedColors = brickColors.map((colorData) => {
      const localColor = dbColors.find((c) => c.id === colorData.color_id);
      const rgb = localColor ? localColor.rgb : colorData.colorRgb || null;
      return {
        ...colorData,
        colorRgb: rgb
      };
    });

    const externalPartData = {
      info: brickData,
      colors: enrichedColors
    }

    return new Response(JSON.stringify(externalPartData), {
      headers: { 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error(`Error fetching part details for ${brickID}:`, error);
    return new Response(JSON.stringify({ error: "No Part matches the given query." }), {
      status: 404
    });
  }
}