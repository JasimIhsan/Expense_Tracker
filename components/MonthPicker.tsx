"use client";

import { addMonths, format, isSameMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MonthPicker({ month, onChange }: { month: Date; onChange: (m: Date) => void }) {
  const isCurrent = isSameMonth(month, new Date());
  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" onClick={() => onChange(addMonths(month, -1))} aria-label="Previous month">
        <ChevronLeft />
      </Button>
      <span className="min-w-20 text-center text-sm font-medium">{format(month, "MMM yyyy")}</span>
      <Button variant="ghost" size="icon" onClick={() => onChange(addMonths(month, 1))} aria-label="Next month" disabled={isCurrent}>
        <ChevronRight />
      </Button>
    </div>
  );
}
