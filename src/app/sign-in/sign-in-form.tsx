"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { Alert, AuthFormField, Button, Input } from "@/components/ui";

export function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered") === "1";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setPending(false);

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-4">
      {registered ? (
        <Alert tone="success">
          Account created. Sign in with your email and password.
        </Alert>
      ) : null}

      {error ? <Alert tone="error">{error}</Alert> : null}

      <AuthFormField id="sign-in-email" label="Email">
        <Input
          id="sign-in-email"
          name="email"
          type="email"
          required
          autoComplete="email"
        />
      </AuthFormField>

      <AuthFormField id="sign-in-password" label="Password">
        <Input
          id="sign-in-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
      </AuthFormField>

      <Button type="submit" disabled={pending} fullWidth>
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        Need an account?{" "}
        <Link href="/sign-up" className="font-medium text-zinc-900 dark:text-zinc-50">
          Create one
        </Link>
      </p>
    </form>
  );
}
