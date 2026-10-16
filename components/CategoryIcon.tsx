"use client";

import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import { cn } from "@/lib/utils";

export function CategoryIcon({
  icon,
  color,
  className,
  size = "md",
}: {
  icon?: string | null;
  color?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const dim = size === "sm" ? "size-7 [&>svg]:size-3.5" : size === "lg" ? "size-12 [&>svg]:size-6" : "size-9 [&>svg]:size-4";
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full text-white", dim, className)}
      style={{ backgroundColor: color ?? "#737373" }}
    >
      <DynamicIcon name={(icon ?? "circle") as IconName} />
    </span>
  );
}
