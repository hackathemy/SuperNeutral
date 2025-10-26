"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition">
            SuperNeutral
          </h1>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/borrow"
            className={`font-medium transition ${
              isActive("/borrow")
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
            }`}
          >
            🏦 Borrow
          </Link>
          <Link
            href="/supply"
            className={`font-medium transition ${
              isActive("/supply")
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
            }`}
          >
            💰 Supply
          </Link>
          <Link
            href="/my-loans"
            className={`font-medium transition ${
              isActive("/my-loans")
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
            }`}
          >
            🎫 My Positions
          </Link>
          <Link
            href="/dashboard"
            className={`font-medium transition ${
              isActive("/dashboard")
                ? "text-indigo-600 dark:text-indigo-400"
                : "text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
            }`}
          >
            📊 Dashboard
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
