# Product Requirements Document — Splitwise Clone

## 1. Overview

A group expense splitting application that lets users track shared expenses, settle debts, and manage balances across multiple groups. Users start with a zero-friction guest account and can optionally register to persist their account across devices.

**Stack:** NestJS 11 + Prisma 7 + PostgreSQL 16 (backend), Next.js 16 + React 19 + Tailwind v4 (frontend), pnpm monorepo (`apps/api`, `apps/web`).

---

## 2. Authentication (Implemented)

Already built on the `auth` branch. Documenting for completeness.

- **Guest accounts** — created automatically on first app visit. No email/password required.
- **Registration** — associate email + password with an existing guest account (upgrade flow) or create a new registered account.
- **Login** — email + password via Passport Local strategy.
- **JWT access tokens** — short-lived (15 min), stored in memory.
- **Refresh tokens** — long-lived (7 days), stored as httpOnly cookies, rotated on use.
- **Social login** — `Account` model exists in schema, implementation deferred.

### Guest Users

- Get a full account (UUID, invite code, display name).
- Can create/join groups, add expenses, settle debts — full functionality.
- Cannot recover their account from a different device unless they register.
- The app must inform guest users about the **inactive guest cleanup policy** on first use (see §12).

---

## 3. Invite Codes

Every user (including guests) receives an **invite code** on account creation.

| Property    | Detail                                      |
| ----------- | ------------------------------------------- |
| Format      | 6 characters, uppercase A–Z and digits 0–9  |
| Generation  | Random, on account creation                 |
| Mutability  | Immutable — never changes                   |
| Uniqueness  | Globally unique across all users            |
| Visibility  | Displayed on the home screen                |

The invite code is the primary mechanism for adding people to groups. It replaces friend requests, email invites, and user search by username.

---

## 4. Friends

There is **no standalone friends feature** in the traditional sense. Friendship is a **derived relationship** — two users become friends when they are in the same group.

### How it works

1. User A creates a group and adds User B (via invite code or friend list).
2. A and B are now friends. A `Friendship` record is created for both directions.
3. If A later leaves the group, the friendship **persists**. It is never deleted.
4. Friends appear in the "Add members" flow when creating a new group — as a selectable list alongside the invite code input.

### Friend list derivation

- When a user joins a group, create `Friendship` records between the new member and every existing member (bidirectional).
- Friendships are stored explicitly in the database (not computed from group membership on the fly) so they survive group departures.

### Friend search

- Users can search their friend list by **display name** when adding members to a group.

---

## 5. Groups

### 5.1 Creation

