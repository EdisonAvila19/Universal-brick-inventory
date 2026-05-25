import { addColor, updateColor, deleteColor, getColors, createColorGroup, deleteColorGroup, assignColorToGroup } from '@/lib/inventoryStore'

export async function GET() {
  try {
    const colors = await getColors();
    return new Response(JSON.stringify(colors), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('GET /api/colors error', error);
    return new Response(JSON.stringify({ message: "Internal Server Error" }), { status: 500 });
  }
}

export async function POST({ request }: { request: Request }) {
  try {
    const formData = await request.formData();
    const action = String(formData.get("action") ?? "");

    if (action === "add") {
      const name = String(formData.get("name") ?? "").trim();
      const rgb = String(formData.get("rgb") ?? "").trim();
      if (!name || !rgb) {
        return new Response(JSON.stringify({ success: false, message: "Name and RGB are required" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      const result = await addColor(name, rgb);
      if (!result.added) {
        const msg = result.reason === "duplicate-name" ? `Color "${name}" already exists.` : "Invalid data.";
        return new Response(JSON.stringify({ success: false, message: msg }), { status: 409, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ success: true, message: `Color "${name}" added.` }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (action === "update") {
      const id = Number(formData.get("id"));
      const name = String(formData.get("name") ?? "").trim();
      const rgb = String(formData.get("rgb") ?? "").trim();
      if (!id || !name || !rgb) {
        return new Response(JSON.stringify({ success: false, message: "ID, name and RGB are required" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      const result = await updateColor(id, name, rgb);
      if (!result.updated) {
        const msg = result.reason === "duplicate-name" ? `Color "${name}" already exists.` : "Color not found.";
        return new Response(JSON.stringify({ success: false, message: msg }), { status: 409, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ success: true, message: `Color "${name}" updated.` }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (action === "create-group") {
      const id = Number(formData.get("id"));
      if (!id) {
        return new Response(JSON.stringify({ success: false, message: "Color ID is required" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      const result = await createColorGroup(id);
      if (!result.created) {
        const msg = result.reason === "already-in-group" ? "This color is already in a group." : "Color not found.";
        return new Response(JSON.stringify({ success: false, message: msg }), { status: 409, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ success: true, message: "Color group created." }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (action === "delete-group") {
      const id = Number(formData.get("id"));
      if (!id) {
        return new Response(JSON.stringify({ success: false, message: "Color ID is required" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      const result = await deleteColorGroup(id);
      if (!result.deleted) {
        return new Response(JSON.stringify({ success: false, message: "Color is not a group leader." }), { status: 409, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ success: true, message: "Color group deleted." }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    if (action === "assign-group") {
      const id = Number(formData.get("id"));
      const groupId = Number(formData.get("groupId"));
      if (!id || !groupId) {
        return new Response(JSON.stringify({ success: false, message: "Color ID and Group ID are required" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      const result = await assignColorToGroup(id, groupId);
      if (!result.assigned) {
        const msg = result.reason === "not-a-group-leader" ? "Selected color is not a group leader." : "Color not found.";
        return new Response(JSON.stringify({ success: false, message: msg }), { status: 409, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ success: true, message: "Color assigned to group." }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: false, message: "Invalid action" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('POST /api/colors error', error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export async function DELETE({ request }: { request: Request }) {
  try {
    const { id } = await request.json();
    if (!id) {
      return new Response(JSON.stringify({ message: "ID is required" }), { status: 400 });
    }
    const result = await deleteColor(id);
    if (!result.deleted) {
      const msg = result.reason === "in-use" ? "Cannot delete color: it is used by existing bricks." : "Color not found.";
      return new Response(JSON.stringify({ message: msg }), { status: 409, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ message: "Color deleted." }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('DELETE /api/colors error', error);
    return new Response(JSON.stringify({ message: "Internal Server Error" }), { status: 500 });
  }
}
