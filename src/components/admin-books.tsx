"use client";

import { useRouter } from "next/navigation";
import { Fragment, useRef, useState } from "react";
import type { Book } from "@/lib/types";

const inputCls =
  "w-full rounded-xl border border-[--border] bg-stone-50 px-3.5 py-2.5 text-sm outline-none transition focus:border-[--accent] focus:bg-white focus:ring-2 focus:ring-teal-500/15";

export function AdminBooks({ books }: { books: Book[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [amazonLink, setAmazonLink] = useState("");
  const [status, setStatus] = useState<"active" | "disabled">("active");
  const [pdfName, setPdfName] = useState("");
  const [coverName, setCoverName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAmazonLink, setEditAmazonLink] = useState("");
  const [editStatus, setEditStatus] = useState<"active" | "disabled">("active");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  async function createBook(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const form = new FormData();
      form.append("title", title);
      form.append("author", author);
      form.append("description", description);
      form.append("status", status);
      form.append("amazon_link", amazonLink);

      const pdfInput = formRef.current?.querySelector<HTMLInputElement>('input[name="pdf"]');
      const coverInput = formRef.current?.querySelector<HTMLInputElement>('input[name="cover"]');
      if (pdfInput?.files?.[0]) form.append("pdf", pdfInput.files[0]);
      if (coverInput?.files?.[0]) form.append("cover", coverInput.files[0]);

      const res = await fetch("/api/admin/books", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to upload book.");
        return;
      }

      formRef.current?.reset();
      setTitle("");
      setAuthor("");
      setDescription("");
      setAmazonLink("");
      setPdfName("");
      setCoverName("");
      setStatus("active");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(book: Book) {
    setBusyId(book.id);
    try {
      await fetch(`/api/admin/books/${book.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: book.status === "active" ? "disabled" : "active",
        }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function deleteBook(book: Book) {
    if (!confirm(`Delete "${book.title}"? This cannot be undone.`)) return;
    setBusyId(book.id);
    try {
      await fetch(`/api/admin/books/${book.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  function startEdit(book: Book) {
    setEditingId(book.id);
    setEditTitle(book.title);
    setEditAuthor(book.author ?? "");
    setEditDescription(book.description ?? "");
    setEditAmazonLink(book.amazon_link ?? "");
    setEditStatus(book.status);
    setEditError(null);
  }

  async function saveEdit(book: Book) {
    setSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/admin/books/${book.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          author: editAuthor,
          description: editDescription,
          amazon_link: editAmazonLink,
          status: editStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error ?? "Failed to update book.");
        return;
      }
      setEditingId(null);
      router.refresh();
    } catch {
      setEditError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600/10 text-lg">
          📚
        </span>
        <h2 className="text-lg font-semibold">Books</h2>
      </div>

      {/* Upload form */}
      <form
        ref={formRef}
        onSubmit={createBook}
        className="mb-8 overflow-hidden rounded-2xl border border-[--border] bg-white shadow-sm"
      >
        <div className="border-b border-[--border] bg-stone-50/60 px-5 py-3">
          <h3 className="text-sm font-semibold">Upload a new book</h3>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">Title *</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. The Silent River"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Author</label>
            <input
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Author name"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "active" | "disabled")}
              className={inputCls}
            >
              <option value="active">Active</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Short description (optional)"
              className={inputCls}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium">
              Amazon link <span className="font-normal text-[--muted]">(optional)</span>
            </label>
            <div className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-[--muted]"
              >
                🛒
              </span>
              <input
                value={amazonLink}
                onChange={(e) => setAmazonLink(e.target.value)}
                placeholder="https://www.amazon.in/dp/…"
                className={`${inputCls} pl-10`}
              />
            </div>
            <p className="mt-1 text-xs text-[--muted]">
              Library me &quot;Explore other books by Harish&quot; link dikhega jo Amazon listing pe redirect karega.
            </p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">PDF file *</label>
            <label
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[--border] bg-stone-50 px-3.5 py-3 text-sm text-[--muted] transition hover:border-teal-600/50 hover:bg-teal-50/50 ${pdfName ? "border-teal-600/50 bg-teal-50/40 text-teal-900" : ""}`}
            >
              {pdfName || "Choose PDF…"}
              <input
                type="file"
                name="pdf"
                accept="application/pdf,.pdf"
                required
                onChange={(e) => setPdfName(e.target.files?.[0]?.name ?? "")}
                className="hidden"
              />
            </label>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Cover (JPG/PNG/WebP)
            </label>
            <label
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[--border] bg-stone-50 px-3.5 py-3 text-sm text-[--muted] transition hover:border-teal-600/50 hover:bg-teal-50/50 ${coverName ? "border-teal-600/50 bg-teal-50/40 text-teal-900" : ""}`}
            >
              {coverName || "Choose cover…"}
              <input
                type="file"
                name="cover"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setCoverName(e.target.files?.[0]?.name ?? "")}
                className="hidden"
              />
            </label>
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-teal-600/25 transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            >
              {loading ? "Uploading…" : "Upload book"}
            </button>
            {error && <p className="text-sm text-red-700">{error}</p>}
          </div>
        </div>
      </form>

      {/* Books table */}
      <div className="overflow-hidden rounded-2xl border border-[--border] bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-[--border] bg-stone-50/60 text-left text-xs font-medium uppercase tracking-wide text-[--muted]">
                <th className="px-4 py-3">Book</th>
                <th className="px-4 py-3">Author</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {books.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[--muted]">
                    No books yet. Upload your first one above.
                  </td>
                </tr>
              ) : (
                books.map((book) => (
                  <Fragment key={book.id}>
                    <tr
                      className="border-b border-[--border] transition last:border-0 hover:bg-stone-50/50"
                    >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-stone-100 shadow-sm">
                          {book.cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`/api/books/${book.id}/cover`}
                              alt=""
                              className="h-full w-full object-cover"
                              draggable={false}
                            />
                          ) : (
                            <div className="h-full w-full" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className="font-medium">{book.title}</span>
                          {book.amazon_link && (
                            <a
                              href={book.amazon_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-0.5 flex items-center gap-1 text-xs font-medium text-amber-700 transition hover:text-amber-800"
                            >
                              🛒 Explore other books by Harish
                            </a>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[--muted]">{book.author ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          book.status === "active"
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20"
                            : "bg-stone-100 text-[--muted] ring-1 ring-stone-300/40"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            book.status === "active" ? "bg-emerald-500" : "bg-stone-400"
                          }`}
                        />
                        {book.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[--muted]">
                      {new Date(book.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => toggleStatus(book)}
                          disabled={busyId === book.id}
                          className="rounded-lg border border-[--border] px-3 py-1.5 text-xs font-medium transition hover:border-teal-600/40 hover:bg-teal-50/50 hover:text-teal-800 disabled:opacity-50"
                        >
                          {book.status === "active" ? "Disable" : "Enable"}
                        </button>
                        <button
                          onClick={() => startEdit(book)}
                          disabled={busyId === book.id}
                          className="rounded-lg border border-[--border] px-3 py-1.5 text-xs font-medium transition hover:border-teal-600/40 hover:bg-teal-50/50 hover:text-teal-800 disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteBook(book)}
                          disabled={busyId === book.id}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  {editingId === book.id && (
                    <tr className="border-b border-[--border] bg-stone-50/70 last:border-0">
                      <td colSpan={5} className="px-4 py-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-xs font-medium text-[--muted]">
                              Title
                            </label>
                            <input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-[--muted]">
                              Author
                            </label>
                            <input
                              value={editAuthor}
                              onChange={(e) => setEditAuthor(e.target.value)}
                              className={inputCls}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="mb-1 block text-xs font-medium text-[--muted]">
                              Description
                            </label>
                            <textarea
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              rows={2}
                              className={inputCls}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="mb-1 block text-xs font-medium text-[--muted]">
                              Amazon link
                            </label>
                            <input
                              value={editAmazonLink}
                              onChange={(e) => setEditAmazonLink(e.target.value)}
                              placeholder="https://amzn.in/d/…"
                              className={inputCls}
                            />
                            <p className="mt-1 text-xs text-[--muted]">
                              &quot;Explore other books by Harish&quot; link is Amazon listing pe
                              redirect karega.
                            </p>
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-medium text-[--muted]">
                              Status
                            </label>
                            <select
                              value={editStatus}
                              onChange={(e) =>
                                setEditStatus(e.target.value as "active" | "disabled")
                              }
                              className={inputCls}
                            >
                              <option value="active">Active</option>
                              <option value="disabled">Disabled</option>
                            </select>
                          </div>
                          <div className="flex items-end gap-2">
                            <button
                              onClick={() => saveEdit(book)}
                              disabled={saving}
                              className="rounded-lg bg-gradient-to-r from-teal-600 to-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-teal-600/25 transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {saving ? "Saving…" : "Save"}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              disabled={saving}
                              className="rounded-lg border border-[--border] px-4 py-2 text-xs font-medium transition hover:bg-white disabled:opacity-50"
                            >
                              Cancel
                            </button>
                            {editError && <p className="text-xs text-red-700">{editError}</p>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}