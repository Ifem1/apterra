import type { Metadata } from "next";
import FaucetNavMount from "./components/FaucetNavMount";
import "./globals.css";
import "./faucet.css";

export const metadata: Metadata = {
  title: "APTERRA | Capability Underwriting",
  description: "A version-bound, evidence-backed authority console for autonomous agents.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}<FaucetNavMount /></body></html>;
}
