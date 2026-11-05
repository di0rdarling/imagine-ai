import { Suspense } from "react";

import { SiteHeader } from "@/components/site-header";
import { SiteHeaderFallback } from "@/components/site-header-fallback";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-white text-zinc-900 dark:bg-black dark:text-zinc-50">
      <Suspense fallback={<SiteHeaderFallback />}>
        <SiteHeader />
      </Suspense>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-24 px-6 py-24">
        <section className="flex max-w-2xl flex-col gap-6">
          <h1 className="text-5xl font-semibold leading-tight tracking-tight">
            Technology that reaches for the stars.
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Welcome to A-Star Technologies. We build useful, well-crafted
            software for people and businesses.
          </p>
          <div>
            <a
              href="#contact"
              className="inline-flex h-11 items-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Get in touch
            </a>
          </div>
        </section>

        <section id="about" className="flex max-w-2xl flex-col gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">About</h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            This is a placeholder homepage. Replace this text with a short
            description of what A-Star Technologies does.
          </p>
        </section>
      </main>

      <footer
        id="contact"
        className="mx-auto w-full max-w-5xl border-t border-zinc-200 px-6 py-8 text-sm text-zinc-500 dark:border-zinc-800"
      >
        © 2026 A-Star Technologies
      </footer>
    </div>
  );
}
