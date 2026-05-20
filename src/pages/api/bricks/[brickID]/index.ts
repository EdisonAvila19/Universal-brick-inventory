import { addBrickToSet, removeBrickFromSet, updateBrickInSet } from '@lib/inventoryStore'

// Add new External Brick
export async function POST({ request }: { request: Request }) {
  const body = await request.formData();
  
  const newBrick = {
    fromSet: (()=> {
      const v = body.get("setNumber");
      return typeof v === "string" ? v.trim() : "";
    })(),
    elementId: (() => {
      const v = body.get("elementId");
      return typeof v === "string" ? v.trim() : "";
    })(),
    reference: (() => {
      const v = body.get("reference");
      return typeof v === "string" ? v.trim() : "";
    })(),
    name: (() => {
      const v = body.get("name");
      return typeof v === "string" ? v.trim() : "";
    })(),
    colorId: (() => {
      const v = body.get("colorId");
      return typeof v === "string" ? Number(v) : 0;
    })(),
    image: (() => {
      const v = body.get("image");
      return typeof v === "string" ? v.trim() : "";
    })(),
    required: (() => {
      const v = body.get("required");
      return typeof v === "string" ? Number(v) : 0;
    })(),
    stock: (() => {
      const v = body.get("stock");
      return typeof v === "string" ? Number(v) : 0;
    })()
  };

  const response = await addBrickToSet(newBrick);

  if (!response.added) {
    console.error("Failed to add brick:", response.reason);
    return new Response(JSON.stringify({ ok: false, error: response.reason }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

// Update existing Brick
export async function PUT({ params, request }: { params: { brickID: string }, request: Request }) {
  
  const brickID = params.brickID;
  if (!brickID) {
    return new Response("Brick ID is required", { status: 400 });
  }
  const brickDataRaw = await request.formData();
  const action = (() => {
    const v = brickDataRaw.get("action");
    return typeof v === "string" ? v.trim() : "";
  })()

  const brickData = {
    action: (() => {
      const v = brickDataRaw.get("action");
      return typeof v === "string" ? v.trim() : "";
    })(),
    setNumber: (() => {
      const v = brickDataRaw.get("setNumber");
      return typeof v === "string" ? v.trim() : "";
    })(),
    originalElementId: (() => {
      const v = brickDataRaw.get("originalElementId");
      return typeof v === "string" ? v.trim() : "";
    })(),
    elementId: (() => {
      const v = brickDataRaw.get("elementId");
      return typeof v === "string" ? v.trim() : "";
    })(),
    reference: (() => {
      const v = brickDataRaw.get("reference");
      return typeof v === "string" ? v.trim() : "";
    })(),
    name: (() => {
      const v = brickDataRaw.get("name");
      return typeof v === "string" ? v.trim() : "";
    })(),
    color: (() => {
      const v = brickDataRaw.get("color");
      return typeof v === "string" ? v.trim() : "";
    })(),
    colorHex: (() => {
      const v = brickDataRaw.get("colorHex");
      return typeof v === "string" ? v.trim() : "";
    })(),
    image: (() => {
      const v = brickDataRaw.get("image");
      return typeof v === "string" ? v.trim() : "";
    })(),
    required: (() => {
      const v = brickDataRaw.get("required");
      return typeof v === "string" ? Number(v) : 0;
    })(),
    stock: (() => {
      const v = brickDataRaw.get("stock");
      return typeof v === "string" ? Number(v) : 0;
    })()
  };

  if (!action) {
    return new Response("Action is required", { status: 400 });
  }

  if (action === "update-brick") {
    const result = await updateBrickInSet({
      fromSet: brickData.setNumber,
      originalElementId: brickData.originalElementId,
      elementId: brickData.elementId,
      reference: brickData.reference,
      name: brickData.name,
      colorId: Number(brickData.color),
      image: brickData.image,
      required: Number(brickData.required),
      stock: Number(brickData.stock)
    });

    if (!result.updated) {
      return new Response(JSON.stringify({ message: `Failed to update brick: ${result.reason || "unknown error"}`}), {
        status: 400
      });
    }

    return new Response(JSON.stringify({ message: `Received update for brick ${brickID}.`}), {
      status: 200
    })
  }
}

// Delete Brick from Set
export async function DELETE({ params, request }: { params: { brickID: string }, request: Request }) {
  const brickID = params.brickID;
  const setId = await request.json().then(data => {
    if (typeof data.setId === "string") {
      return data.setId.trim();
    }
  });

  if (!brickID) {
    return new Response(JSON.stringify({ message: `Brick ID is required`}), { status: 400 });
  }
  
  const result = await removeBrickFromSet({
    fromSet: setId,
    elementId: brickID
  });

  if (!result.removed) {
    return new Response(JSON.stringify({ message: `Failed to delete brick`}), {
      status: 400
    });
  }

  return new Response(JSON.stringify({ message: `Received delete for brick ${brickID}.`}), {
    status: 200
  });
}