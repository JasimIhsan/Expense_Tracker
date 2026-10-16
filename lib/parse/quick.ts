import type { Draft, ParseContext } from "./types";

/**
 * Local, sub-millisecond parser for the common shapes:
 *   "tea 20"  "20 tea"  "tea ₹20"  "rs 20 tea"  "+5000 salary"  "got 2000 from rahul"
 *   "auto 80 upi"  "tea 20, metro 40 and petrol 500"  "lunch 1.5k"
 * Anything it cannot place with confidence is returned in `unparsed` for the AI.
 */

const CREDIT_WORDS = /\b(got|received|recieved|income|salary|credit|credited|refund|cashback|from|paid me|gave me|earned|bonus|sold)\b/;
const ACCOUNT_WORDS: Array<[RegExp, string]> = [
  [/\b(upi|gpay|google pay|phonepe|paytm)\b/, "upi"],
  [/\b(cash)\b/, "cash"],
  [/\b(card|credit card|debit card|visa)\b/, "card"],
  [/\b(bank|neft|imps|netbanking|account)\b/, "bank"],
  [/\b(wallet)\b/, "wallet"],
];

/** Built-in vocabulary → category name (matched against the user's category names). */
export const KEYWORDS: Record<string, string[]> = {
  Food: ["tea", "chai", "chaya", "coffee", "lunch", "dinner", "breakfast", "snack", "snacks", "food", "biryani", "pizza", "burger", "juice", "hotel", "restaurant", "canteen", "swiggy", "zomato", "dosa", "idli", "meals", "parotta", "porotta", "shawarma", "bakery"],
  Groceries: ["grocery", "groceries", "vegetables", "veg", "fruits", "milk", "rice", "supermarket", "blinkit", "zepto", "instamart", "bigbasket", "eggs", "chicken", "fish", "meat"],
  Transport: ["metro", "bus", "auto", "rickshaw", "cab", "taxi", "uber", "ola", "rapido", "train", "ticket", "toll", "parking", "flight"],
  Fuel: ["petrol", "diesel", "fuel", "gas", "cng"],
  Shopping: ["amazon", "flipkart", "myntra", "shopping", "clothes", "shirt", "shoes", "dress", "mall"],
  Bills: ["bill", "electricity", "current bill", "water", "wifi", "internet", "recharge", "mobile", "phone", "dth", "netflix", "spotify", "subscription", "emi", "insurance", "gas bill"],
  Rent: ["rent", "maintenance"],
  Health: ["medicine", "medicines", "pharmacy", "doctor", "hospital", "clinic", "gym", "tablet", "tablets"],
  Entertainment: ["movie", "cinema", "theatre", "game", "games", "concert", "party"],
  Education: ["book", "books", "course", "fees", "fee", "tuition", "class", "school", "college", "exam"],
  Personal: ["haircut", "salon", "barber", "laundry", "cosmetics"],
  Gifts: ["gift", "donation", "charity", "wedding"],
  Lent: ["lent", "gave", "loan to"],
  Salary: ["salary", "pay", "payroll"],
  Business: ["sale", "sold", "client", "invoice", "freelance", "order"],
  Refund: ["refund", "cashback", "return"],
  Borrowed: ["borrowed", "loan from"],
};

const AMOUNT_RE = /(?:₹|rs\.?|inr|rupees?)?\s*([+-])?\s*(\d+(?:[.,]\d+)?)\s*(k|thousand|lakh|l)?\b/i;
const ALL_AMOUNTS_RE = new RegExp(AMOUNT_RE.source, "gi");

function parseAmount(raw: string, unit?: string) {
  let n = Number(raw.replace(/,/g, ""));
  if (!unit) return n;
  const u = unit.toLowerCase();
  if (u === "k" || u === "thousand") n *= 1000;
  else if (u === "l" || u === "lakh") n *= 100000;
  return n;
}

