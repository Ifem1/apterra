import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "APTERRA | Capability Underwriting",
  description: "A version-bound, evidence-backed authority console for autonomous agents.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
