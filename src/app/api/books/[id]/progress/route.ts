import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/books/[id]/progress">
) {
  const { id } = await ctx.params;
  const { current_page } = await request.json().catch(() => ({}));

  const page = Number(current_page);
  if (!Number.isInteger(page) || page < 1) {
    return NextResponse.json({ error: "Invalid page." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: book } = await supabase
    .from("books")
    .select("status")
    .eq("id", id)
    .maybeSingle();

  if (!book || book.status !== "active") {
    return NextResponse.json({ error: "Book not available." }, { status: 404 });
  }

  const { error } = await supabase.from("reading_progress").upsert(
    {
      user_id: user.id,
      book_id: id,
      current_page: page,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,book_id" }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}