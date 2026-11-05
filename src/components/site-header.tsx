import Link from "next/link";
import { getServerSession } from "next-auth";

import { SignOutButton } from "@/components/sign-out-button";
import { authOptions } from "@/lib/auth";

export async function SiteHeader() {
  const session = await getServerSession(authOptions);
  const displayName = session?.user?.name || session?.user?.email;

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
        {session?.user ? (
          <>
            <span className="hidden text-zinc-500 sm:inline">{displayName}</span>
            <SignOutButton />
          </>
        ) : (
          <>
            <Link href="/sign-in" className="hover:text-zinc-900 dark:hover:text-zinc-50">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Sign up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
