"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  PlusIcon,
  UserPlusIcon,
  TrashIcon,
  PencilIcon,
} from "lucide-react";
import { toast } from "sonner";
import { formatCents } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

type Group = {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
};

type GroupMember = {
  groupId: string;
  userId: string;
  joinedAt: string;
};

type GroupDetails = {
  group: Group;
  members: GroupMember[];
};

type Balance = {
  userId: string;
  balance: number;
};

type ExpenseRecord = {
  id: string;
  groupId: string;
  paidBy: string;
  amount: number;
  description: string;
  type: "expense" | "settlement";
  createdAt: string;
};

type ExpenseWithSplits = {
  expense: ExpenseRecord;
  splits: Array<{ id: string; expenseId: string; userId: string; amount: number }>;
};

type UserDTO = {
  id: string;
  email: string;
  name: string;
};

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithSplits[]>([]);
  const [allUsers, setAllUsers] = useState<UserDTO[]>([]);

  const [detailsLoading, setDetailsLoading] = useState(true);
  const [balancesLoading, setBalancesLoading] = useState(true);
  const [expensesLoading, setExpensesLoading] = useState(true);

  // Add/Edit Expense dialog
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithSplits | null>(null);
  const [expensePayerId, setExpensePayerId] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseParticipants, setExpenseParticipants] = useState<string[]>([]);
  const [expenseSubmitting, setExpenseSubmitting] = useState(false);

  // Settle Up dialog
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [settlePayerId, setSettlePayerId] = useState("");
  const [settleRecipientId, setSettleRecipientId] = useState("");
  const [settleAmount, setSettleAmount] = useState("");
  const [settleSubmitting, setSettleSubmitting] = useState(false);

  // Add Member dialog
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [newMemberId, setNewMemberId] = useState("");
  const [memberSubmitting, setMemberSubmitting] = useState(false);

  const fetchDetails = useCallback(async () => {
    setDetailsLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      if (!res.ok) throw new Error();
      setGroupDetails(await res.json());
    } catch {
      toast.error("Failed to load group details");
    } finally {
      setDetailsLoading(false);
    }
  }, [groupId]);

  const fetchBalances = useCallback(async () => {
    setBalancesLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/balances`);
      if (!res.ok) throw new Error();
      setBalances(await res.json());
    } catch {
      toast.error("Failed to load balances");
    } finally {
      setBalancesLoading(false);
    }
  }, [groupId]);

  const fetchExpenses = useCallback(async () => {
    setExpensesLoading(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/expenses`);
      if (!res.ok) throw new Error();
      setExpenses(await res.json());
    } catch {
      toast.error("Failed to load expenses");
    } finally {
      setExpensesLoading(false);
    }
  }, [groupId]);

  const fetchAllUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error();
      setAllUsers(await res.json());
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchDetails();
    fetchBalances();
    fetchExpenses();
    fetchAllUsers();
  }, [fetchDetails, fetchBalances, fetchExpenses, fetchAllUsers]);

  const members = groupDetails?.members ?? [];

  function getUserName(userId: string): string {
    const user = allUsers.find((u) => u.id === userId);
    return user?.name ?? userId.slice(0, 8);
  }

  function openAddExpenseDialog() {
    setEditingExpense(null);
    setExpensePayerId("");
    setExpenseAmount("");
    setExpenseDescription("");
    setExpenseParticipants(members.map((m) => m.userId));
    setExpenseDialogOpen(true);
  }

  function openEditExpenseDialog(item: ExpenseWithSplits) {
    setEditingExpense(item);
    setExpensePayerId(item.expense.paidBy);
    setExpenseAmount((item.expense.amount / 100).toFixed(2));
    setExpenseDescription(item.expense.description);
    setExpenseParticipants(item.splits.map((s) => s.userId));
    setExpenseDialogOpen(true);
  }

  function toggleParticipant(userId: string) {
    setExpenseParticipants((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  }

  async function handleExpenseSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!expensePayerId || !expenseAmount || expenseParticipants.length === 0)
      return;
    const amountCents = Math.round(parseFloat(expenseAmount) * 100);
    setExpenseSubmitting(true);
    try {
      if (editingExpense) {
        const res = await fetch(`/api/expenses/${editingExpense.expense.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paidBy: expensePayerId,
            amount: amountCents,
            description: expenseDescription,
            participantIds: expenseParticipants,
          }),
        });
        if (!res.ok) throw new Error();
        toast.success("Expense updated");
      } else {
        const res = await fetch(`/api/groups/${groupId}/expenses`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paidBy: expensePayerId,
            amount: amountCents,
            description: expenseDescription,
            participantIds: expenseParticipants,
          }),
        });
        if (!res.ok) throw new Error();
        toast.success("Expense added");
      }
      setExpenseDialogOpen(false);
      fetchExpenses();
      fetchBalances();
    } catch {
      toast.error("Failed to save expense");
    } finally {
      setExpenseSubmitting(false);
    }
  }

  async function handleDeleteExpense(expenseId: string) {
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Expense deleted");
      fetchExpenses();
      fetchBalances();
    } catch {
      toast.error("Failed to delete expense");
    }
  }

  async function handleDeleteSettlement(settlementId: string) {
    try {
      const res = await fetch(`/api/settlements/${settlementId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Settlement deleted");
      fetchExpenses();
      fetchBalances();
    } catch {
      toast.error("Failed to delete settlement");
    }
  }

  async function handleSettleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!settlePayerId || !settleRecipientId || !settleAmount) return;
    const amountCents = Math.round(parseFloat(settleAmount) * 100);
    setSettleSubmitting(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/settlements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payerId: settlePayerId,
          recipientId: settleRecipientId,
          amount: amountCents,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Settlement recorded");
      setSettleDialogOpen(false);
      setSettlePayerId("");
      setSettleRecipientId("");
      setSettleAmount("");
      fetchExpenses();
      fetchBalances();
    } catch {
      toast.error("Failed to record settlement");
    } finally {
      setSettleSubmitting(false);
    }
  }

  const nonMemberUsers = allUsers.filter(
    (u) => !members.some((m) => m.userId === u.id)
  );

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!newMemberId) return;
    setMemberSubmitting(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: newMemberId }),
      });
      if (!res.ok) throw new Error();
      toast.success("Member added");
      setMemberDialogOpen(false);
      setNewMemberId("");
      fetchDetails();
    } catch {
      toast.error("Failed to add member");
    } finally {
      setMemberSubmitting(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${userId}`, {
        method: "DELETE",
      });
      if (res.status === 409) {
        toast.error("Cannot remove member — they have existing expenses");
        return;
      }
      if (!res.ok) throw new Error();
      toast.success("Member removed");
      fetchDetails();
    } catch {
      toast.error("Failed to remove member");
    }
  }

  const groupName = groupDetails?.group.name ?? "";

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeftIcon />
          <span className="sr-only">Back to dashboard</span>
        </Button>
        <h1 className="font-semibold text-lg">
          {detailsLoading ? <Skeleton className="h-5 w-36 inline-block" /> : groupName}
        </h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 flex flex-col gap-8">
        {/* ── Balances ── */}
        <section className="flex flex-col gap-4">
          <h2 className="text-base font-semibold">Balances</h2>
          {balancesLoading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : balances.length === 0 ? (
            <p className="text-sm text-muted-foreground">No balances yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {balances.map((b) => (
                <div
                  key={b.userId}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <span className="text-sm font-medium">
                    {getUserName(b.userId)}
                  </span>
                  <Badge
                    variant={
                      b.balance > 0
                        ? "default"
                        : b.balance < 0
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {b.balance > 0 ? "+" : ""}
                    {formatCents(b.balance)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </section>

        <Separator />

        {/* ── Expenses & Settlements ── */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Expenses</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSettlePayerId("");
                  setSettleRecipientId("");
                  setSettleAmount("");
                  setSettleDialogOpen(true);
                }}
              >
                Settle Up
              </Button>
              <Button size="sm" onClick={openAddExpenseDialog}>
                <PlusIcon data-icon="inline-start" />
                Add Expense
              </Button>
            </div>
          </div>

          {expensesLoading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No expenses yet. Add one to get started.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {expenses.map((item) => {
                const isSettlement = item.expense.type === "settlement";
                const recipientId = item.splits[0]?.userId ?? "";
                return (
                  <div
                    key={item.expense.id}
                    className="flex items-start justify-between rounded-lg border px-3 py-2 gap-2"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      {isSettlement ? (
                        <span className="text-sm font-medium text-muted-foreground">
                          Settlement
                        </span>
                      ) : (
                        <span className="text-sm font-medium truncate">
                          {item.expense.description || "Expense"}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {isSettlement
                          ? `${getUserName(item.expense.paidBy)} → ${getUserName(recipientId)} · ${formatCents(item.expense.amount)}`
                          : `${formatCents(item.expense.amount)} · paid by ${getUserName(item.expense.paidBy)}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!isSettlement && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditExpenseDialog(item)}
                        >
                          <PencilIcon />
                          <span className="sr-only">Edit expense</span>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          isSettlement
                            ? handleDeleteSettlement(item.expense.id)
                            : handleDeleteExpense(item.expense.id)
                        }
                      >
                        <TrashIcon />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <Separator />

        {/* ── Members ── */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Members</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewMemberId("");
                setMemberDialogOpen(true);
              }}
            >
              <UserPlusIcon data-icon="inline-start" />
              Add Member
            </Button>
          </div>

          {detailsLoading ? (
            <div className="flex flex-col gap-2">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted-foreground">No members yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {members.map((m) => (
                <div
                  key={m.userId}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <span className="text-sm font-medium">
                    {getUserName(m.userId)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleRemoveMember(m.userId)}
                  >
                    <TrashIcon />
                    <span className="sr-only">Remove member</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ── Add / Edit Expense Dialog ── */}
      <Dialog
        open={expenseDialogOpen}
        onOpenChange={(open) => {
          if (!open) setEditingExpense(null);
          setExpenseDialogOpen(open);
        }}
      >
        <DialogContent>
          <form onSubmit={handleExpenseSubmit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>
                {editingExpense ? "Edit Expense" : "Add Expense"}
              </DialogTitle>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel>Paid by</FieldLabel>
                <Select
                  value={expensePayerId}
                  onValueChange={(v) => setExpensePayerId(v ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Who paid?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {members.map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>
                          {getUserName(m.userId)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="expense-amount">Amount (PLN)</FieldLabel>
                <Input
                  id="expense-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="expense-desc">Description</FieldLabel>
                <Input
                  id="expense-desc"
                  placeholder="e.g. Dinner"
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                />
              </Field>
            </FieldGroup>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Participants</p>
              <div className="flex flex-col gap-2 max-h-40 overflow-y-auto">
                {members.map((m) => (
                  <label
                    key={m.userId}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={expenseParticipants.includes(m.userId)}
                      onCheckedChange={() => toggleParticipant(m.userId)}
                    />
                    <span className="text-sm">{getUserName(m.userId)}</span>
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button
                type="submit"
                disabled={
                  expenseSubmitting ||
                  !expensePayerId ||
                  !expenseAmount ||
                  expenseParticipants.length === 0
                }
              >
                {expenseSubmitting
                  ? "Saving…"
                  : editingExpense
                    ? "Update Expense"
                    : "Add Expense"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Settle Up Dialog ── */}
      <Dialog open={settleDialogOpen} onOpenChange={setSettleDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSettleSubmit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Settle Up</DialogTitle>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel>Payer</FieldLabel>
                <Select value={settlePayerId} onValueChange={(v) => setSettlePayerId(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Who is paying?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {members.map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>
                          {getUserName(m.userId)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Recipient</FieldLabel>
                <Select
                  value={settleRecipientId}
                  onValueChange={(v) => setSettleRecipientId(v ?? "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Who receives?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {members
                        .filter((m) => m.userId !== settlePayerId)
                        .map((m) => (
                          <SelectItem key={m.userId} value={m.userId}>
                            {getUserName(m.userId)}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="settle-amount">Amount (PLN)</FieldLabel>
                <Input
                  id="settle-amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  required
                />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button
                type="submit"
                disabled={
                  settleSubmitting ||
                  !settlePayerId ||
                  !settleRecipientId ||
                  !settleAmount
                }
              >
                {settleSubmitting ? "Saving…" : "Record Settlement"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Add Member Dialog ── */}
      <Dialog
        open={memberDialogOpen}
        onOpenChange={(open) => {
          setMemberDialogOpen(open);
          if (!open) setNewMemberId("");
        }}
      >
        <DialogContent>
          <form onSubmit={handleAddMember} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Add Member</DialogTitle>
            </DialogHeader>
            <FieldGroup>
              <Field>
                <FieldLabel>User</FieldLabel>
                <Select value={newMemberId} onValueChange={(v) => setNewMemberId(v ?? "")}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {nonMemberUsers.length === 0 ? (
                        <SelectItem value="_no_users" disabled>
                          No users available
                        </SelectItem>
                      ) : (
                        nonMemberUsers.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button
                type="submit"
                disabled={memberSubmitting || !newMemberId || newMemberId === "_no_users"}
              >
                {memberSubmitting ? "Adding…" : "Add Member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
