import Link from "next/link";

export function SiteHeaderFallback() {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        A-Star Technologies
      </Link>
      <nav className="flex items-center gap-6 text-sm text-zinc-600 dark:text-zinc-400">
        <Link href="/#about" className="hover:text-zinc-900 dark:hover:text-zinc-50">
          About
        </Link>
        <Link href="/#contact" className="hover:text-zinc-900 dark:hover:text-zinc-50">
          Contact
        </Link>
      </nav>
    </header>
  );
}
