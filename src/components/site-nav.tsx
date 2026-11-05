"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { SignOutButton } from "@/components/sign-out-button";

interface SiteNavProps {
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
}

export function SiteNav({ user }: SiteNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayName = user?.name || user?.email;

  // Handle escape key and click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const closeMenu = () => setIsOpen(false);

  return (
    <div ref={containerRef} className="flex items-center">
      {/* Desktop Navigation */}
      <nav className="hidden items-center gap-6 text-sm text-zinc-600 md:flex dark:text-zinc-400">
        <Link
          href="/characters"
          className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          Characters
        </Link>
        <Link
          href="/characters/new"
          className="rounded-full bg-zinc-900 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          + Create Character
        </Link>
        {user ? (
          <>
            <span className="max-w-[180px] truncate text-zinc-500">
              {displayName}
            </span>
            <SignOutButton />
          </>
        ) : (
          <>
            <Link
              href="/sign-in"
              className="transition-colors hover:text-zinc-900 dark:hover:text-zinc-50"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full border border-zinc-300 px-3.5 py-1.5 text-xs font-semibold text-zinc-800 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200"
            >
              Sign up
            </Link>
          </>
        )}
      </nav>

      {/* Mobile Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="mobile-nav-menu"
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 md:hidden dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:focus:ring-zinc-600"
      >
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.75"
          stroke="currentColor"
          aria-hidden="true"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
            />
          )}
        </svg>
      </button>

      {/* Mobile Navigation Dropdown */}
      {isOpen && (
        <div
          id="mobile-nav-menu"
          className="absolute top-full left-0 right-0 z-50 border-b border-zinc-200 bg-white/95 px-4 py-4 shadow-lg backdrop-blur-md md:hidden dark:border-zinc-800 dark:bg-black/95"
        >
          <div className="flex flex-col gap-2">
            <Link
              href="/characters"
              onClick={closeMenu}
              className="flex min-h-[44px] items-center rounded-lg px-3 text-base font-semibold text-zinc-900 transition-colors hover:bg-zinc-100 dark:text-zinc-100"
            >
              Explore Characters
            </Link>
            <Link
              href="/characters/new"
              onClick={closeMenu}
              className="flex min-h-[44px] items-center rounded-lg bg-zinc-900 px-3 text-base font-semibold text-white transition-colors hover:bg-zinc-800"
            >
              + Create Character
            </Link>

            <div className="my-1 border-t border-zinc-200 dark:border-zinc-800" />

            {user ? (
              <div className="flex flex-col gap-2 pt-1">
                <div className="px-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Signed in as
                  </p>
                  <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {displayName}
                  </p>
                </div>
                <SignOutButton
                  onClick={closeMenu}
                  className="flex min-h-[44px] w-full items-center rounded-lg px-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                />
              </div>
            ) : (
              <div className="flex flex-col gap-2.5 pt-1">
                <Link
                  href="/sign-in"
                  onClick={closeMenu}
                  className="flex min-h-[44px] items-center justify-center rounded-lg border border-zinc-200 px-4 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  onClick={closeMenu}
                  className="flex min-h-[44px] items-center justify-center rounded-full bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
