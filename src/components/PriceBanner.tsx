// src/components/PriceBanner.tsx
import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, RefreshCcw, Radio } from 'lucide-react';

interface PriceBannerProps {
  solPrice?: number;
  cryptocardsPrice?: number; // optional fallback
  onRefresh?: () => void;
}

// CRYPTOCARDS token mint on Solana
const CRYPTOCARDS_MINT = 'AuxRtUDw7KhWZxbMcfqPoB1cLcvq44Sw83UHRd3Spump';

// Pump.fun stream link (coin page)
const PUMPFUN_URL = `https://pump.fun/coin/${CRYPTOCARDS_MINT}`;

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

  // LIVE status (null = unknown)
  const [liveStatus, setLiveStatus] = useState<boolean | null>(null);
  const [liveChecking, setLiveChecking] = useState(false);

  // Keep SOL price in sync with prop if parent passes it
  useEffect(() => {
    if (typeof solPrice === 'number' && !Number.isNaN(solPrice)) {
      setCurrentSolPrice(solPrice);
    }
  }, [solPrice]);

  // Keep CRYPTOCARDS price in sync with prop (used as fallback)
  useEffect(() => {
    if (
      typeof cryptocardsPrice === 'number' &&
      !Number.isNaN(cryptocardsPrice)
    ) {
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
        `https://lite-api.jup.ag/price/v3?ids=${encodeURIComponent(
          CRYPTOCARDS_MINT
        )}`
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

  // LIVE status comes from backend proxy (Pump.fun is CORS-blocked in browser)
  const fetchLiveStatusFromBackend = async () => {
    setLiveChecking(true);
    try {
      const res = await fetch('/pumpfun-live');
      if (!res.ok) {
        setLiveStatus(null);
        return;
      }
      const data = await res.json();
      if (typeof data?.live === 'boolean') {
        setLiveStatus(data.live);
      } else {
        setLiveStatus(null);
      }
    } catch {
      setLiveStatus(null);
    } finally {
      setLiveChecking(false);
    }
  };

  // On mount, pull fresh CRYPTOCARDS price + live status
  useEffect(() => {
    fetchCryptocardsPriceFromJupiter();
    fetchLiveStatusFromBackend();

    // Poll live status periodically (lightweight)
    const t = window.setInterval(() => {
      fetchLiveStatusFromBackend();
    }, 30000);

    return () => window.clearInterval(t);
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

      // Also refresh live status on manual refresh
      await fetchLiveStatusFromBackend();
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

  const liveLabel = useMemo(() => {
    if (liveStatus === true) return 'LIVE NOW — Watch stream';
    if (liveStatus === false) return 'OFFLINE — Pump.fun stream';
    return 'Stream status — Click to open';
  }, [liveStatus]);

  const liveDotClass = useMemo(() => {
    if (liveStatus === true) return 'bg-emerald-500';
    if (liveStatus === false) return 'bg-muted-foreground/60';
    return 'bg-muted-foreground/40';
  }, [liveStatus]);

  return (
    // IMPORTANT: banner row stays exactly the same, we just stack a tiny row under it
    <div className="fixed top-[20px] left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-1">
      {/* ORIGINAL BANNER (unchanged layout) */}
      <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg border border-primary/30 bg-background/80 shadow-lg backdrop-blur-md">
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

        {/* Divider */}
        <div className="w-px h-4 bg-border/50" />

        {/* CRYPTOCARDS Price */}
        <div className="flex items-center gap-1.5 text-[9px]">
          <img
            src="/cryptocards-cc.png"
            alt="CRYPTOCARDS"
            className="w-7 h-7 object-contain -translate-y-[4px]" // keep your existing offset
          />
          <span className="text-muted-foreground font-medium">
            CRYPTOCARDS:
          </span>
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
          aria-label="Refresh prices"
          title="Refresh prices"
        >
          <RefreshCcw className="w-3 h-3" />
        </button>
      </div>

      {/* NEW: LIVE/OFFLINE LINE UNDER BANNER (clickable) */}
      <a
        href={PUMPFUN_URL}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-2 px-2 py-1 rounded-md border border-primary/20 bg-background/70 backdrop-blur-md shadow-sm hover:bg-primary/10"
        style={{ fontSize: 9, lineHeight: '12px' }}
        title={PUMPFUN_URL}
      >
        <span className={`inline-block w-2 h-2 rounded-full ${liveDotClass}`} />
        <Radio className="w-3 h-3 opacity-80" />
        <span className="text-muted-foreground font-medium">{liveLabel}</span>

        {/* tiny spinner feel without changing your icon set */}
        {liveChecking ? (
          <span className="text-muted-foreground/70">…</span>
        ) : null}
      </a>
    </div>
  );
}
