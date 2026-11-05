import Link from "next/link";
import { Suspense } from "react";

import { SignInForm } from "@/app/sign-in/sign-in-form";

export default function SignInPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-white text-zinc-900 dark:bg-black dark:text-zinc-50">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          A-Star Technologies
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="mb-8 flex max-w-md flex-col gap-2 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Welcome back. Enter the email and password for your account.
          </p>
        </div>
        <Suspense>
          <SignInForm />
        </Suspense>
      </main>
    </div>
  );
}
