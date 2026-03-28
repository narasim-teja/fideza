import Link from "next/link";
import Image from "next/image";
import { WalletButton } from "./wallet-button";

export function Navbar() {
  return (
    <nav className="fixed top-0 z-50 w-full h-14 bg-card border-b border-border">
      <div className="mx-auto max-w-7xl h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <Link href="/marketplace" className="flex items-center gap-2.5">
          <Image
            src="/rayls_logo.svg"
            alt="Rayls"
            width={28}
            height={28}
            className="rounded"
          />
          <span className="text-lg font-semibold text-fideza-lavender tracking-tight">
            Fideza
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <Link
            href="/marketplace"
            className="px-3 py-1.5 text-sm font-medium text-foreground rounded-md hover:bg-muted transition-colors"
          >
            Marketplace
          </Link>
          <span className="px-3 py-1.5 text-sm font-medium text-muted-foreground cursor-default">
            Institution
          </span>
          <span className="px-3 py-1.5 text-sm font-medium text-muted-foreground cursor-default">
            Admin
          </span>
        </div>

        <WalletButton />
      </div>
    </nav>
  );
}
