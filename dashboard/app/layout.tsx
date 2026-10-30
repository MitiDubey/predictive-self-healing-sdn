import "./globals.css";

export const metadata = {
  title: "Cornerstone Self-Healing Dashboard",
  description: "Live analytical dashboard for the Cornerstone SDN controller"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
