import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const flowId = searchParams.get("sb_flow_id") ?? undefined;
  const next = searchParams.get("next") ?? "/library";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code, {
      flowId,
    });
    if (!error && data.user) {
      const meta = data.user.user_metadata ?? {};
      const name = typeof meta.name === "string" && meta.name.trim() ? meta.name.trim() : null;
      const phone =
        typeof meta.phone === "string" ? meta.phone.replace(/\D/g, "") : null;

      await supabase.from("profiles").upsert({
        id: data.user.id,
        email: data.user.email,
        phone: phone ?? null,
        name: name ?? null,
        role: "reader",
        last_login: new Date().toISOString(),
      });

      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("[auth/callback] exchange failed:", error);
  }

  return NextResponse.redirect(`${origin}/?error=auth_callback_failed`);
}
