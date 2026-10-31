import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CORNERSTONE // Predictive Self-Healing SDN",
  description: "Autonomous failure prediction, instant OpenFlow rerouting, and real-time ML traffic telemetry dashboard for Cornerstone SDN.",
  icons: {
    icon: "/cornerstone-logo.png"
  }
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