function splitSegments(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/\s*(?:,|;|\n|\band\b|\bthen\b|\balso\b)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

function findCategory(words: string, ctx: ParseContext, kind: "expense" | "income") {
  const byName = new Map(ctx.categories.filter((c) => c.kind === kind).map((c) => [c.name.toLowerCase(), c]));
  // 1. user aliases (longest phrase first)
  for (const a of [...ctx.aliases].sort((x, y) => y.phrase.length - x.phrase.length)) {
    if (a.category_id && new RegExp(`\\b${escape(a.phrase.toLowerCase())}\\b`).test(words)) {
      const c = ctx.categories.find((c) => c.id === a.category_id);
      if (c) return c;
    }
  }
  // 2. exact category name in the text
  for (const [name, c] of byName) if (new RegExp(`\\b${escape(name)}\\b`).test(words)) return c;
  // 3. built-in vocabulary
  for (const [catName, kws] of Object.entries(KEYWORDS)) {
    const c = byName.get(catName.toLowerCase());
    if (!c) continue;
    for (const kw of kws) if (new RegExp(`\\b${escape(kw)}\\b`).test(words)) return c;
  }
  return null;
}

function findAccount(words: string, ctx: ParseContext) {
  for (const a of ctx.aliases) {
    if (a.account_id && new RegExp(`\\b${escape(a.phrase.toLowerCase())}\\b`).test(words)) {
      const acc = ctx.accounts.find((x) => x.id === a.account_id);
      if (acc) return { account: acc, matched: a.phrase.toLowerCase() };
    }
  }
  for (const acc of ctx.accounts) {
    const m = new RegExp(`\\b${escape(acc.name.toLowerCase())}\\b`).exec(words);
    if (m) return { account: acc, matched: m[0] };
  }
  for (const [re, type] of ACCOUNT_WORDS) {
    const m = re.exec(words);
    if (m) {
      const acc = ctx.accounts.find((a) => a.type === type);
      if (acc) return { account: acc, matched: m[0] };
    }
  }
  return null;
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const FILLER =
  /\b(for|on|at|of|in|the|a|an|to|my|me|paid|pay|spent|spend|bought|buy|via|by|with|using|rs|rupees?|inr|today|rupee|got|received|recieved|from|credited|credit|earned)\b/g;

export interface QuickResult {
  drafts: Draft[];
  /** Segments the quick-parser could not handle; send these to the AI. */
  unparsed: string[];
}

export function quickParse(text: string, ctx: ParseContext, source: Draft["source"] = "text"): QuickResult {
  const now = ctx.now ?? new Date();
  const drafts: Draft[] = [];
  const unparsed: string[] = [];

  for (const seg of splitSegments(text)) {
    const lower = seg.toLowerCase();
    const amounts = [...lower.matchAll(ALL_AMOUNTS_RE)].filter((m) => m[2]);
    if (amounts.length !== 1) {
      unparsed.push(seg);
      continue;
    }
    const m = amounts[0];
    const amount = parseAmount(m[2], m[3]);
    if (!(amount > 0)) {
      unparsed.push(seg);
      continue;
    }
    const explicitCredit = m[1] === "+";
    const isCredit = explicitCredit || CREDIT_WORDS.test(lower);
    const kind = isCredit ? "income" : "expense";

    let words = lower.replace(m[0], " ");
    const acc = findAccount(words, ctx);
    if (acc) words = words.replace(new RegExp(`\\b${escape(acc.matched)}\\b`), " ");
    const cat = findCategory(words, ctx, kind);

    const note = words
      .replace(/₹/g, " ")
      .replace(FILLER, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Need either a category hit or some descriptive text to be confident.
    if (!cat && !note) {
      unparsed.push(seg);
      continue;
    }
    const fallback = ctx.categories.find((c) => c.kind === kind && /^other/i.test(c.name)) ?? null;
    drafts.push({
      id: crypto.randomUUID(),
      type: isCredit ? "credit" : "debit",
      amount,
      category_id: (cat ?? fallback)?.id ?? null,
      account_id: acc?.account.id ?? ctx.accounts[0]?.id ?? null,
      note: titleCase(note),
      occurred_at: now.toISOString(),
      source,
      raw_input: seg,
      origin: "quick",
    });
  }
  return { drafts, unparsed };
}

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}