- Any user can create a group.
- Required fields: **name**, **currency** (from a supported currency list).
- During creation, the creator can add members by:
  - Typing an **invite code**.
  - Selecting from their **friends list** (people they've shared a group with before).

### 5.2 Membership

- **No roles.** Every member has equal permissions: add expenses, add members, record settlements, toggle debt simplification.
- Any member can add new members to the group (same mechanisms: invite code or friend list).
- Members can **leave** a group at any time, even with unsettled balances.
- When a member leaves:
  - Their balance snapshot is preserved and visible in the group.
  - Their expense history remains in the audit log.
  - They no longer appear as an active member.
  - Friendships created through this group persist.

### 5.3 Deletion

- **Hard delete** when the last member leaves the group.
- No manual delete action. No archiving.

### 5.4 Group properties

| Field           | Type     | Required | Notes                                         |
| --------------- | -------- | -------- | --------------------------------------------- |
| name            | string   | Yes      | Free text                                     |
| currency        | string   | Yes      | ISO 4217 code (e.g. PLN, USD, EUR)            |
| simplifyDebts   | boolean  | No       | Default `false`. Any member can toggle.        |

No description, no category, no group image (deferred).

---

## 6. Direct Expense Tracker (1-on-1)

A 1-on-1 expense tracker between two users. In the database, this is **just a group with two members** and a flag (`isDirect: true`).

### Behavior

- Created via the home screen "+" button → "Create direct expense tracker".
- You select one other person (by invite code or friend list).
- **Only one** direct tracker per pair of users. The app prevents duplicates.
- The "group name" in the UI is the **other person's display name** (not stored — derived at render time).
- You set a **currency** for the tracker.
- All group features apply (expenses, settlements, balances, audit log).
- A direct tracker does not count as a "group" in the UI — it's displayed in a separate section.

---

## 7. Expenses

### 7.1 Creating an expense

| Field         | Type       | Required | Notes                                          |
| ------------- | ---------- | -------- | ---------------------------------------------- |
| description   | string     | Yes      | What the expense was for                       |
| amount        | integer    | Yes      | In **cents** (minor currency units)            |
| date          | date       | Yes      | When the expense occurred                      |
| paidBy        | userId     | Yes      | Single payer only                              |
| participants  | userId[]   | Yes      | Who the expense is split among. Default: all active group members |
| splitMethod   | enum       | Yes      | `EQUAL`, `EXACT`, `PERCENTAGE`                 |
| splitDetails  | object     | Conditional | Required for `EXACT` and `PERCENTAGE` methods |

### 7.2 Split methods

**EQUAL** — The total is divided equally among all participants. Handle indivisible amounts by distributing remainder cents (e.g., 100 cents / 3 = 34, 33, 33).

**EXACT** — Each participant's exact share is specified in cents. The sum of all shares must equal the total expense amount.

**PERCENTAGE** — Each participant's percentage share is specified. Must sum to exactly 100%. The actual cent amounts are calculated from the percentages.

### 7.3 Editing an expense

- Any group member can edit any expense (no ownership restriction).
- On edit, a **delta** is stored in the audit log capturing old values → new values.
- Balances are recalculated from the delta (not from scratch).

### 7.4 Deleting an expense

- Any group member can delete any expense.
- Deletion is recorded in the audit log with the full expense snapshot.
- Balances are adjusted by reversing the expense's effect (applying the inverse delta).

---

## 8. Balances

### 8.1 Per-group balances

Each group displays a balance summary showing who owes whom and how much.

- Balances are calculated from the sum of all expense deltas and settlement records within the group.
- When a member has left the group, their last balance is still visible (frozen at departure time).

### 8.2 Debt simplification

A **per-group toggle** (stored in the group record).

- Any member can toggle it on/off at any time.
- When **off**: balances show the raw pairwise debts (A owes B $10, B owes C $5, etc.).
- When **on**: the app runs a debt simplification algorithm to minimize the number of transactions (e.g., A→B→C becomes A→C).
- Toggling does not alter stored data — it only changes the display/calculation.

### 8.3 Dashboard (home screen)

The home screen shows:

- A **list of groups** with a small card per group showing your balance in that group.
- A **list of 1-on-1 trackers** (displayed separately from groups).
- Your **invite code**.
- A **total balance** across all groups, converted to a single display currency.

### 8.4 Dashboard currency

- The user selects their preferred **display currency** (e.g., PLN, USD, EUR).
- This preference is stored in **localStorage** (not in the database).
- All balances from all groups are converted to this currency on the **frontend** using the frankfurter.app API.
- The backend does not perform any currency conversion.

---

## 9. Settlements

A settlement records a payment from one user to another within a group.

| Field     | Type     | Required | Notes                            |
| --------- | -------- | -------- | -------------------------------- |
| groupId   | string   | Yes      | Which group this settlement is in |
| fromUser  | userId   | Yes      | Who is paying                    |
| toUser    | userId   | Yes      | Who is receiving                 |
| amount    | integer  | Yes      | In cents                         |

- **Partial settlements** are supported (pay back less than the full amount owed).
- Settlements are recorded in the audit log.
- Settlements affect the group's balance calculations.

---

## 10. Audit Log

An **immutable, append-only** history of all actions within a group.

### Logged actions

| Action            | What's recorded                                                |
| ----------------- | -------------------------------------------------------------- |
| `EXPENSE_CREATED` | Full expense details                                           |
| `EXPENSE_UPDATED` | Delta: old values → new values                                 |
| `EXPENSE_DELETED` | Full expense snapshot at time of deletion                      |
| `SETTLEMENT`      | Settlement details (from, to, amount)                          |
| `MEMBER_JOINED`   | Who joined                                                     |
| `MEMBER_LEFT`     | Who left, their balance at time of departure                   |
| `DEBT_SIMPLIFICATION_TOGGLED` | New value (on/off), who toggled it              |

### Properties

- Entries are **immutable** — never edited or deleted.
- Each entry has: `id`, `groupId`, `userId` (who performed the action), `action` (enum), `payload` (JSON with action-specific data), `createdAt`.
- Visible in the group UI as an activity/history feed.
- Survives member departure — a departed member's actions remain in the log.

---

## 11. Currency

- Each group has a **single currency** (set at creation, immutable).
- Direct expense trackers also have a single currency (set at creation).
- The dashboard converts all balances to the user's preferred display currency using **frankfurter.app** (free, open-source exchange rate API).
- Currency conversion happens entirely on the **frontend**. The backend stores and returns amounts in each group's native currency.
- Supported currencies: whatever frankfurter.app supports (EUR, USD, PLN, GBP, etc.).

---

## 12. Inactive Guest Cleanup

- Guest accounts that have been inactive for a defined period (TBD — e.g., 30/60/90 days) are automatically deleted.
- "Inactive" = no login, no API activity.
- On first app use (guest account creation), the user is shown a notice explaining:
  - Their account is temporary.
  - It will be deleted after N days of inactivity.
  - They should register (email + password) to make it permanent.
- Cleanup is a background job / cron task on the backend.
- When a guest is cleaned up, their data follows the same rules as leaving a group (balance snapshots preserved, audit log entries preserved, but the user record is removed).

---

## 13. Notifications

Skipped for MVP. No push notifications, no email notifications, no in-app notifications.

---

## 14. Database Schema (Planned)

Building on the existing schema (`User`, `RefreshToken`, `Account`):

```prisma
model User {
  id           String   @id @default(uuid())
  email        String?  @unique
  passwordHash String?
  displayName  String?
  inviteCode   String   @unique                    // 6 chars A-Z0-9, generated on creation
  isGuest      Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  lastActiveAt DateTime @default(now())            // for guest cleanup

  refreshTokens RefreshToken[]
  accounts      Account[]
  memberships   GroupMember[]
  friendsA      Friendship[]   @relation("friendA")
  friendsB      Friendship[]   @relation("friendB")
}

model Friendship {
  id        String   @id @default(uuid())
  userAId   String
  userBId   String
  userA     User     @relation("friendA", fields: [userAId], references: [id], onDelete: Cascade)
  userB     User     @relation("friendB", fields: [userBId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([userAId, userBId])
}

model Group {
  id            String    @id @default(uuid())
  name          String
  currency      String                              // ISO 4217
  isDirect      Boolean   @default(false)           // true for 1-on-1 trackers
  simplifyDebts Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  members     GroupMember[]
  expenses    Expense[]
  settlements Settlement[]
  auditLogs   AuditLog[]
}

model GroupMember {
  id       String    @id @default(uuid())
  groupId  String
  userId   String
  group    Group     @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  joinedAt DateTime  @default(now())
  leftAt   DateTime?                               // null = still active

  // Balance snapshot at time of departure
  balanceOnLeave Int?                              // in cents, null if still active

  @@unique([groupId, userId])
}

model Expense {
  id          String      @id @default(uuid())
  groupId     String
  group       Group       @relation(fields: [groupId], references: [id], onDelete: Cascade)
  paidById    String                                // userId of payer
  description String
  amount      Int                                   // total in cents
  splitMethod SplitMethod
  date        DateTime                              // when expense occurred
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  participants ExpenseParticipant[]
}

model ExpenseParticipant {
  id         String  @id @default(uuid())
  expenseId  String
  expense    Expense @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  userId     String
  amount     Int                                    // this participant's share in cents
  percentage Float?                                 // only for PERCENTAGE split, stored for reference

  @@unique([expenseId, userId])
}

model Settlement {
  id        String   @id @default(uuid())
  groupId   String
  group     Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  fromUserId String                                 // who is paying
  toUserId   String                                 // who is receiving
  amount    Int                                     // in cents
  createdAt DateTime @default(now())
}

model AuditLog {
  id        String    @id @default(uuid())
  groupId   String
  group     Group     @relation(fields: [groupId], references: [id], onDelete: Cascade)
  userId    String                                  // who performed the action
  action    AuditAction
  payload   Json                                    // action-specific data (old/new values, etc.)
  createdAt DateTime  @default(now())
}

enum SplitMethod {
  EQUAL
  EXACT
  PERCENTAGE
}

enum AuditAction {
  EXPENSE_CREATED
  EXPENSE_UPDATED
  EXPENSE_DELETED
  SETTLEMENT_CREATED
  MEMBER_JOINED
  MEMBER_LEFT
  DEBT_SIMPLIFICATION_TOGGLED
}
```

---

## 15. API Endpoints (Planned)

### Auth (existing)

| Method | Path              | Auth     | Description                |
| ------ | ----------------- | -------- | -------------------------- |
| POST   | `/auth/guest`     | None     | Create guest account       |
| POST   | `/auth/register`  | Optional | Register or upgrade guest  |
| POST   | `/auth/login`     | None     | Login with email/password  |
| POST   | `/auth/refresh`   | Cookie   | Refresh access token       |
| POST   | `/auth/logout`    | JWT      | Logout                     |

### Users

| Method | Path              | Auth | Description                          |
| ------ | ----------------- | ---- | ------------------------------------ |
| GET    | `/users/me`       | JWT  | Get current user profile + invite code |
| PATCH  | `/users/me`       | JWT  | Update display name                  |
| GET    | `/users/friends`  | JWT  | Get friend list                      |

### Groups

| Method | Path                          | Auth | Description                          |
| ------ | ----------------------------- | ---- | ------------------------------------ |
| POST   | `/groups`                     | JWT  | Create group (or direct tracker)     |
| GET    | `/groups`                     | JWT  | List my groups + direct trackers     |
| GET    | `/groups/:id`                 | JWT  | Get group details                    |
| POST   | `/groups/:id/members`         | JWT  | Add member (by invite code)          |
| DELETE | `/groups/:id/members/me`      | JWT  | Leave group                          |
| PATCH  | `/groups/:id`                 | JWT  | Update group settings (simplifyDebts)|
| GET    | `/groups/:id/balances`        | JWT  | Get group balances                   |
| GET    | `/groups/:id/audit-log`       | JWT  | Get group audit log                  |

### Expenses

| Method | Path                              | Auth | Description            |
| ------ | --------------------------------- | ---- | ---------------------- |
| POST   | `/groups/:id/expenses`            | JWT  | Create expense         |
| GET    | `/groups/:id/expenses`            | JWT  | List group expenses    |
| GET    | `/groups/:id/expenses/:expenseId` | JWT  | Get expense details    |
| PATCH  | `/groups/:id/expenses/:expenseId` | JWT  | Update expense         |
| DELETE | `/groups/:id/expenses/:expenseId` | JWT  | Delete expense         |

### Settlements

| Method | Path                            | Auth | Description           |
| ------ | ------------------------------- | ---- | --------------------- |
| POST   | `/groups/:id/settlements`       | JWT  | Record settlement     |
| GET    | `/groups/:id/settlements`       | JWT  | List group settlements|

### Dashboard

| Method | Path                  | Auth | Description                                |
| ------ | --------------------- | ---- | ------------------------------------------ |
| GET    | `/dashboard/balances` | JWT  | Get total balances across all groups (per group, in native currencies) |

---

## 16. UI Screens

### Home / Dashboard

- List of groups (card per group: name, your balance in group currency).
- List of 1-on-1 trackers (card per tracker: other person's name, balance).
- Your invite code (copyable).
- Total balance (converted to preferred display currency via frankfurter.app).
- "+" FAB button → options: "Create group" / "Create direct expense tracker".

### Create Group

- Name input.
- Currency selector.
- Add members section: invite code input + friend list with search-by-name.
- Confirm button.

### Create Direct Expense Tracker

- Select one person (invite code input + friend list with search-by-name).
- Currency selector.
- Confirm button.

### Group Detail

- Group name, currency.
- List of expenses (description, amount, payer, date).
- Balance summary (who owes whom).
- Debt simplification toggle.
- "Add expense" button.
- "Settle up" button.
- Member list (active + departed).
- Activity / audit log tab.
- "Add member" action.
- "Leave group" action.

### Add/Edit Expense

- Description input.
- Amount input.
- Date picker.
- Paid by selector (single payer from group members).
- Split method selector (Equal / Exact / Percentage).
- Participant selector (checkboxes, default all selected).
- For Exact: amount input per participant (must sum to total).
- For Percentage: percentage input per participant (must sum to 100%).
- Save / Update button.

### Settle Up

- From user (you).
- To user (select from group members you owe money to).
- Amount input (pre-filled with amount owed, editable for partial settlements).
- Confirm button.

### Audit Log

- Chronological list of all actions in the group.
- Each entry: timestamp, who performed the action, action description, relevant details.

### Settings / Profile

- Display name (editable).
- Invite code (read-only, copyable).
- Register prompt for guest users.
- Dashboard currency selector.

---

## 17. Out of Scope (Post-MVP)

- Social login (Google, Facebook) — model exists, implementation deferred.
- Group images (MinIO / S3 infrastructure planned but deferred).
- Notifications (push, email, in-app).
- Multiple payers per expense.
- Split by shares.
- Expense categories, notes, receipt images.
- Recurring expenses.
- Comments on expenses.
- Group archiving.
- Friend removal.
- Account deletion (self-service).

---

## 18. Open Questions

1. **Guest cleanup period** — How many days of inactivity before a guest account is deleted? (30 / 60 / 90 days?)
2. **Invite code collision handling** — With 36^6 ≈ 2.18 billion possible codes, collisions are rare but should be handled (retry on generation).
3. **Max group size** — Is there a limit on how many members a group can have?
4. **Rate limiting** — API rate limits for abuse prevention (especially guest account creation).
5. **Frankfurter.app fallback** — What happens when the currency API is unavailable? Cache last known rates? Show unconverted amounts?
