import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import GlobalSplashScreen from "@/components/GlobalSplashScreen";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "庫存管理系統 | 專業庫存與財務管理平台",
  description: "全功能庫存管理系統,支援進銷存管理、財務報表、AI智能分析,幫助您輕鬆管理業務",
  keywords: ["庫存管理", "進銷存", "財務管理", "報表分析", "AI分析"],
  authors: [{ name: "庫存管理系統" }],
  icons: {
    icon: "/logo.jpg",
    apple: "/logo.jpg",
  },
  openGraph: {
    title: "庫存管理系統",
    description: "專業的庫存與財務管理平台",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors`}
      >
        <GlobalSplashScreen>
          <ThemeProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
          </ThemeProvider>
        </GlobalSplashScreen>
      </body>
    </html>
  );
}
