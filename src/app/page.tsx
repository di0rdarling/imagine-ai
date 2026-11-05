import Link from "next/link";
import { Suspense } from "react";

import { SiteHeader } from "@/components/site-header";
import { SiteHeaderFallback } from "@/components/site-header-fallback";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-white text-zinc-900 dark:bg-black dark:text-zinc-50">
      <Suspense fallback={<SiteHeaderFallback />}>
        <SiteHeader />
      </Suspense>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-16 px-4 py-12 sm:px-6 sm:py-20">
        {/* Hero Section */}
        <section className="flex max-w-3xl flex-col gap-6">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3.5 py-1 text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            <span>✨</span>
            <span>Next-Gen Interactive Fiction</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-zinc-950 dark:text-white leading-[1.1]">
            Create characters. Enter immersive stories.
          </h1>

          <p className="text-lg leading-relaxed text-zinc-600 sm:text-xl dark:text-zinc-400 max-w-2xl">
            Imagine AI gives you the power to craft intricate AI characters with unique
            identities, backstories, and voices — then talk to them inside evolving story modes.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <Link
              href="/characters/new"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-zinc-900 px-7 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Create a Character
            </Link>

            <Link
              href="/characters"
              className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-300 bg-white px-7 text-sm font-semibold text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Explore Characters
            </Link>
          </div>
        </section>

        {/* Feature Highlights */}
        <section className="grid grid-cols-1 gap-6 sm:grid-cols-3 pt-6 border-t border-zinc-100 dark:border-zinc-800">
          <div className="rounded-3xl border border-zinc-200/80 bg-zinc-50/50 p-6 dark:border-zinc-800/80 dark:bg-zinc-900/30">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-lg">
              🎭
            </div>
            <h3 className="mt-4 text-base font-bold text-zinc-900 dark:text-zinc-50">
              Deep Character Creation
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Set avatars, attributes, occupations, tags, greetings, and hidden backstories that drive authentic behaviors.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-200/80 bg-zinc-50/50 p-6 dark:border-zinc-800/80 dark:bg-zinc-900/30">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-lg">
              💬
            </div>
            <h3 className="mt-4 text-base font-bold text-zinc-900 dark:text-zinc-50">
              Story Mode Conversations
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Engage in narrative dialogue with roleplay actions and expressions wrapped in **actions** for true immersion.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-200/80 bg-zinc-50/50 p-6 dark:border-zinc-800/80 dark:bg-zinc-900/30">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-lg">
              🔒
            </div>
            <h3 className="mt-4 text-base font-bold text-zinc-900 dark:text-zinc-50">
              Stored Against Your Account
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Characters are safely bound to your user profile in MongoDB with configurable private or public visibility.
            </p>
          </div>
        </section>
      </main>

      <footer
        id="contact"
        className="mx-auto w-full max-w-5xl border-t border-zinc-200 px-4 py-8 text-xs text-zinc-500 sm:px-6 sm:text-sm dark:border-zinc-800"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <p>© 2026 Imagine AI. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/characters" className="hover:text-zinc-900 dark:hover:text-zinc-50">
              Characters
            </Link>
            <Link href="/characters/new" className="hover:text-zinc-900 dark:hover:text-zinc-50">
              Create
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
