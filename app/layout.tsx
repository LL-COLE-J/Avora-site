import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Avora — Pink Gala 2027",
  description: "Premium event operations, beginning with Pink Gala 2027 check-in.",
};

export const viewport: Viewport = { themeColor: "#f8f2ef", colorScheme: "light" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
