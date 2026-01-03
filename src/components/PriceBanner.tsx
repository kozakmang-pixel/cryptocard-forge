// src/components/PriceBanner.tsx
import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, RefreshCcw } from 'lucide-react';

interface PriceBannerProps {
  solPrice?: number;
  cryptocardsPrice?: number; // optional fallback
  onRefresh?: () => void;
}

// CRYPTOCARDS token mint on Solana
const CRYPTOCARDS_MINT =
  '5hiNHHBFZ3R2b7r4cfVX92DzyGm4C8yzHKJNTyBrpump';

// Pump.fun stream link (clickable under banner)
const PUMPFUN_STREAM_URL =
  'https://pump.fun/coin/5hiNHHBFZ3R2b7r4cfVX92DzyGm4C8yzHKJNTyBrpump';

export function PriceBanner({
  solPrice,
  cryptocardsPrice = 0.00042,
  onRefresh,
}: PriceBannerProps) {
  const [currentSolPrice, setCurrentSolPrice] = useState<number>(
    typeof solPrice === 'number' ? solPrice : 0
  );
  const [currentCryptocardsPrice, setCurrentCryptocardsPrice] = useState<number>(
    typeof cryptocardsPrice === 'number' ? cryptocardsPrice : 0
  );
  const [refreshing, setRefreshing] = useState(false);

  // Pump.fun LIVE status (served by backend /pump-live)
  const [pumpLive, setPumpLive] = useState<boolean | null>(null);

  // Keep SOL price in sync with prop if parent passes it
  useEffect(() => {
    if (typeof solPrice === 'number' && !Number.isNaN(solPrice)) {
      setCurrentSolPrice(solPrice);
    }
  }, [solPrice]);

  // Keep CRYPTOCARDS price in sync with prop (used as fallback)
  useEffect(() => {
    if (typeof cryptocardsPrice === 'number' && !Number.isNaN(cryptocardsPrice)) {
      setCurrentCryptocardsPrice(cryptocardsPrice);
    }
  }, [cryptocardsPrice]);

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
      if (typeof price === 'number' && !Number.isNaN(price) && price > 0) {
        setCurrentSolPrice(price);
      }
    } catch {
      // swallow errors; banner just won't update
    }
  };

  // Fetch CRYPTOCARDS price directly from Jupiter (same endpoint style as backend)
  const fetchCryptocardsPriceFromJupiter = async () => {
    try {
      const res = await fetch(
        `https://lite-api.jup.ag/price/v3?ids=${encodeURIComponent(CRYPTOCARDS_MINT)}`
      );
      if (!res.ok) return;
      const body = await res.json();
      const entry = body?.[CRYPTOCARDS_MINT];

      // Backend uses entry.usdPrice; also fall back to entry.price just in case
      const price =
        typeof entry?.usdPrice === 'number'
          ? entry.usdPrice
          : typeof entry?.price === 'number'
          ? entry.price
          : null;

      if (typeof price === 'number' && !Number.isNaN(price) && price > 0) {
        setCurrentCryptocardsPrice(price);
      }
    } catch {
      // swallow errors; leave previous price / fallback
    }
  };

  const fetchPumpLiveStatus = async () => {
    try {
      const res = await fetch('/pump-live');
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data?.live === 'boolean') {
        setPumpLive(data.live);
      } else {
        setPumpLive(null);
      }
    } catch {
      // swallow errors
    }
  };

  // On mount, pull fresh CRYPTOCARDS price + pump live status
  useEffect(() => {
    fetchCryptocardsPriceFromJupiter();
    fetchPumpLiveStatus();

    const t = setInterval(() => {
      fetchPumpLiveStatus();
    }, 30_000);

    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefreshClick = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      if (onRefresh) {
        await Promise.resolve(onRefresh());
      } else {
        await fetchSolPriceFromBackend();
      }
      // Always refresh CRYPTOCARDS price too
      await fetchCryptocardsPriceFromJupiter();
      // Also refresh live status
      await fetchPumpLiveStatus();
    } finally {
      setRefreshing(false);
    }
  };

  const displaySolPrice =
    typeof currentSolPrice === 'number' && !Number.isNaN(currentSolPrice)
      ? currentSolPrice
      : 0;

  const displayCryptocardsPrice =
    typeof currentCryptocardsPrice === 'number' &&
    !Number.isNaN(currentCryptocardsPrice) &&
    currentCryptocardsPrice > 0
      ? currentCryptocardsPrice
      : typeof cryptocardsPrice === 'number'
      ? cryptocardsPrice
      : 0;

  const liveLabel =
    pumpLive === true
      ? 'LIVE on Pump.fun'
      : pumpLive === false
      ? 'OFFLINE — Watch on Pump.fun'
      : 'Pump.fun — checking…';

  const dotClass =
    pumpLive === true
      ? 'bg-accent'
      : pumpLive === false
      ? 'bg-warning'
      : 'bg-border';

  return (
    <div className="fixed top-[20px] left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 rounded-lg border border-primary/30 bg-background/80 shadow-lg backdrop-blur-md">
      <div className="flex items-center gap-3">
        {/* SOL Price */}
        <div className="flex items-center gap-1.5 text-[9px]">
          <img
            src="https://cryptologos.cc/logos/solana-sol-logo.svg"
            alt="SOL"
            className="w-4 h-4"
          />
          <span className="text-muted-foreground font-medium">SOL:</span>
          <span className="text-primary font-bold">${displaySolPrice.toFixed(2)}</span>
          <TrendingUp className="w-3 h-3 text-accent" />
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-border/50" />

        {/* CRYPTOCARDS Price */}
        <div className="flex items-center gap-1.5 text-[9px]">
          <img
            src="/cryptocards-cc.png"
            alt="CRYPTOCARDS"
            className="w-7 h-7 object-contain -translate-y-[4px]" // keep your existing offset
          />
          <span className="text-muted-foreground font-medium">CRYPTOCARDS:</span>
          <span className="text-accent font-bold">
            ${displayCryptocardsPrice.toFixed(5)}
          </span>
          <TrendingDown className="w-3 h-3 text-warning" />
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-border/50" />

        {/* Refresh icon only */}
        <button
          type="button"
          onClick={handleRefreshClick}
          disabled={refreshing}
          className="flex items-center px-2 py-1 rounded-md border border-primary/40 bg-card/80 text-[8px] font-semibold hover:bg-primary/15 hover:border-primary/60 disabled:opacity-50 disabled:hover:bg-card/80 disabled:cursor-not-allowed"
        >
          <RefreshCcw className="w-3 h-3" />
        </button>
      </div>

      {/* Pump.fun LIVE / OFFLINE line (under banner) */}
      <div className="mt-0.5 flex items-center justify-center text-[8px]">
        <a
          href={PUMPFUN_STREAM_URL}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-muted-foreground hover:text-primary"
          title="Open Pump.fun"
        >
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotClass}`} />
          <span className="font-semibold">{liveLabel}</span>
        </a>
      </div>
    </div>
  );
}
