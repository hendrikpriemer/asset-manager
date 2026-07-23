import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import { ToastProvider } from "@/components/ToastProvider";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Asset Manager",
  description: "Manage your assets",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${roboto.variable} h-full antialiased`}>
      <head>
        {/*
          Material Symbols is a variable-axis ligature font (FILL/wght/GRAD/opsz).
          Loaded via Google Fonts CSS2 directly (not next/font) since the FILL
          axis needs per-icon control that next/font's static hosting doesn't
          expose as conveniently. Trade-off: external CDN request vs self-hosting.
        */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      {/*
        No transform/filter/contain classes here or on Sidebar/content wrapper:
        that would create a new containing block and break Modal's
        `fixed inset-0` viewport-relative positioning.

        h-dvh + overflow-hidden pins the app shell to the (dynamic, mobile-
        toolbar-aware) viewport height instead of letting <body> grow with
        page content - without this, a page taller than the viewport made
        the *whole page* scroll, dragging the Sidebar out of view along with
        it. Each page's own content now scrolls independently inside the
        flex-1 wrapper (overflow-auto, both axes - horizontal for anything
        wider than the content area, e.g. a wide table), while Sidebar stays
        put for the full height, on every page, without any per-page opt-in.
      */}
      <body className="flex h-dvh overflow-hidden">
        <ToastProvider>
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-auto">{children}</div>
        </ToastProvider>
      </body>
    </html>
  );
}
