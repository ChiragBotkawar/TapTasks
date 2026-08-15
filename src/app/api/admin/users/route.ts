import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import type { Profile } from "@/lib/types";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: users, error } = await admin.supabase
    .from("profiles")
    .select("id, phone, name, city, role, created_at, last_login")
    .order("last_login", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: users as Profile[] });
}