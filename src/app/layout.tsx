import type { Metadata } from "next";
import "./globals.css";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Noctra — Command Desk",
  description: "AI-powered email and calendar assistant",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("h-full dark", "font-sans")}>
      <body className="h-full bg-[#020206] text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}
