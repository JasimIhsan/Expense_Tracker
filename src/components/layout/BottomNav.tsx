"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion"; // ← add framer-motion for smooth animations
import { BarChart2, Home, List, Plus, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNav() {
   const pathname = usePathname();

   const links = [
      { href: "/", icon: Home, label: "Home" },
      { href: "/expenses", icon: Wallet, label: "Expenses" },
      { href: "/statistics", icon: BarChart2, label: "Stats" },
      { href: "/categories", icon: List, label: "Categories" },
   ];

   // Helper to check if route is active
   const isActive = (href: string) => pathname === href || pathname === href + "/" || pathname.startsWith(href + "/");

   return (
      <nav className={cn("fixed bottom-4 left-1/2 -translate-x-1/2 z-50", "md:hidden w-[min(90vw,420px)]")}>
         {/* Container */}
         <div className={cn("relative h-16 rounded-full bg-background/80 backdrop-blur-xl", "border border-border/40 shadow-xl shadow-black/10", "grid grid-cols-5 items-center")}>
            {/* Left Items */}
            {links.slice(0, 2).map(({ href, icon: Icon, label }, index) => {
               const active = isActive(href);
               return (
                  <Link key={href} href={href} className={cn("relative flex flex-col items-center justify-center gap-0.5 h-full w-full transition-all duration-300", index === 0 ? "rounded-l-full rounded-r-xl" : "rounded-xl", active ? "text-primary" : "text-muted-foreground hover:text-foreground active:scale-95")}>
                     {active && <motion.div layoutId="nav-bubble" className={cn("absolute inset-0 bg-primary/10", index === 0 ? "rounded-l-full rounded-r-xl" : "rounded-xl")} />}
                     <Icon className="h-5 w-5 stroke-[2.2] relative z-10" />
                     <span className="text-[10px] font-medium tracking-tight relative z-10">{label}</span>
                     {active && <motion.div layoutId="nav-dot" className="absolute bottom-2 h-1 w-1 rounded-full bg-primary z-10" />}
                  </Link>
               );
            })}

            {/* Center FAB */}
            <div className="relative flex justify-center items-center -top-6">
               <Link href="/add" className={cn("flex h-14 w-14 items-center justify-center rounded-full", "bg-primary text-primary-foreground shadow-lg shadow-primary/30", "transition-all duration-300 hover:scale-110 active:scale-95", "ring-4 ring-background")}>
                  <Plus className="h-7 w-7 fill-primary-foreground stroke-2" />
               </Link>
            </div>

            {/* Right Items */}
            {links.slice(2).map(({ href, icon: Icon, label }, index) => {
               const active = isActive(href);
               return (
                  <Link key={href} href={href} className={cn("relative flex flex-col items-center justify-center gap-0.5 h-full w-full transition-all duration-300", index === 1 ? "rounded-r-full rounded-l-xl" : "rounded-xl", active ? "text-primary" : "text-muted-foreground hover:text-foreground active:scale-95")}>
                     {active && <motion.div layoutId="nav-bubble" className={cn("absolute inset-0 bg-primary/10", index === 1 ? "rounded-r-full rounded-l-xl" : "rounded-xl")} />}
                     <Icon className="h-5 w-5 stroke-[2.2] relative z-10" />
                     <span className="text-[10px] font-medium tracking-tight relative z-10">{label}</span>
                     {active && <motion.div layoutId="nav-dot" className="absolute bottom-2 h-1 w-1 rounded-full bg-primary z-10" />}
                  </Link>
               );
            })}
         </div>
      </nav>
   );
}
