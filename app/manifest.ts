import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Paisa — Expense Tracker",
    short_name: "Paisa",
    description: "Track credits and debits by voice or text. Fast, offline, your own keys.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Voice add", url: "/?voice=1", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Quick add", url: "/add", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Today", url: "/transactions?range=today", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
