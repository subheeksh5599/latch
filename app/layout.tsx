import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Latch",
  description:
    "A page that refuses to go live until a real browser proves its button works.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
