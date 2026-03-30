"use client";

import { useSession, signOut } from "next-auth/react";
import { BrandLogo } from "./brand-logo";
import { UserAvatar } from "./avatar";
import { Button } from "@/components/ui/button";
import { LogOutIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-border/60 px-4 py-3 flex items-center justify-between">
        <BrandLogo size="sm" />
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <SunIcon className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <MoonIcon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
          {session?.user && (
            <div className="flex items-center gap-2">
              <UserAvatar name={session.user.name ?? "?"} size="sm" />
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {session.user.name}
              </span>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOutIcon data-icon="inline-start" />
            Sign Out
          </Button>
        </div>
      </header>
      <main className="max-w-2xl mx-auto p-4 sm:p-6 flex flex-col gap-8">
        {children}
      </main>
    </div>
  );
}
