import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { PwaRegistration } from "./PwaRegistration";
import "./globals.css";

const dashboardFont = Manrope({ variable: "--font-dashboard", subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#020403",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://ajhub.ca"),
  title: "AJ's Hub — Personal Command Center",
  description: "AJ's quiet corner of the internet: a personal launchpad for the usual places.",
  manifest: "/manifest.webmanifest",
  applicationName: "AJ's Hub",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "AJ's Hub" },
  formatDetection: { telephone: false },
  openGraph: {
    title: "AJ's Hub — Personal Command Center",
    description: "AJ's quiet corner of the internet.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "AJ's Hub — Personal Command Center",
    description: "AJ's quiet corner of the internet.",
    images: ["/og.png"],
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  other: { "ajhub-app": "1" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${dashboardFont.variable} antialiased`}>
        {children}
        <PwaRegistration />
      </body>
    </html>
  );
}
