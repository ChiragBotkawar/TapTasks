import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/books/[id]/cover">
) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data: book } = await supabase
    .from("books")
    .select("cover, status")
    .eq("id", id)
    .maybeSingle();

  if (!book?.cover) {
    return new NextResponse("Not found", { status: 404 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = profile?.role === "admin";
  if (book.status !== "active" && !isAdmin) {
    return new NextResponse("Not available", { status: 403 });
  }

  const { data: file, error } = await supabase.storage
    .from("books")
    .download(book.cover);

  if (error || !file) {
    console.error("Failed to download cover", error);
    return new NextResponse("Not found", { status: 404 });
  }

  return new NextResponse(file, {
    status: 200,
    headers: {
      "Content-Type": file.type || "image/jpeg",
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}