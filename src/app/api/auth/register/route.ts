import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { name, phone, email, password } = await request.json().catch(() => ({}));

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
  }

  const phoneDigits = typeof phone === "string" ? phone.replace(/\D/g, "") : "";
  if (phoneDigits.length !== 10) {
    return NextResponse.json({ error: "Phone number must be exactly 10 digits." }, { status: 400 });
  }

  if (typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email.trim())) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }

  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const supabase = await createClient();
  const origin = new URL(request.url).origin;
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { name: name.trim(), phone: phoneDigits },
      emailRedirectTo: `${origin}/auth/callback?next=/library`,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  console.error(
    "[register] email:",
    email.trim().toLowerCase(),
    "session:",
    !!data.session,
    "identities:",
    data.user?.identities?.length ?? 0
  );

  // Email confirmation disabled in the Supabase project → the user is signed
  // in immediately, so create the profile here and let the UI redirect.
  if (data.session && data.user) {
    await supabase.from("profiles").upsert({
      id: data.user.id,
      email: data.user.email,
      phone: phoneDigits,
      name: name.trim(),
      role: "reader",
      last_login: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, signedIn: true });
  }

  // Supabase only sends a confirmation email for brand-new accounts. If the
  // email already has a confirmed account, NO email is sent — return a clear
  // message instead of silently pretending one was delivered.
  if (data.user && (data.user.identities?.length ?? 0) === 0) {
    return NextResponse.json(
      {
        error:
          "An account with this email already exists. Sign in instead, or use “Forgot password?” to reset your password.",
      },
      { status: 409 }
    );
  }

  // New account → confirmation email sent.
  return NextResponse.json({ ok: true });
}
