"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function PageHeader({ title, back = "/settings", right }: { title: string; back?: string; right?: React.ReactNode }) {
  return (
    <header className="flex items-center gap-1">
      <Link href={back} aria-label="Back" className="-ml-2 flex size-9 items-center justify-center rounded-full text-muted-foreground">
        <ChevronLeft className="size-5" />
      </Link>
      <h1 className="flex-1 text-xl font-semibold">{title}</h1>
      {right}
    </header>
  );
}
