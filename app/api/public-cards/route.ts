import { getRequestUser } from "@/app/auth";
import { getPublicCards, removePublicCard, savePublicCard } from "@/db/public-cards";

function validSlot(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 9;
}

export async function GET() {
  try {
    return Response.json({ cards: await getPublicCards() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to load public cards", error);
    return Response.json({ cards: [], error: "Public cards are unavailable" }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  if (!await getRequestUser(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json() as Record<string, unknown>;
    if (!validSlot(body.slot)) return Response.json({ error: "Invalid card slot" }, { status: 400 });
    if (typeof body.title !== "string" || !body.title.trim() || body.title.trim().length > 80) {
      return Response.json({ error: "Title must be 1–80 characters" }, { status: 400 });
    }
    if (typeof body.description !== "string" || body.description.trim().length > 280) {
      return Response.json({ error: "Description must be 280 characters or fewer" }, { status: 400 });
    }
    if (typeof body.techStack !== "string" || body.techStack.trim().length > 200) {
      return Response.json({ error: "Tech stack must be 200 characters or fewer" }, { status: 400 });
    }
    if (body.iconData !== null && body.iconData !== undefined && (typeof body.iconData !== "string" || body.iconData.length > 350000 || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(body.iconData))) {
      return Response.json({ error: "Icon must be a PNG, JPEG, or WebP image under 256 KB" }, { status: 400 });
    }
    if (typeof body.url !== "string" || body.url.length > 2048) {
      return Response.json({ error: "Enter a valid URL" }, { status: 400 });
    }

    let normalizedUrl: string;
    try {
      const parsed = new URL(body.url.trim());
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error("Unsupported protocol");
      normalizedUrl = parsed.toString();
    } catch {
      return Response.json({ error: "URL must start with http:// or https://" }, { status: 400 });
    }

    const techStack = [...new Set(body.techStack.split(",").map((tag) => tag.trim()).filter(Boolean))].join(", ");
    const card = {
      slot: body.slot,
      title: body.title.trim(),
      description: body.description.trim(),
      url: normalizedUrl,
      techStack,
      iconData: typeof body.iconData === "string" ? body.iconData : null,
    };
    await savePublicCard(card);
    return Response.json({ card });
  } catch (error) {
    console.error("Unable to save public card", error);
    return Response.json({ error: "Public card could not be saved" }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  if (!await getRequestUser(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json() as { slot?: unknown };
    if (!validSlot(body.slot)) return Response.json({ error: "Invalid card slot" }, { status: 400 });
    await removePublicCard(body.slot);
    return Response.json({ slot: body.slot, deleted: true });
  } catch (error) {
    console.error("Unable to remove public card", error);
    return Response.json({ error: "Public card could not be removed" }, { status: 503 });
  }
}
