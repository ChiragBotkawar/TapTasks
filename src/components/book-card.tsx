import Link from "next/link";
import type { Book } from "@/lib/types";

const GRADIENTS = [
  "from-teal-600 to-emerald-500",
  "from-sky-600 to-indigo-500",
  "from-rose-500 to-orange-400",
  "from-violet-600 to-fuchsia-500",
  "from-amber-500 to-rose-500",
  "from-emerald-600 to-lime-500",
];

function gradientFor(title: string) {
  let h = 0;
  for (const ch of title) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return GRADIENTS[h % GRADIENTS.length];
}

function isNew(book: Book): boolean {
  const age = Date.now() - new Date(book.created_at).getTime();
  return age > 0 && age < 7 * 24 * 60 * 60 * 1000;
}

export function BookCard({ book }: { book: Book }) {
  return (
    <div className="group flex h-full flex-col overflow-hidden rounded-2xl border border-[--border] bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-teal-600/30 hover:shadow-xl hover:shadow-teal-900/10">
      <Link href={`/reader/${book.id}`} className="relative block aspect-[3/4] w-full overflow-hidden">
        {isNew(book) && (
          <span className="absolute left-2 top-2 z-10 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950 shadow-sm">
            New
          </span>
        )}
        {book.cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/books/${book.id}/cover`}
            alt={`Cover of ${book.title}`}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
            draggable={false}
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${gradientFor(book.title)} px-4`}
          >
            <span className="line-clamp-5 text-center text-base font-semibold text-white/95 drop-shadow">
              {book.title}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 transition group-hover:opacity-100" />
      </Link>

      <div className="flex flex-1 flex-col gap-0.5 p-3">
        <Link href={`/reader/${book.id}`} className="line-clamp-1 text-sm font-semibold transition group-hover:text-teal-800">
          {book.title}
        </Link>
        <span className="line-clamp-1 text-xs text-[--muted]">
          {book.author ?? "Unknown author"}
        </span>

        <div className="mt-auto flex items-center gap-1.5 pt-2">
          <Link
            href={`/reader/${book.id}`}
            className="flex items-center gap-1 rounded-lg bg-teal-600/10 px-2.5 py-1 text-xs font-semibold text-teal-700 transition hover:bg-teal-600/20 group-hover:text-teal-800"
          >
            Read now
            <svg
              className="h-3.5 w-3.5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden
            >
              <path
                fillRule="evenodd"
                d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
          {book.amazon_link && (
            <a
              href={book.amazon_link}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1 rounded-lg bg-amber-100/80 px-2.5 py-1 text-xs font-semibold text-amber-800 transition hover:bg-amber-200"
              title="Buy on Amazon"
            >
              🛒 Buy
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
