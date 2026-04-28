import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "next-themes";

export const viewport: Viewport = {
  themeColor: "#cc7030",
}

export const metadata: Metadata = {
  title: "KJ Homedecor — Gorden & Curtain Premium",
  description:
    "Spesialis gorden, curtain, roman blind, dan vitras premium. Pemasangan profesional ke seluruh Jabodetabek. Hub. kami untuk konsultasi gratis.",
  keywords: "gorden, curtain, roman blind, vitras, home decor, interior, Jakarta",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "KJ Homedecor",
  },
  openGraph: {
    title: "KJ Homedecor — Gorden & Curtain Premium",
    description: "Spesialis gorden, curtain, roman blind, dan vitras premium.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="KJ Homedecor" />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
