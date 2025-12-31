// src/components/PriceBanner.tsx
import { TrendingUp, TrendingDown, RefreshCcw } from 'lucide-react';

interface PriceBannerProps {
  solPrice: number;
  cryptocardsPrice?: number;
  onRefresh?: () => void;
}

export function PriceBanner({
  solPrice,
  cryptocardsPrice = 0.00042,
  onRefresh,
}: PriceBannerProps) {
  return (
    <div className="fixed top-[20px] left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-3 py-1.5 rounded-lg border border-primary/30 bg-background/80 shadow-lg backdrop-blur-md">
      {/* SOL Price */}
      <div className="flex items-center gap-1.5 text-[9px]">
        <img
          src="https://cryptologos.cc/logos/solana-sol-logo.svg"
          alt="SOL"
          className="w-4 h-4"
        />
        <span className="text-muted-foreground font-medium">SOL:</span>
        <span className="text-primary font-bold">
          ${solPrice.toFixed(2)}
        </span>
        <TrendingUp className="w-3 h-3 text-accent" />
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-border/50" />

      {/* CRYPTOCARDS Price (placeholder for now) */}
      <div className="flex items-center gap-1.5 text-[9px]">
        <span className="text-[8px] bg-gradient-to-r from-primary/80 via-accent/80 to-secondary/80 text-primary-foreground px-1.5 py-0.5 rounded font-black">
          $CC
        </span>
        <span className="text-muted-foreground font-medium">
          CRYPTOCARDS:
        </span>
        <span className="text-accent font-bold">
          ${cryptocardsPrice.toFixed(5)}
        </span>
        <TrendingDown className="w-3 h-3 text-warning" />
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-border/50" />

      {/* Refresh button */}
      <button
        type="button"
        onClick={onRefresh}
        disabled={!onRefresh}
        className="flex items-center gap-1 px-2 py-1 rounded-md border border-primary/40 bg-card/80 text-[8px] font-semibold uppercase tracking-wide hover:bg-primary/15 hover:border-primary/60 disabled:opacity-50 disabled:hover:bg-card/80 disabled:cursor-not-allowed"
      >
        <RefreshCcw className="w-3 h-3" />
        <span>Refresh</span>
      </button>
    </div>
  );
}
