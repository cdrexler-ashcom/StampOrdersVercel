"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { useAuth } from "@/components/AuthProvider";
import { Button, Field, Input, Notice } from "@/components/ui";
import { ApiError } from "@/lib/api";

interface LoginFields {
  username: string;
  password: string;
}

/**
 * Sign-in page (H2). Rendered without the app shell (AppShell bypasses its chrome on /login).
 * On success it returns the user to wherever a 401 bounced them from (?returnTo=...), or the
 * dashboard.
 *
 * The default export wraps the form in <Suspense>: it reads useSearchParams(), which Next 15
 * requires be inside a suspense boundary or `next build` fails to prerender the page.
 */
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, login } = useAuth();

  const returnTo = safeReturnTo(searchParams.get("returnTo"));
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFields>({ defaultValues: { username: "", password: "" } });

  // Already signed in (e.g. navigated to /login manually) — leave.
  useEffect(() => {
    if (status === "authenticated") router.replace(returnTo);
  }, [status, returnTo, router]);

  const onSubmit = handleSubmit(async ({ username, password }) => {
    setFormError(null);
    try {
      await login(username, password);
      router.replace(returnTo);
    } catch (error) {
      // A 401 is the expected "wrong credentials" path; anything else is a real error.
      if (error instanceof ApiError && error.status === 401) {
        setFormError("The username or password is incorrect.");
      } else {
        setFormError(
          error instanceof Error ? error.message : "Sign in failed. Please try again.",
        );
      }
    }
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-lg font-semibold text-slate-900">Stamp Orders</h1>
          <p className="text-sm text-slate-500">Stead Brothers</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-medium text-slate-900">Sign in</h2>

          {formError && (
            <div className="mb-4">
              <Notice tone="red" title="Could not sign in">
                {formError}
              </Notice>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <Field label="Username" required error={errors.username?.message}>
              <Input
                autoFocus
                autoComplete="username"
                {...register("username", { required: "Username is required." })}
              />
            </Field>

            <Field label="Password" required error={errors.password?.message}>
              <Input
                type="password"
                autoComplete="current-password"
                {...register("password", { required: "Password is required." })}
              />
            </Field>

            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              className="w-full justify-center"
            >
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

/** Only allow same-app relative return paths, so ?returnTo can't be an open redirect. */
function safeReturnTo(value: string | null): string {
  if (!value) return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}
