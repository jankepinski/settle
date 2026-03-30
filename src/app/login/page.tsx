"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
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

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl: "/dashboard",
      redirect: false,
    });

    setPending(false);

    if (result?.error) {
      setError("Invalid email or password.");
    } else if (result?.url) {
      window.location.href = result.url;
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
                <Field>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </Field>
              </FieldGroup>
              {error && <FieldError>{error}</FieldError>}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? "Signing in…" : "Sign In"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center gap-1 text-sm text-muted-foreground">
            Don&apos;t have an account?
            <Link
              href="/register"
              className="font-medium text-primary hover:underline"
            >
              Register
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
