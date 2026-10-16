import type { TxnSource, TxnType } from "../db/schema";

/** A transaction proposed by the quick-parser or the AI, before it is saved. */
export interface Draft {
  id: string;
  type: TxnType;
  amount: number;
  category_id: string | null;
  account_id: string | null;
  note: string;
  occurred_at: string;
  source: TxnSource;
  raw_input: string;
  /** "quick" = local regex, "ai" = model, "manual" = user edited */
  origin: "quick" | "ai" | "manual";
}

export interface ParseContext {
  categories: Array<{ id: string; name: string; kind: "expense" | "income" }>;
  accounts: Array<{ id: string; name: string; type: string }>;
  aliases: Array<{ phrase: string; category_id: string | null; account_id: string | null }>;
  now?: Date;
}
