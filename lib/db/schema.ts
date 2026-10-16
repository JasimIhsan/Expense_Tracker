import Dexie, { type EntityTable } from "dexie";

export type TxnType = "debit" | "credit" | "transfer";
export type TxnSource = "manual" | "text" | "voice" | "share";
export type AccountType = "cash" | "upi" | "bank" | "card" | "wallet";
export type CategoryKind = "expense" | "income";

/** Fields shared by every synced row. `dirty` marks rows not yet pushed. */
export interface SyncedRow {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  dirty: 0 | 1;
}

export interface Transaction extends SyncedRow {
  type: TxnType;
  amount: number;
  account_id: string | null;
  to_account_id: string | null;
  category_id: string | null;
  note: string;
  tags: string[];
  occurred_at: string;
  source: TxnSource;
  raw_input: string | null;
}

export interface Account extends SyncedRow {
  name: string;
  type: AccountType;
  opening_balance: number;
  archived: 0 | 1;
  sort: number;
}

export interface Category extends SyncedRow {
  name: string;
  icon: string;
  color: string;
  parent_id: string | null;
  kind: CategoryKind;
  sort: number;
}

export interface Budget extends SyncedRow {
  category_id: string | null;
  period: "month";
  amount: number;
}

export interface Debt extends SyncedRow {
  person: string;
  direction: "lent" | "borrowed";
  amount: number;
  note: string;
  settled_at: string | null;
}

export interface Alias extends SyncedRow {
  phrase: string;
  category_id: string | null;
  account_id: string | null;
}

export interface RecurringRule extends SyncedRow {
  template: Partial<Transaction>;
  rrule: string;
  next_run: string;
}

export interface KV {
  key: string;
  value: unknown;
}

/** Raw notes captured while offline (or when AI failed); parsed later. */
export interface AiQueueItem {
  id: string;
  text: string;
  source: TxnSource;
  created_at: string;
  error: string | null;
}

export class AppDB extends Dexie {
  transactions!: EntityTable<Transaction, "id">;
  accounts!: EntityTable<Account, "id">;
  categories!: EntityTable<Category, "id">;
  budgets!: EntityTable<Budget, "id">;
  debts!: EntityTable<Debt, "id">;
  aliases!: EntityTable<Alias, "id">;
  recurring_rules!: EntityTable<RecurringRule, "id">;
  kv!: EntityTable<KV, "key">;
  ai_queue!: EntityTable<AiQueueItem, "id">;

  constructor() {
    super("expense-tracker");
    this.version(1).stores({
      transactions: "id, occurred_at, category_id, account_id, type, dirty, updated_at, deleted_at",
      accounts: "id, dirty, updated_at, sort",
      categories: "id, kind, parent_id, dirty, updated_at, sort",
      budgets: "id, category_id, dirty, updated_at",
      debts: "id, person, dirty, updated_at",
      aliases: "id, phrase, dirty, updated_at",
      recurring_rules: "id, next_run, dirty, updated_at",
      kv: "key",
      ai_queue: "id, created_at",
    });
  }
}

export const db = new AppDB();

/** Tables that sync with Supabase, in dependency order. */
export const SYNC_TABLES = [
  "accounts",
  "categories",
  "transactions",
  "budgets",
  "debts",
  "aliases",
  "recurring_rules",
] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];

export const LOCAL_USER = "local";
export const nowIso = () => new Date().toISOString();
export const newId = () => crypto.randomUUID();
