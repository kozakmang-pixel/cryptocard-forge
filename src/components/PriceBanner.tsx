// src/components/PriceBanner.tsx
import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, RefreshCcw } from 'lucide-react';

interface PriceBannerProps {
  solPrice?: number;
  cryptocardsPrice?: number;
  onRefresh?: () => void;
}

export function PriceBanner({
  solPrice,
  cryptocardsPrice = 0.00042,
  onRefresh,
}: PriceBannerProps) {
  const [currentSolPrice, setCurrentSolPrice] = useState<number>(
    typeof solPrice === 'number' ? solPrice : 0
  );
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (typeof solPrice === 'number' && !Number.isNaN(solPrice)) {
      setCurrentSolPrice(solPrice);
    }
  }, [solPrice]);

  const fetchSolPriceFromBackend = async () => {
    try {
      const res = await fetch('/sol-price');
      if (!res.ok) return;
      const data = await res.json();
      const price =
        typeof data.price_usd === 'number'
          ? data.price_usd
          : typeof data.sol_price_usd === 'number'
          ? data.sol_price_usd
          : null;
      if (typeof price === 'number') {
        setCurrentSolPrice(price);
      }
    } catch {}
  };

  const handleRefreshClick = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      if (onRefresh) await Promise.resolve(onRefresh());
      else await fetchSolPriceFromBackend();
    } finally {
      setRefreshing(false);
    }
  };

  const displaySolPrice =
    typeof currentSolPrice === 'number' && !Number.isNaN(currentSolPrice)
      ? currentSolPrice
      : 0;

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
          ${displaySolPrice.toFixed(2)}
        </span>
        <TrendingUp className="w-3 h-3 text-accent" />
      </div>

      <div className="w-px h-4 bg-border/50" />

      {/* CC Price */}
      <div className="flex items-center gap-1.5 text-[9px]">
        <img
          src="/cryptocards-cc.png"
          alt="CC"
          className="w-4 h-4 rounded-sm"
        />
        <span className="text-muted-foreground font-medium">CRYPTOCARDS:</span>
        <span className="text-accent font-bold">
          ${cryptocardsPrice.toFixed(5)}
        </span>
        <TrendingDown className="w-3 h-3 text-warning" />
      </div>

      <div className="w-px h-4 bg-border/50" />

      {/* Refresh (icon only) */}
      <button
        type="button"
        onClick={handleRefreshClick}
        disabled={refreshing}
        className="flex items-center px-2 py-1 rounded-md border border-primary/40 bg-card/80 text-[8px] font-semibold hover:bg-primary/15 hover:border-primary/60 disabled:opacity-50 disabled:hover:bg-card/80 disabled:cursor-not-allowed"
      >
        <RefreshCcw className="w-3 h-3" />
      </button>
    </div>
  );
}
