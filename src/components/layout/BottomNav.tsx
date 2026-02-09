"use client";

import { cn } from "@/lib/utils";
import { BarChart2, Home, List, PlusCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
   const pathname = usePathname();

   const links = [
      { href: "/", icon: Home, label: "Home" },
      { href: "/statistics", icon: BarChart2, label: "Stats" },
      { href: "/categories", icon: List, label: "Categories" },
   ];

   return (
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-background p-2 pb-safe md:hidden">
         <div className="flex justify-around items-center">
            {links.map(({ href, icon: Icon, label }) => (
               <Link key={href} href={href} className={cn("flex flex-col items-center p-2 rounded-lg transition-colors", pathname === href ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted")}>
                  <Icon className="h-6 w-6" />
                  <span className="text-xs mt-1">{label}</span>
               </Link>
            ))}
            <Link href="/add" className="flex flex-col items-center p-2 text-primary">
               <PlusCircle className="h-10 w-10 fill-primary text-primary-foreground" />
            </Link>
         </div>
      </nav>
   );
}
