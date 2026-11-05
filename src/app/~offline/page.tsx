import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 bg-white px-6 text-center text-zinc-900 dark:bg-black dark:text-zinc-50">
      <h1 className="text-2xl font-semibold tracking-tight">You&apos;re offline</h1>
      <p className="max-w-sm text-zinc-600 dark:text-zinc-400">
        Check your connection and try again. Cached pages may still be available.
      </p>
      <Link
        href="/"
        className="inline-flex h-11 items-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        Back to home
      </Link>
    </div>
  );
}
