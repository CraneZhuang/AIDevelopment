import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIDevelopment",
  description: "Single-account sign-in",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">{children}</body>
    </html>
  );
}
