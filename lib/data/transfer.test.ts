import { describe, expect, it } from "vitest";
import { parseCsv } from "./transfer";

describe("parseCsv", () => {
  it("handles quotes, escaped quotes and newlines", () => {
    const rows = parseCsv('date,amount,note\n2026-10-01,20,"Tea, ""chai"""\n2026-10-02,40,"two\nlines"\n');
    expect(rows).toEqual([
      ["date", "amount", "note"],
      ["2026-10-01", "20", 'Tea, "chai"'],
      ["2026-10-02", "40", "two\nlines"],
    ]);
  });

  it("accepts CRLF and skips blank lines", () => {
    expect(parseCsv("a,b\r\n1,2\r\n\r\n")).toEqual([["a", "b"], ["1", "2"]]);
  });
});
