import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

const MAX_PDF_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_COVER_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: books, error } = await admin.supabase
    .from("books")
    .select("id, title, author, description, cover, storage_path, status, amazon_link, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ books });
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const form = await request.formData();
  const title = String(form.get("title") ?? "").trim();
  const author = String(form.get("author") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  const status = form.get("status") === "disabled" ? "disabled" : "active";
  const amazonLink = String(form.get("amazon_link") ?? "").trim();
  const pdf = form.get("pdf");
  const cover = form.get("cover");

  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  if (amazonLink && !/^https?:\/\/.+\..+/.test(amazonLink)) {
    return NextResponse.json(
      { error: "Amazon link must be a valid URL starting with http:// or https://" },
      { status: 400 }
    );
  }

  if (!(pdf instanceof File)) {
    return NextResponse.json({ error: "A PDF file is required." }, { status: 400 });
  }

  if (pdf.type !== "application/pdf" && !pdf.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF files are allowed." }, { status: 400 });
  }

  if (pdf.size > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "PDF is too large (max 100 MB)." }, { status: 400 });
  }

  const id = crypto.randomUUID();
  const storagePath = `books/${id}.pdf`;
  const { error: pdfUploadError } = await admin.supabase.storage
    .from("books")
    .upload(storagePath, pdf, { contentType: "application/pdf", upsert: false });

  if (pdfUploadError) {
    console.error("PDF upload failed", pdfUploadError);
    return NextResponse.json({ error: "Failed to upload PDF." }, { status: 500 });
  }

  let coverPath: string | null = null;
  if (cover instanceof File && cover.size > 0) {
    if (!ALLOWED_COVER_TYPES.includes(cover.type)) {
      return NextResponse.json({ error: "Cover must be JPG, PNG or WebP." }, { status: 400 });
    }
    if (cover.size > MAX_COVER_BYTES) {
      return NextResponse.json({ error: "Cover is too large (max 5 MB)." }, { status: 400 });
    }
    const ext = cover.type === "image/png" ? "png" : cover.type === "image/webp" ? "webp" : "jpg";
    coverPath = `books/covers/${id}.${ext}`;
    const { error: coverUploadError } = await admin.supabase.storage
      .from("books")
      .upload(coverPath, cover, { contentType: cover.type, upsert: false });

    if (coverUploadError) {
      await admin.supabase.storage.from("books").remove([storagePath]);
      console.error("Cover upload failed", coverUploadError);
      return NextResponse.json({ error: "Failed to upload cover." }, { status: 500 });
    }
  }

  const { data: book, error } = await admin.supabase
    .from("books")
    .insert({ id, title, author, description, cover: coverPath, storage_path: storagePath, status, amazon_link: amazonLink || null })
    .select()
    .single();

  if (error) {
    await admin.supabase.storage.from("books").remove([storagePath]);
    if (coverPath) await admin.supabase.storage.from("books").remove([coverPath]);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ book }, { status: 201 });
}