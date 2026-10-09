import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Fredoka, Geist, Geist_Mono } from "next/font/google";
import ChatWidget from "@/components/ChatWidget";
import SoundToggle from "@/components/SoundToggle";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Breed Rush · The Ultimate Dog Showdown",
  description:
    "Name that dog, beat the clock, and rule the pack. A team dog-breed quiz game for 1–4 teams.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

function PawLogo() {
  return (
    <span
      aria-hidden="true"
      className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-amber via-[#ff7a59] to-pink shadow-[0_6px_20px_-4px_rgb(255_100_100/0.7)]"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="#1b0f00">
        <ellipse cx="12" cy="15.5" rx="4.6" ry="3.7" />
        <ellipse cx="5.8" cy="10.2" rx="2" ry="2.7" />
        <ellipse cx="9.8" cy="6.9" rx="2" ry="2.7" />
        <ellipse cx="14.2" cy="6.9" rx="2" ry="2.7" />
        <ellipse cx="18.2" cy="10.2" rx="2" ry="2.7" />
      </svg>
    </span>
  );
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fredoka.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <div className="orb left-[-10vw] top-[8vh] size-[38vw] bg-pink" aria-hidden="true" />
        <div
          className="orb right-[-12vw] top-[40vh] size-[34vw] bg-cyan [animation-delay:-8s]"
          aria-hidden="true"
        />
        <div
          className="orb bottom-[-14vh] left-[28vw] size-[30vw] bg-amber [animation-delay:-14s]"
          aria-hidden="true"
        />

        <header className="sticky top-0 z-40 border-b border-line bg-white/75 backdrop-blur-xl">
          <nav className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="flex items-center gap-3" aria-label="Breed Rush home">
              <PawLogo />
              <span className="font-display whitespace-nowrap text-lg tracking-wide sm:text-xl">
                BREED <span className="text-amber">RUSH</span>
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <Link href="/leaderboard" className="btn btn-ghost !px-3 !py-2 text-sm sm:!px-4" aria-label="Leaderboard">
                <span aria-hidden="true">🏆</span>
                <span className="hidden sm:inline">Leaderboard</span>
              </Link>
              <SoundToggle />
            </div>
          </nav>
        </header>

        <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-8 sm:py-10">
          {children}
        </main>

        <ChatWidget />
      </body>
    </html>
  );
}
