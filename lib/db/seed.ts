import { db, newId, nowIso, type Account, type Category } from "./schema";

const EXPENSE: Array<[string, string, string]> = [
  ["Food", "utensils", "#f97316"],
  ["Groceries", "shopping-basket", "#84cc16"],
  ["Transport", "bus", "#3b82f6"],
  ["Fuel", "fuel", "#6366f1"],
  ["Shopping", "shopping-bag", "#ec4899"],
  ["Bills", "receipt", "#eab308"],
  ["Rent", "home", "#a855f7"],
  ["Health", "heart-pulse", "#ef4444"],
  ["Entertainment", "clapperboard", "#14b8a6"],
  ["Education", "graduation-cap", "#0ea5e9"],
  ["Personal", "user", "#f43f5e"],
  ["Gifts", "gift", "#d946ef"],
  ["Lent", "hand-coins", "#64748b"],
  ["Other", "circle-ellipsis", "#737373"],
];

const INCOME: Array<[string, string, string]> = [
  ["Salary", "briefcase", "#22c55e"],
  ["Business", "store", "#10b981"],
  ["Refund", "rotate-ccw", "#06b6d4"],
  ["Borrowed", "hand-coins", "#64748b"],
  ["Other income", "circle-plus", "#737373"],
];

const ACCOUNTS: Array<[string, Account["type"]]> = [
  ["Cash", "cash"],
  ["UPI", "upi"],
  ["Bank", "bank"],
  ["Card", "card"],
];

/** Creates default categories and accounts once, for the given user. */
export async function seedDefaults(userId: string) {
  const t = nowIso();
  const base = { user_id: userId, created_at: t, updated_at: t, deleted_at: null, dirty: 1 as const };

  const categories: Category[] = [
    ...EXPENSE.map(([name, icon, color], i) => ({
      ...base, id: newId(), name, icon, color, parent_id: null, kind: "expense" as const, sort: i,
    })),
    ...INCOME.map(([name, icon, color], i) => ({
      ...base, id: newId(), name, icon, color, parent_id: null, kind: "income" as const, sort: 100 + i,
    })),
  ];
  const accounts: Account[] = ACCOUNTS.map(([name, type], i) => ({
    ...base, id: newId(), name, type, opening_balance: 0, archived: 0, sort: i,
  }));

  // The count check lives inside the transaction so concurrent callers
  // (React strict mode, two tabs) cannot both pass it.
  await db.transaction("rw", db.categories, db.accounts, async () => {
    if ((await db.categories.count()) > 0) return;
    await db.categories.bulkAdd(categories);
    await db.accounts.bulkAdd(accounts);
  });
}
