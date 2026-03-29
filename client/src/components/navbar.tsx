"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { WalletButton } from "./wallet-button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/vaults", label: "Vaults" },
  { href: "/lending", label: "Lending" },
  { href: "/institution", label: "Institution" },
  { href: "/admin", label: "Admin" },
] as const;

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 z-50 w-full h-14 bg-card border-b border-border">
      <div className="mx-auto max-w-7xl h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <Link href="/vaults" className="flex items-center gap-2.5">
          <Image
            src="/fideza_logo.svg"
            alt="Fideza"
            width={28}
            height={28}
            className="rounded"
          />
          <span className="text-lg font-semibold text-fideza-lavender tracking-tight">
            Fideza
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "text-fideza-lavender bg-fideza-lavender/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <WalletButton />
      </div>
    </nav>
  );
}
