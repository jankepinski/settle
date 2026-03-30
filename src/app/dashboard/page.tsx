"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PlusIcon, UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";

type Group = {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
};

type UserDTO = {
  id: string;
  email: string;
  name: string;
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [memberCounts, setMemberCounts] = useState<Record<string, number>>({});
  const [memberCountsLoading, setMemberCountsLoading] = useState(false);
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const currentUserId = session?.user?.id;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  const fetchGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      const res = await fetch("/api/groups");
      if (!res.ok) throw new Error();
      setGroups(await res.json());
    } catch {
      toast.error("Failed to load groups");
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error();
      setUsers(await res.json());
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") fetchGroups();
  }, [status, fetchGroups]);

  useEffect(() => {
    if (groupsLoading) return;
    if (groups.length === 0) {
      setMemberCounts({});
      setMemberCountsLoading(false);
      return;
    }

    let cancelled = false;
    setMemberCounts({});
    setMemberCountsLoading(true);

    (async () => {
      const entries = await Promise.all(
        groups.map(async (g) => {
          try {
            const res = await fetch(`/api/groups/${g.id}`);
            if (!res.ok) return [g.id, null] as const;
            const data: { members?: unknown[] } = await res.json();
            return [g.id, data.members?.length ?? 0] as const;
          } catch {
            return [g.id, null] as const;
          }
        })
      );

      if (cancelled) return;

      const next: Record<string, number> = {};
      for (const [id, n] of entries) {
        if (n !== null) next[id] = n;
      }
      setMemberCounts(next);
      setMemberCountsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [groups, groupsLoading]);

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!groupName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName.trim(),
          memberIds: selectedMembers,
        }),
      });
      if (!res.ok) throw new Error();
      setDialogOpen(false);
      setGroupName("");
      setSelectedMembers([]);
      toast.success("Group created");
      await fetchGroups();
    } catch {
      toast.error("Failed to create group");
    } finally {
      setCreating(false);
    }
  }

  function toggleMember(userId: string) {
    setSelectedMembers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  }

  const otherUsers = users.filter((u) => u.id !== currentUserId);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Skeleton className="h-8 w-40" />
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b px-4 py-3 flex items-center justify-between">
        <h1 className="font-semibold text-lg">Settle</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {session?.user?.name}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your Groups</h2>
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (open) fetchUsers();
            }}
          >
            <DialogTrigger render={<Button />}>
              <PlusIcon data-icon="inline-start" />
              New Group
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleCreateGroup} className="flex flex-col gap-4">
                <DialogHeader>
                  <DialogTitle>Create a Group</DialogTitle>
                </DialogHeader>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="group-name">Group Name</FieldLabel>
                    <Input
                      id="group-name"
                      placeholder="e.g. Trip to Paris"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      required
                    />
                  </Field>
                </FieldGroup>
                {otherUsers.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium">
                      Add Members (optional)
                    </p>
                    <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                      {otherUsers.map((user) => (
                        <label
                          key={user.id}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedMembers.includes(user.id)}
                            onCheckedChange={() => toggleMember(user.id)}
                          />
                          <span className="text-sm">{user.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {user.email}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button
                    type="submit"
                    disabled={creating || !groupName.trim()}
                  >
                    {creating ? "Creating…" : "Create Group"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {groupsLoading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <UsersIcon className="size-10 text-muted-foreground" />
            <div className="flex flex-col gap-1">
              <p className="font-medium">No groups yet</p>
              <p className="text-sm text-muted-foreground">
                Create a group to start splitting expenses.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {groups.map((group) => (
              <Card
                key={group.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => router.push(`/groups/${group.id}`)}
              >
                <CardHeader>
                  <CardTitle className="text-base">{group.name}</CardTitle>
                  <CardDescription>
                    {memberCountsLoading
                      ? "… members"
                      : group.id in memberCounts
                        ? `${memberCounts[group.id]} ${
                            memberCounts[group.id] === 1 ? "member" : "members"
                          }`
                        : "—"}{" "}
                    · Created{" "}
                    {new Date(group.createdAt).toLocaleDateString("pl-PL")}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
