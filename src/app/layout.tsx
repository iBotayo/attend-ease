import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AppProviders } from "@/context/AppProviders";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Attend Ease - Attendance made simple",
  description: "Modern, responsive, facility-based attendance management system using facial recognition and facility verification.",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#123C3A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-brand-ivory text-brand-charcoal min-h-screen`}>
        <AppProviders>
          <ServiceWorkerRegister />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}

