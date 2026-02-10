import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Provider } from "@/components/ui/provider";
import { Header } from "@/components/header";
import { getSession, hasImpersonationBackup } from "@/lib/auth";
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
  title: "Hollywood Purple Filter",
  description: "Hollywood Purple Filter - Lista de personagens",
  icons: {
    icon: "/icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, isImpersonating] = await Promise.all([
    getSession(),
    hasImpersonationBackup(),
  ]);
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Provider>
          <Header user={user} isImpersonating={isImpersonating} />
          <main style={{ paddingTop: 112, backgroundColor: "#17181b" }}>{children}</main>
        </Provider>
      </body>
    </html>
  );
}
