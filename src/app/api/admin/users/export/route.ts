import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { data: users, error } = await admin.supabase
    .from("profiles")
    .select("id, email, phone, name, city, role, created_at, last_login")
    .order("last_login", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Readers");

  sheet.columns = [
    { header: "Name", key: "name", width: 24 },
    { header: "Email", key: "email", width: 30 },
    { header: "Phone Number", key: "phone", width: 22 },
    { header: "City", key: "city", width: 18 },
    { header: "Login Date", key: "last_login", width: 26 },
    { header: "Role", key: "role", width: 12 },
  ];

  sheet.getRow(1).font = { bold: true };

  for (const user of users ?? []) {
    sheet.addRow({
      name: user.name ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      city: user.city ?? "",
      last_login: user.last_login ? new Date(user.last_login).toLocaleString() : "",
      role: user.role ?? "reader",
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const body = new Uint8Array(buffer);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="readers.xlsx"',
      "Cache-Control": "private, no-store",
    },
  });
}