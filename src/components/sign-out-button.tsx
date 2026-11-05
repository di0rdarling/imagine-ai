"use client";

import { signOut } from "next-auth/react";

interface SignOutButtonProps {
  className?: string;
  onClick?: () => void;
}

export function SignOutButton({ className, onClick }: SignOutButtonProps) {
  return (
    <button
      type="button"
      onClick={() => {
        onClick?.();
        signOut({ callbackUrl: "/" });
      }}
      className={className ?? "hover:text-zinc-900 dark:hover:text-zinc-50"}
    >
      Sign out
    </button>
  );
}
