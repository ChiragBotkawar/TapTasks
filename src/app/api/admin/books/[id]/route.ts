import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/admin/books/[id]">
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));

  const updates: Record<string, string | null> = {};
  for (const key of ["title", "author", "description", "amazon_link", "status"] as const) {
    if (key in body) updates[key] = String(body[key] ?? "").trim();
  }

  if ("status" in updates && updates.status !== "active" && updates.status !== "disabled") {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  }

  if ("title" in updates && !updates.title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  if ("amazon_link" in updates) {
    const link = updates.amazon_link ?? "";
    if (link && !/^https?:\/\/.+\..+/.test(link)) {
      return NextResponse.json(
        { error: "Amazon link must be a valid URL starting with http:// or https://" },
        { status: 400 }
      );
    }
    updates.amazon_link = link || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  const { error } = await admin.supabase
    .from("books")
    .update(updates)
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/admin/books/[id]">
) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  const { data: book } = await admin.supabase
    .from("books")
    .select("storage_path, cover")
    .eq("id", id)
    .maybeSingle();

  if (!book) {
    return NextResponse.json({ error: "Book not found." }, { status: 404 });
  }

  const paths = [book.storage_path, book.cover].filter(Boolean) as string[];
  if (paths.length > 0) {
    const { error: storageError } = await admin.supabase.storage
      .from("books")
      .remove(paths);
    if (storageError) {
      console.error("Failed to remove storage files", storageError);
    }
  }

  const { error } = await admin.supabase.from("books").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}