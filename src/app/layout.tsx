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
      <head>
        {/* Applies the saved theme BEFORE first paint so there is no flash of the wrong theme.
            Mirrors ThemeProvider's resolve logic. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();",
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
