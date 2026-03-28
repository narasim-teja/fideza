"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useBalance } from "wagmi";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Copy, LogOut, Wallet, CircleDot } from "lucide-react";
import { truncateAddress, formatWei } from "@/lib/format";
import { toast } from "sonner";
import type { Address } from "viem";

export function WalletButton() {
  const { login, logout, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets[0];
  const address = wallet?.address as Address | undefined;

  const { data: balance } = useBalance({
    address,
    query: { enabled: !!address },
  });

  if (!authenticated) {
    return (
      <Button variant="outline" size="sm" onClick={login} className="gap-1.5">
        <Wallet className="size-3.5" />
        Connect Wallet
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5 font-mono text-xs">
            <CircleDot className="size-3 text-fideza-lime" />
            {address ? truncateAddress(address) : "Connected"}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-64">
        {address && (
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(address);
              toast.success("Address copied");
            }}
            className="font-mono text-[11px] gap-2 cursor-pointer"
          >
            <Copy className="size-3.5 shrink-0" />
            <span className="truncate">{address}</span>
          </DropdownMenuItem>
        )}
        {balance && (
          <div className="flex items-center gap-2 px-1.5 py-1 text-xs text-muted-foreground">
            <Wallet className="size-3.5" />
            {formatWei(balance.value)} {balance.symbol}
          </div>
        )}
        <div className="flex items-center gap-2 px-1.5 py-1 text-xs text-muted-foreground">
          <CircleDot className="size-3.5 text-fideza-lime" />
          Rayls Testnet
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={logout}
          className="text-xs gap-2 cursor-pointer"
          variant="destructive"
        >
          <LogOut className="size-3.5" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
