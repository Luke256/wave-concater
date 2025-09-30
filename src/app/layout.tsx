import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "WAV Concatenator - 音声ファイル結合ツール",
    template: "%s | WAV Concatenator"
  },
  description: "二つのWAVファイルを結合し、イントロ付きループ再生に適した一つのWAVファイルを生成します。",
  authors: [{ name: "Luke256" }],
  creator: "Luke256",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    title: "WAV Concatenator - 音声ファイル結合ツール",
    description: "二つのWAVファイルを結合し、イントロ付きループ再生に適した一つのWAVファイルを生成します。",
    siteName: "WAV Concatenator",
    images: [
      {
        url: "/icon.svg",
        width: 128,
        height: 128,
        alt: "WAV Concatenatorアイコン",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "WAV Concatenator - 音声ファイル結合ツール",
    description: "二つのWAVファイルを結合し、イントロ付きループ再生に適した一つのWAVファイルを生成します。",
    images: ["/icon.svg"],
  },
  robots: {
    index: true,
    follow: true,
  },
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
