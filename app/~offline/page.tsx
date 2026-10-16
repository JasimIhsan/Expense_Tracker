export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-xl font-semibold">You are offline</h1>
      <p className="text-muted-foreground text-sm">
        This page is not cached yet. Open the app from its icon; your data is stored on this device.
      </p>
    </main>
  );
}
