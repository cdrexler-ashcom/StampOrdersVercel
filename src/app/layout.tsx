import type { Metadata } from "next";

import { AppShell } from "@/components/AppShell";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stamp Orders | Stead Brothers",
  description:
    "Order entry, invoicing, receipts and despatch for Stead Brothers stamp manufacturing.",
};

/**
 * suppressHydrationWarning is set on <html> and <body> because browser extensions
 * routinely inject attributes onto these two elements before React hydrates, which
 * React then reports as a mismatch we cannot fix.
 *
 * It applies one level deep only, so genuine mismatches inside the tree still surface.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-AU" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
