# TapTasks

A private digital reading website. Readers sign in with their phone number + OTP, browse the library, and read books inside the browser. Books cannot be downloaded or printed through the normal UI, and PDFs are never exposed through a public URL.

## Stack

- **Next.js 16** (App Router, TypeScript, Turbopack)
- **Supabase** (Auth via phone OTP, Postgres, private Storage)
- **Tailwind CSS**
- **pdfjs-dist** (renders PDF pages to `<canvas>` — no native PDF viewer, no download/print chrome)
- **exceljs** (admin Excel export)

## Setup

1. Create a Supabase project.
2. In **Authentication → Providers**, enable **Phone** and configure an SMS provider (e.g. Twilio). For local development without a provider, `supabase start` will log the OTP to the CLI console — or configure a test provider as documented by Supabase.
3. Copy `.env.local.example` to `.env.local` and fill in:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
   ```

4. Open the **SQL editor** and run the whole file at `supabase/schema.sql`. It creates:
   - `profiles`, `books`, `reading_progress` tables with Row Level Security
   - the private `books` storage bucket and its access policies
5. Install and run:

   ```bash
   npm install
   npm run dev
   ```

6. Log in once with your own phone number, then promote yourself to admin:

   ```sql
   update public.profiles set role = 'admin' where phone = 'YOUR_PHONE_WITH_COUNTRY_CODE';
   ```

   Reload — the **Admin** link now appears in the header.

## Pages

| Route        | Purpose                                            |
| ------------ | -------------------------------------------------- |
| `/`          | Login (phone + OTP)                                |
| `/library`   | Book library                                       |
| `/reader/[id]`| Protected book reader                              |
| `/admin`     | Admin dashboard (books + registered users)         |

## Download / print protection

- PDFs live in a **private** Supabase Storage bucket; there are no public URLs and nothing in `public/`.
- The reader fetches the PDF through an authenticated route (`/api/books/[id]/pdf`) that checks the session, the book status, and streams with `Cache-Control: no-store`.
- Pages are rendered by **pdfjs to a `<canvas>`** — no iframe, no browser PDF toolbar, no right-click "save", no print controls.
- The reader blocks right-click, Ctrl/Cmd+S, Ctrl/Cmd+P, Ctrl/Cmd+U/O, text selection and copy/drag.
- Backend routes verify the session and the `admin` role; RLS blocks non-admins at the database level too.

> Note: no browser-based protection is absolute. A determined user with a screenshot tool can always capture the screen. The goal here is strong practical protection against normal downloading and printing.

## Admin security

- `/admin` and every `/api/admin/*` route require `profiles.role = 'admin'`.
- Database RLS also limits all book/user mutations to admins, so a forged client request cannot escalate.

## Notes

- Reading progress is saved automatically as you turn pages, so readers resume where they left off.
- Covers are also served through an authenticated route (the `books` bucket stays fully private).
