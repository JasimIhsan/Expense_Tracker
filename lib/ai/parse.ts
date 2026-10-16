import { z } from "zod";
import { addDays, parseISO, isValid, format } from "date-fns";
import { chatJson } from "./groq";
import type { Draft, ParseContext } from "../parse/types";

const ItemSchema = z.object({
  type: z.enum(["debit", "credit"]),
  amount: z.number().positive(),
  category: z.string().default(""),
  account: z.string().nullable().default(null),
  note: z.string().default(""),
  // Days relative to today (0 = today, -1 = yesterday) or an ISO date.
  date: z.union([z.number(), z.string()]).nullable().default(null),
});
const OutSchema = z.object({ items: z.array(ItemSchema).default([]) });

function systemPrompt(ctx: ParseContext, now: Date) {
  const expense = ctx.categories.filter((c) => c.kind === "expense").map((c) => c.name);
  const income = ctx.categories.filter((c) => c.kind === "income").map((c) => c.name);
  const accounts = ctx.accounts.map((a) => a.name);
  const aliases = ctx.aliases
    .filter((a) => a.category_id)
    .map((a) => `"${a.phrase}" → ${ctx.categories.find((c) => c.id === a.category_id)?.name}`)
    .join("; ");
  return [
    "You convert short personal finance notes (often Indian English, Malayalam, Hindi or mixed, possibly speech-to-text with errors) into transactions.",
    `Today is ${format(now, "EEEE yyyy-MM-dd")}. Currency is INR unless stated. "1.5k" = 1500, "2 lakh" = 200000.`,
    "Return ONLY JSON: {\"items\":[{\"type\":\"debit\"|\"credit\",\"amount\":number,\"category\":string,\"account\":string|null,\"note\":string,\"date\":number|string|null}]}",
    "type: money spent/paid/given = debit; money received/got/salary/refund/borrowed = credit.",
    `Expense categories: ${expense.join(", ")}. Income categories: ${income.join(", ")}. Use exactly one of these names.`,
    `Accounts: ${accounts.join(", ")}. Map upi/gpay/phonepe/paytm → UPI; card → Card; cash → Cash; bank/neft → Bank. null if not mentioned.`,
    "note: 2–5 words, the item or merchant or person, Title Case, no amount, no category word repeated.",
    "date: 0 for today, -1 yesterday, or ISO yyyy-mm-dd when a date is named; null otherwise.",
    "One item per amount. If a sentence has no amount, skip it. Never invent amounts.",
    aliases ? `User vocabulary: ${aliases}.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function aiParse(text: string, ctx: ParseContext, source: Draft["source"] = "text"): Promise<Draft[]> {
  const now = ctx.now ?? new Date();
  const raw = await chatJson<unknown>([
    { role: "system", content: systemPrompt(ctx, now) },
    { role: "user", content: text },
  ]);
  const parsed = OutSchema.safeParse(raw);
  if (!parsed.success) return [];

  const lc = (s: string) => s.trim().toLowerCase();
  return parsed.data.items.map((it) => {
    const kind = it.type === "credit" ? "income" : "expense";
    const cat =
      ctx.categories.find((c) => c.kind === kind && lc(c.name) === lc(it.category)) ??
      ctx.categories.find((c) => c.kind === kind && lc(c.name).startsWith(lc(it.category).slice(0, 4))) ??
      ctx.categories.find((c) => c.kind === kind && /^other/i.test(c.name)) ??
      null;
    const acc = it.account ? ctx.accounts.find((a) => lc(a.name) === lc(it.account!)) : undefined;

    let when = now;
    if (typeof it.date === "number") when = addDays(now, Math.max(-365, Math.min(0, it.date)));
    else if (typeof it.date === "string") {
      const d = parseISO(it.date);
      if (isValid(d)) when = new Date(d.getFullYear(), d.getMonth(), d.getDate(), now.getHours(), now.getMinutes());
    }

    return {
      id: crypto.randomUUID(),
      type: it.type,
      amount: Math.round(it.amount * 100) / 100,
      category_id: cat?.id ?? null,
      account_id: acc?.id ?? ctx.accounts[0]?.id ?? null,
      note: it.note.trim(),
      occurred_at: when.toISOString(),
      source,
      raw_input: text,
      origin: "ai" as const,
    };
  });
}
