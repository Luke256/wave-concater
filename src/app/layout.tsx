import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wave Concatenator",
  description: "二つのWAVファイルを結合し、イントロ付きのループ再生に適した一つのWAVファイルを生成します。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        {children}
      </body>
    </html>
  );
}
