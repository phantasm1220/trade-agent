import "./globals.css";
export const metadata = { title: "AI Trade Agent", description: "AI-powered Japanese & US stock trading simulator" };
export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
