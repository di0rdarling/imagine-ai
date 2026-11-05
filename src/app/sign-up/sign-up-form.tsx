"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { signUp } from "@/app/sign-up/actions";

type SubmitStatus = "idle" | "creating" | "signing-in";

export function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setStatus("creating");

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const result = await signUp({}, formData);

    if (result.error) {
      setError(result.error);
      setStatus("idle");
      return;
    }

    setStatus("signing-in");

    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (signInResult?.error) {
      setError(
        "Your account was created, but automatic sign-in failed. Please sign in with your email and password.",
      );
      setStatus("idle");
      return;
    }

    router.push("/");
    router.refresh();
  }

  const isBusy = status !== "idle";

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-4">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {status === "signing-in" ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          Account created. Signing you in…
        </p>
      ) : null}

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Name</span>
        <input
          name="name"
          type="text"
          autoComplete="name"
          disabled={isBusy}
          className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900 outline-none ring-zinc-900/10 focus:ring-2 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          disabled={isBusy}
          className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900 outline-none ring-zinc-900/10 focus:ring-2 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          disabled={isBusy}
          className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900 outline-none ring-zinc-900/10 focus:ring-2 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
      </label>

      <label className="flex flex-col gap-2 text-sm">
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          Confirm password
        </span>
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          disabled={isBusy}
          className="h-11 rounded-lg border border-zinc-300 bg-white px-3 text-zinc-900 outline-none ring-zinc-900/10 focus:ring-2 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
        />
      </label>

      <button
        type="submit"
        disabled={isBusy}
        className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-900 px-6 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {status === "creating"
          ? "Creating account…"
          : status === "signing-in"
            ? "Signing you in…"
            : "Create account"}
      </button>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-zinc-900 dark:text-zinc-50">
          Sign in
        </Link>
      </p>
    </form>
  );
}
