"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { PlusIcon, UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
    <AppShell>
      <div className="flex items-center justify-between animate-fade-in">
        <h2 className="font-heading text-2xl italic text-foreground">
          Your Groups
        </h2>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (open) fetchUsers();
          }}
        >
          <DialogTrigger
            render={
              <Button className="bg-warm-amber text-warm-amber-foreground hover:bg-warm-amber/90" />
            }
          >
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
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="No groups yet"
          description="Create a group to start splitting expenses with friends."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((group, index) => (
            <Card
              key={group.id}
              className={`card-hover cursor-pointer border-l-2 border-l-primary animate-fade-in-up stagger-${Math.min(index + 1, 8)}`}
              onClick={() => router.push(`/groups/${group.id}`)}
            >
              <CardHeader>
                <CardTitle className="text-base">{group.name}</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  {memberCountsLoading ? (
                    <Skeleton className="h-4 w-16 inline-block" />
                  ) : group.id in memberCounts ? (
                    <Badge variant="secondary">
                      <UsersIcon className="size-3" />
                      {memberCounts[group.id]}{" "}
                      {memberCounts[group.id] === 1 ? "member" : "members"}
                    </Badge>
                  ) : null}
                  <span>
                    Created{" "}
                    {new Date(group.createdAt).toLocaleDateString("pl-PL")}
                  </span>
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
