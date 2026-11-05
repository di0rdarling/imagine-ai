import Link from "next/link";
import { getServerSession } from "next-auth";

import { SiteNav } from "@/components/site-nav";
import { authOptions } from "@/lib/auth";

export async function SiteHeader() {
  const session = await getServerSession(authOptions);
  const user = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
      }
    : null;

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
      <SiteNav user={user} />
    </header>
  );
}
