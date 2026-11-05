"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { signUp } from "@/app/sign-up/actions";
import { Alert, AuthFormField, Button, Input } from "@/components/ui";

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
      {error ? <Alert tone="error">{error}</Alert> : null}

      {status === "signing-in" ? (
        <Alert tone="success">Account created. Signing you in…</Alert>
      ) : null}

      <AuthFormField id="sign-up-name" label="Name">
        <Input
          id="sign-up-name"
          name="name"
          type="text"
          autoComplete="name"
          disabled={isBusy}
        />
      </AuthFormField>

      <AuthFormField id="sign-up-email" label="Email">
        <Input
          id="sign-up-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          disabled={isBusy}
        />
      </AuthFormField>

      <AuthFormField id="sign-up-password" label="Password">
        <Input
          id="sign-up-password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          disabled={isBusy}
        />
      </AuthFormField>

      <AuthFormField id="sign-up-confirm" label="Confirm password">
        <Input
          id="sign-up-confirm"
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          disabled={isBusy}
        />
      </AuthFormField>

      <Button type="submit" disabled={isBusy} fullWidth>
        {status === "creating"
          ? "Creating account…"
          : status === "signing-in"
            ? "Signing you in…"
            : "Create account"}
      </Button>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-medium text-zinc-900 dark:text-zinc-50">
          Sign in
        </Link>
      </p>
    </form>
  );
}
