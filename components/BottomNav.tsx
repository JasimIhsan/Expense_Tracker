"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, CalendarDays, PieChart, Settings, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/", label: "Home", Icon: Home },
  { href: "/transactions", label: "List", Icon: List },
  { href: "/add", label: "Add", Icon: Plus, primary: true },
  { href: "/calendar", label: "Calendar", Icon: CalendarDays },
  { href: "/analytics", label: "Stats", Icon: PieChart },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  if (pathname === "/onboarding") return null;
  return (
    <nav className="print:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map(({ href, label, Icon, ...rest }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const primary = "primary" in rest && rest.primary;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-label={label}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {primary ? (
                  <span className="flex size-12 -translate-y-3 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                    <Icon className="size-6" />
                  </span>
                ) : (
                  <>
                    <Icon className="size-5" />
                    {label}
                  </>
                )}
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <Link
            href="/settings"
            aria-label="Settings"
            className={cn(
              "flex h-16 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
              pathname.startsWith("/settings") ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <Settings className="size-5" />
            More
          </Link>
        </li>
      </ul>
    </nav>
  );
}
