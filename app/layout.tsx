import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { BottomNav } from "@/components/BottomNav";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Paisa",
  description: "Track credits and debits by voice or text. Fast, offline, your own keys.",
  applicationName: "Paisa",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Paisa" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-dvh bg-background text-foreground">
        <Providers>
          <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
            {children}
          </div>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
