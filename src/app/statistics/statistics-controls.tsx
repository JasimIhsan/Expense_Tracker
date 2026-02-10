"use client";

import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function StatisticsControls() {
   const router = useRouter();
   const searchParams = useSearchParams();

   const mode = (searchParams.get("mode") as "monthly" | "yearly") || "monthly";
   const month = Number(searchParams.get("month")) || new Date().getMonth() + 1;
   const year = Number(searchParams.get("year")) || new Date().getFullYear();

   const date = new Date(year, month - 1);

   const updateParams = useCallback(
      (newMode: string, newMonth: number, newYear: number) => {
         const params = new URLSearchParams(searchParams);
         params.set("mode", newMode);
         params.set("month", newMonth.toString());
         params.set("year", newYear.toString());
         router.push(`?${params.toString()}`);
      },
      [router, searchParams]
   );

   const navigate = (direction: "prev" | "next") => {
      let newMonth = month;
      let newYear = year;

      if (mode === "monthly") {
         if (direction === "prev") {
            if (month === 1) {
               newMonth = 12;
               newYear--;
            } else {
               newMonth--;
            }
         } else {
            if (month === 12) {
               newMonth = 1;
               newYear++;
            } else {
               newMonth++;
            }
         }
      } else {
         newYear = direction === "prev" ? year - 1 : year + 1;
      }

      updateParams(mode, newMonth, newYear);
   };

   const setMode = (newMode: "monthly" | "yearly") => {
      updateParams(newMode, month, year);
   };

   return (
      <>
         <div className="flex justify-center mb-6">
            <div className="bg-muted p-1 rounded-lg flex">
               <button onClick={() => setMode("monthly")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === "monthly" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  Monthly
               </button>
               <button onClick={() => setMode("yearly")} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${mode === "yearly" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  Yearly
               </button>
            </div>
         </div>

         <div className="flex items-center justify-between mb-8">
            <button onClick={() => navigate("prev")} className="p-2 hover:bg-muted rounded-full">
               <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold">{mode === "monthly" ? format(date, "MMMM yyyy") : format(date, "yyyy")}</h2>
            <button onClick={() => navigate("next")} className="p-2 hover:bg-muted rounded-full">
               <ChevronRight className="w-5 h-5" />
            </button>
         </div>
      </>
   );
}
