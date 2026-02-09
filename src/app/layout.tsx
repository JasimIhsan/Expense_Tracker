import { BottomNav } from "@/components/layout/BottomNav";
import { PwaRegister } from "@/components/pwa-register";
import { ThemeProvider } from "@/components/theme-provider";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
   variable: "--font-geist-sans",
   subsets: ["latin"],
});

const geistMono = Geist_Mono({
   variable: "--font-geist-mono",
   subsets: ["latin"],
});

export const metadata: Metadata = {
   title: "Expense Tracker",
   description: "Personal expense tracker application",
   manifest: "/manifest.json",
};

export const viewport: Viewport = {
   width: "device-width",
   initialScale: 1,
   maximumScale: 1,
   userScalable: false,
};

export default function RootLayout({
   children,
}: Readonly<{
   children: React.ReactNode;
}>) {
   return (
      <html lang="en" suppressHydrationWarning>
         <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-background text-foreground pb-20 md:pb-0 md:pl-64`}>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
               <PwaRegister />
               <main className="container mx-auto p-4 max-w-md md:max-w-4xl relative">
                  {/* <div className="absolute top-4 right-4 z-10">
                     <ThemeToggle />  
                  </div> */}
                  {children}
               </main>
               <BottomNav />
            </ThemeProvider>
         </body>
      </html>
   );
}
