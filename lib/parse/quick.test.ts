import { describe, expect, it } from "vitest";
import { quickParse } from "./quick";
import type { ParseContext } from "./types";

const ctx: ParseContext = {
  categories: [
    { id: "food", name: "Food", kind: "expense" },
    { id: "transport", name: "Transport", kind: "expense" },
    { id: "fuel", name: "Fuel", kind: "expense" },
    { id: "other", name: "Other", kind: "expense" },
    { id: "salary", name: "Salary", kind: "income" },
    { id: "otherin", name: "Other income", kind: "income" },
  ],
  accounts: [
    { id: "cash", name: "Cash", type: "cash" },
    { id: "upi", name: "UPI", type: "upi" },
  ],
  aliases: [{ phrase: "chaya", category_id: "food", account_id: null }],
  now: new Date("2026-10-17T10:00:00Z"),
};

describe("quickParse", () => {
  it("parses 'tea 20' and '20 tea'", () => {
    for (const text of ["tea 20", "20 tea", "tea ₹20", "rs 20 tea"]) {
      const { drafts, unparsed } = quickParse(text, ctx);
      expect(unparsed).toEqual([]);
      expect(drafts).toHaveLength(1);
      expect(drafts[0]).toMatchObject({ type: "debit", amount: 20, category_id: "food", account_id: "cash", note: "Tea" });
    }
  });

  it("splits multiple items", () => {
    const { drafts, unparsed } = quickParse("tea 20, metro 40 and petrol 500", ctx);
    expect(unparsed).toEqual([]);
    expect(drafts.map((d) => [d.amount, d.category_id])).toEqual([
      [20, "food"],
      [40, "transport"],
      [500, "fuel"],
    ]);
  });

  it("detects credits", () => {
    expect(quickParse("+5000 salary", ctx).drafts[0]).toMatchObject({ type: "credit", amount: 5000, category_id: "salary" });
    expect(quickParse("got 2000 from rahul", ctx).drafts[0]).toMatchObject({ type: "credit", amount: 2000, category_id: "otherin", note: "Rahul" });
  });

  it("picks the account from the text", () => {
    expect(quickParse("auto 80 upi", ctx).drafts[0]).toMatchObject({ amount: 80, category_id: "transport", account_id: "upi", note: "Auto" });
    expect(quickParse("lunch 150 gpay", ctx).drafts[0]).toMatchObject({ account_id: "upi" });
  });

  it("uses aliases and k suffix", () => {
    expect(quickParse("chaya 15", ctx).drafts[0]).toMatchObject({ category_id: "food" });
    expect(quickParse("laptop 45k", ctx).drafts[0]).toMatchObject({ amount: 45000, category_id: "other", note: "Laptop" });
  });

  it("hands ambiguous text to the AI", () => {
    const r = quickParse("paid for stuff", ctx);
    expect(r.drafts).toEqual([]);
    expect(r.unparsed).toEqual(["paid for stuff"]);
    const r2 = quickParse("tea 20 and 30 for two coffees 60", ctx);
    expect(r2.drafts).toHaveLength(1);
    expect(r2.unparsed).toHaveLength(1);
  });
});
