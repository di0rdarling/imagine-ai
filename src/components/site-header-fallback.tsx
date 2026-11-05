import Link from "next/link";

export function SiteHeaderFallback() {
  return (
    <header className="relative mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6 sm:py-6">
      <Link
        href="/"
        className="flex items-center gap-2 text-base font-bold tracking-tight transition-opacity hover:opacity-80 sm:text-lg"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-sm font-black text-white dark:bg-white dark:text-zinc-900">
          I
        </span>
        <span>Imagine AI</span>
      </Link>
      <nav className="hidden items-center gap-6 text-sm text-zinc-600 md:flex dark:text-zinc-400">
        <Link
          href="/characters"
          className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          Characters
        </Link>
        <Link
          href="/characters/new"
          className="rounded-full bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800"
        >
          + Create
        </Link>
      </nav>
      {/* Mobile placeholder button matching the hamburger button dimensions */}
      <div className="h-10 w-10 md:hidden" aria-hidden="true" />
    </header>
  );
}
