import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./app.css";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MoodSync - Social Mood Tracking",
  description:
    "Track, share, and understand your moods with friends. Get AI-powered insights about your emotional wellbeing.",
  keywords: [
    "mood tracking",
    "mental health",
    "wellbeing",
    "social",
    "friends",
    "emotions",
  ],
  authors: [{ name: "MoodSync Team" }],
  viewport: "width=device-width, initial-scale=1",
  themeColor: "#4CAF50",
  openGraph: {
    title: "MoodSync - Social Mood Tracking",
    description: "Track, share, and understand your moods with friends",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "MoodSync - Social Mood Tracking",
    description: "Track, share, and understand your moods with friends",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={inter.className}>
        <div id="app-root">{children}</div>
      </body>
    </html>
  );
}
