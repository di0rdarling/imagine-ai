"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="hover:text-zinc-900 dark:hover:text-zinc-50"
    >
      Sign out
    </button>
  );
}
