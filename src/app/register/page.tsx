"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerSchema } from "@/shared/validation/auth-schemas";
import { BrandLogo } from "@/components/brand-logo";
import {
  Card,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setServerError(null);

    const result = registerSchema.safeParse({ email, name, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const [field, messages] of Object.entries(
        result.error.flatten().fieldErrors
      )) {
        fieldErrors[field] = messages?.[0] ?? "Invalid value";
      }
      setErrors(fieldErrors);
      return;
    }

    setPending(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result.data),
    });

    setPending(false);

    if (res.ok) {
      router.push("/login");
    } else {
      const data = await res.json().catch(() => ({}));
      setServerError(
        (data as { error?: string }).error ??
          "Registration failed. Please try again."
      );
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background bg-dot-grid p-4">
      <div className="animate-fade-in-up w-full max-w-sm flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-2">
          <BrandLogo size="lg" />
          <p className="text-sm text-muted-foreground">
            Split expenses, stay friends
          </p>
        </div>

        <Card className="w-full shadow-lg shadow-foreground/3">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <FieldGroup>
                <Field data-invalid={errors.email ? true : undefined}>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={errors.email ? true : undefined}
                  />
                  {errors.email && <FieldError>{errors.email}</FieldError>}
                </Field>
                <Field data-invalid={errors.name ? true : undefined}>
                  <FieldLabel htmlFor="name">Name</FieldLabel>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    aria-invalid={errors.name ? true : undefined}
                  />
                  {errors.name && <FieldError>{errors.name}</FieldError>}
                </Field>
                <Field data-invalid={errors.password ? true : undefined}>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    aria-invalid={errors.password ? true : undefined}
                  />
                  {errors.password && (
                    <FieldError>{errors.password}</FieldError>
                  )}
                </Field>
              </FieldGroup>
              {serverError && <FieldError>{serverError}</FieldError>}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Creating account…" : "Create Account"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center gap-1 text-sm text-muted-foreground">
            Already have an account?
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
