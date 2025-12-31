// src/components/PublicDashboard.tsx
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/languageStore';
import { toast } from 'sonner';
import {
  Loader2,
  RefreshCcw,
  Flame,
  Globe2,
  ExternalLink,
  Copy,
  ArrowUpRight,
} from 'lucide-react';
import { useTokenLookup } from '@/hooks/useTokenLookup';

interface PublicMetrics {
  total_cards_funded: number;
  total_volume_funded_sol: number;
  total_volume_funded_fiat: number;
  total_volume_claimed_sol: number;
  total_volume_claimed_fiat: number;
  protocol_burns_sol: number;
  protocol_burns_fiat: number;
  burn_wallet?: string;
  last_updated?: string;
}

type ActivityType = 'CREATED' | 'FUNDED' | 'LOCKED' | 'CLAIMED' | 'REFUNDED';

interface PublicActivityEvent {
  id?: string;
  card_id: string;
  type: ActivityType;
  token_amount: number | null;
  sol_amount: number | null;
  fiat_value: number | null;
  currency: string | null;
  timestamp: string;
  tx_signature?: string | null;
  token_mint?: string | null;
}

interface SolPriceResponse {
  price_usd?: number;
  sol_price_usd?: number;
}

function formatDateTime(iso?: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortTime(iso?: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Props for a single activity row
interface ActivityRowProps {
  evt: PublicActivityEvent;
  idx: number;
  solPrice: number | null;
  labelForType: (type: ActivityType) => string;
  pillClassForType: (type: ActivityType) => string;
  handleCopy: (value: string, label: string) => void;
}

function ActivityRow({
  evt,
  idx,
  solPrice,
  labelForType,
  pillClassForType,
  handleCopy,
}: ActivityRowProps) {
  // Look up token info from mint (if present)
  const mint = evt.token_mint || '';
  const { tokenInfo } = useTokenLookup(mint);

  const sol = evt.sol_amount ?? 0;
  const tokenAmount = evt.token_amount ?? sol;

  const price = solPrice && solPrice > 0 ? solPrice : null;
  const fiat =
    evt.fiat_value && evt.fiat_value > 0
      ? evt.fiat_value
      : price && sol > 0
      ? sol * price
      : 0;

  const currency = evt.currency || 'USD';
  const tokenSymbol = tokenInfo?.symbol || 'TOKEN';

  return (
    <div
      key={evt.id || `${evt.card_id}-${evt.timestamp}-${idx}`}
      className="rounded-md bg-card/70 border border-border/40 px-2 py-1.5"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span
            className={
              'inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-semibold ' +
              pillClassForType(evt.type)
            }
          >
            {labelForType(evt.type).toUpperCase()}
          </span>
          <span className="text-[8px] text-muted-foreground">
            {formatShortTime(evt.timestamp)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[8px] uppercase tracking-wide text-muted-foreground">
            Card ID
          </span>
          <span className="text-[9px] font-mono truncate max-w-[90px]">
            {evt.card_id}
          </span>
          <button
            type="button"
            onClick={() => handleCopy(evt.card_id, 'Card ID')}
            className="inline-flex h-4 w-4 items-center justify-center rounded bg-background/60 border border-border/40 hover:border-primary/60"
          >
            <Copy className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="mt-1 grid grid-cols-3 gap-2">
        <div>
          <div className="text-[8px] uppercase tracking-wide text-muted-foreground">
            Token
          </div>
          <div className="text-[10px] font-semibold">
            {tokenAmount.toFixed(6)} {tokenSymbol}
          </div>
        </div>
        <div>
          <div className="text-[8px] uppercase tracking-wide text-muted-foreground">
            SOL
          </div>
          <div className="text-[10px] font-semibold">
            {sol.toFixed(6)} SOL
          </div>
        </div>
        <div>
          <div className="text-[8px] uppercase tracking-wide text-muted-foreground">
            Fiat
          </div>
          <div className="text-[10px] font-semibold">
            {currency} {fiat.toFixed(2)}
          </div>
        </div>
      </div>

      {evt.tx_signature && (
        <div className="mt-1 flex items-center justify-end">
          <a
            href={`https://solscan.io/tx/${evt.tx_signature}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[8px] text-primary hover:text-primary/80"
          >
            <ArrowUpRight className="w-3 h-3" />
            View tx
          </a>
        </div>
      )}
    </div>
  );
}

export function PublicDashboard() {
  const { t } = useLanguage();

  const [metrics, setMetrics] = useState<PublicMetrics | null>(null);
  const [activity, setActivity] = useState<PublicActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [solPrice, setSolPrice] = useState<number | null>(null);

  const fetchSolPrice = async () => {
    try {
      const res = await fetch('/sol-price');
      if (!res.ok) return;
      const data: SolPriceResponse = await res.json();
      const price =
        typeof data.price_usd === 'number' ? data.price_usd : data.sol_price_usd;
      if (typeof price === 'number') {
        setSolPrice(price);
      }
    } catch (err) {
      console.error('PublicDashboard: failed to fetch SOL price', err);
    }
  };

  const fetchMetricsAndActivity = async () => {
    setLoading(true);
    try {
      // Metrics
      try {
        const res = await fetch('/public-metrics');
        if (res.ok) {
          const data = (await res.json()) as Partial<PublicMetrics>;
          setMetrics({
            total_cards_funded: data.total_cards_funded ?? 0,
            total_volume_funded_sol: data.total_volume_funded_sol ?? 0,
            total_volume_funded_fiat: data.total_volume_funded_fiat ?? 0,
            total_volume_claimed_sol: data.total_volume_claimed_sol ?? 0,
            total_volume_claimed_fiat: data.total_volume_claimed_fiat ?? 0,
            protocol_burns_sol: data.protocol_burns_sol ?? 0,
            protocol_burns_fiat: data.protocol_burns_fiat ?? 0,
            burn_wallet: data.burn_wallet,
            last_updated: data.last_updated,
          });
        } else {
          console.warn(
            'PublicDashboard: /public-metrics not OK, falling back to /stats'
          );
          const statsRes = await fetch('/stats');
          if (statsRes.ok) {
            const stats = await statsRes.json();
            setMetrics({
              total_cards_funded: stats.total_cards_funded ?? 0,
              total_volume_funded_sol: stats.total_volume_funded_sol ?? 0,
              total_volume_funded_fiat: stats.total_volume_funded_fiat ?? 0,
              total_volume_claimed_sol: stats.total_volume_claimed_sol ?? 0,
              total_volume_claimed_fiat: stats.total_volume_claimed_fiat ?? 0,
              protocol_burns_sol:
                stats.protocol_burns_sol ?? stats.total_burned ?? 0,
              protocol_burns_fiat:
                stats.protocol_burns_fiat ?? stats.total_burned_fiat ?? 0,
              burn_wallet: stats.burn_wallet,
              last_updated: stats.last_updated,
            });
          }
        }
      } catch (err) {
        console.error('PublicDashboard: metrics fetch failed', err);
      }

      // Activity
      try {
        const res = await fetch('/public-activity');
        if (res.ok) {
          const data = await res.json();
          const events = Array.isArray(data?.events)
            ? data.events
            : Array.isArray(data)
            ? data
            : [];
          setActivity(events as PublicActivityEvent[]);
        }
      } catch (err) {
        console.error('PublicDashboard: activity fetch failed', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchSolPrice();
    fetchMetricsAndActivity();
  };

  useEffect(() => {
    fetchSolPrice();
    fetchMetricsAndActivity();
  }, []);

  const enrichedMetrics = useMemo(() => {
    if (!metrics) return null;

    const price = solPrice && solPrice > 0 ? solPrice : null;

    const fundedFiat =
      metrics.total_volume_funded_fiat && metrics.total_volume_funded_fiat > 0
        ? metrics.total_volume_funded_fiat
        : price && metrics.total_volume_funded_sol > 0
        ? metrics.total_volume_funded_sol * price
        : 0;

    const claimedFiat =
      metrics.total_volume_claimed_fiat && metrics.total_volume_claimed_fiat > 0
        ? metrics.total_volume_claimed_fiat
        : price && metrics.total_volume_claimed_sol > 0
        ? metrics.total_volume_claimed_sol * price
        : 0;

    const burnsFiat =
      metrics.protocol_burns_fiat && metrics.protocol_burns_fiat > 0
        ? metrics.protocol_burns_fiat
        : price && metrics.protocol_burns_sol > 0
        ? metrics.protocol_burns_sol * price
        : 0;

    return {
      ...metrics,
      fundedFiat,
      claimedFiat,
      burnsFiat,
    };
  }, [metrics, solPrice]);

  const topTenEvents = useMemo(() => {
    if (!activity || activity.length === 0) return [];
    const sorted = [...activity].sort((a, b) => {
      const ta = new Date(a.timestamp).getTime();
      const tb = new Date(b.timestamp).getTime();
      return tb - ta; // newest first
    });
    return sorted.slice(0, 10);
  }, [activity]);

  const activityBootstrapping =
    (!topTenEvents || topTenEvents.length === 0) &&
    (!enrichedMetrics || enrichedMetrics.total_cards_funded === 0);

  const labelForType = (type: ActivityType) => {
    switch (type) {
      case 'CREATED':
        return 'Created';
      case 'FUNDED':
        return 'Funded';
      case 'LOCKED':
        return 'Locked';
      case 'CLAIMED':
        return 'Claimed';
      case 'REFUNDED':
        return 'Refunded';
      default:
        return type;
    }
  };

  const pillClassForType = (type: ActivityType) => {
    switch (type) {
      case 'CREATED':
        return 'bg-primary/10 text-primary border border-primary/30';
      case 'FUNDED':
        return 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40';
      case 'LOCKED':
        return 'bg-amber-500/15 text-amber-400 border border-amber-500/40';
      case 'CLAIMED':
        return 'bg-purple-500/15 text-purple-400 border border-purple-500/40';
      case 'REFUNDED':
        return 'bg-rose-500/15 text-rose-400 border border-rose-500/40';
      default:
        return 'bg-muted text-muted-foreground border border-border/40';
    }
  };

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  return (
    <section className="glass-card rounded-xl p-3 mt-5 shadow-card hover:shadow-card-hover transition-all">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-3">
        <h2 className="text-xs font-black gradient-text tracking-[0.25em] uppercase">
          NETWORK ACTIVITY &amp; BURNS
        </h2>
        <p className="text-[9px] text-muted-foreground mt-1 max-w-md">
          Live mainnet view of funded, locked, and claimed{' '}
          <span className="font-semibold text-primary">CRYPTOCARDS</span> — plus
          protocol burn activity.
        </p>
      </div>

      {/* Top controls */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-[8px] text-muted-foreground">
          <Globe2 className="w-3 h-3 text-primary" />
          {enrichedMetrics?.last_updated && (
            <span>
              Last updated:{' '}
              <span className="font-semibold">
                {formatDateTime(enrichedMetrics.last_updated)}
              </span>
            </span>
          )}
          {solPrice !== null && (
            <span className="ml-2">
              SOL:{' '}
              <span className="font-semibold">
                ${solPrice.toFixed(2)} USD
              </span>
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-[9px] flex items-center gap-1"
          onClick={handleRefresh}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Refresh
            </>
          ) : (
            <>
              <RefreshCcw className="w-3 h-3" />
              Refresh
            </>
          )}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <div className="rounded-lg bg-primary/5 border border-primary/30 px-2 py-1.5 text-center">
          <div className="text-[8px] uppercase tracking-wide text-muted-foreground mb-0.5">
            Total cards funded
          </div>
          <div className="text-[13px] font-black text-primary">
            {enrichedMetrics?.total_cards_funded ?? 0}
          </div>
        </div>

        <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/40 px-2 py-1.5 text-center">
          <div className="text-[8px] uppercase tracking-wide text-muted-foreground mb-0.5">
            Total volume funded
          </div>
          <div className="text-[11px] font-black text-emerald-400 leading-tight">
            {(enrichedMetrics?.total_volume_funded_sol ?? 0).toFixed(4)} SOL
          </div>
          <div className="text-[8px] text-muted-foreground">
            ≈ ${(enrichedMetrics?.fundedFiat ?? 0).toFixed(2)} USD
          </div>
        </div>

        <div className="rounded-lg bg-purple-500/5 border border-purple-500/40 px-2 py-1.5 text-center">
          <div className="text-[8px] uppercase tracking-wide text-muted-foreground mb-0.5">
            Total value claimed
          </div>
          <div className="text-[11px] font-black text-purple-400 leading-tight">
            {(enrichedMetrics?.total_volume_claimed_sol ?? 0).toFixed(4)} SOL
          </div>
          <div className="text-[8px] text-muted-foreground">
            ≈ ${(enrichedMetrics?.claimedFiat ?? 0).toFixed(2)} USD
          </div>
        </div>

        <div className="rounded-lg bg-rose-500/5 border border-rose-500/40 px-2 py-1.5 text-center">
          <div className="flex items-center justify-center gap-1 mb-0.5">
            <Flame className="w-3 h-3 text-rose-400" />
            <span className="text-[8px] uppercase tracking-wide text-muted-foreground">
              Protocol burns
            </span>
          </div>
          <div className="text-[11px] font-black text-rose-400 leading-tight">
            {(enrichedMetrics?.protocol_burns_sol ?? 0).toFixed(4)} SOL
          </div>
          <div className="text-[8px] text-muted-foreground mb-0.5">
            ≈ ${(enrichedMetrics?.burnsFiat ?? 0).toFixed(2)} USD
          </div>
        </div>
      </div>

      {/* Bottom section: Recent activity + burn mechanics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Recent activity */}
        <div className="md:col-span-2 rounded-lg border border-border/40 bg-background/60 p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-semibold uppercase tracking-wide">
              Recent mainnet activity
            </span>
          </div>

          {activityBootstrapping && !loading && (
            <div className="text-[9px] text-muted-foreground py-4 text-center">
              Activity bootstrapping… create, fund, and claim{' '}
              <span className="font-semibold text-primary">CRYPTOCARDS</span> to
              populate this feed.
            </div>
          )}

          {!activityBootstrapping &&
            topTenEvents.length === 0 &&
            !loading && (
              <div className="text-[9px] text-muted-foreground py-4 text-center">
                No recent mainnet events recorded yet.
              </div>
            )}

          {topTenEvents.length > 0 && (
            <div className="mt-1 max-h-56 overflow-y-auto space-y-1.5">
              {topTenEvents.map((evt, idx) => (
                <ActivityRow
                  key={evt.id || `${evt.card_id}-${evt.timestamp}-${idx}`}
                  evt={evt}
                  idx={idx}
                  solPrice={solPrice}
                  labelForType={labelForType}
                  pillClassForType={pillClassForType}
                  handleCopy={handleCopy}
                />
              ))}
            </div>
          )}

          {loading && (
            <div className="mt-2 flex items-center justify-center text-[9px] text-muted-foreground">
              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
              Loading network activity…
            </div>
          )}
        </div>

        {/* Burn mechanics / tax info */}
        <div className="md:col-span-1 rounded-lg border border-border/40 bg-background/60 p-2.5">
          <div className="flex items-center gap-2 mb-1.5">
            <Flame className="w-3 h-3 text-rose-400" />
            <span className="text-[9px] font-semibold uppercase tracking-wide">
              Burn mechanics
            </span>
          </div>
          <p className="text-[9px] text-muted-foreground mb-2">
            A <span className="font-semibold text-primary">1.5% protocol tax</span>{' '}
            is applied to the SOL balance on every funded &amp; locked
            CRYPTOCARD. Tax proceeds swap to{' '}
            <span className="font-semibold">$CRYPTOCARDS</span> and are sent to a
            public burn wallet.
          </p>
          <p className="text-[9px] text-muted-foreground mb-2">
            Burns are triggered automatically whenever the burn wallet reaches a
            configured SOL threshold, permanently reducing circulating supply.
          </p>
          {enrichedMetrics && (
            <>
              <div className="mt-2 rounded-md bg-rose-500/10 border border-rose-500/40 px-2 py-1.5">
                <div className="text-[8px] uppercase tracking-wide text-rose-200 mb-0.5">
                  Estimated protocol tax (lifetime)
                </div>
                <div className="text-[10px] font-semibold text-rose-100">
                  {(enrichedMetrics.protocol_burns_sol ?? 0).toFixed(6)} SOL • $
                  {(enrichedMetrics.burnsFiat ?? 0).toFixed(2)} USD
                </div>
              </div>

              <div className="mt-2 rounded-md bg-card/70 border border-border/50 px-2 py-1.5 space-y-1.5">
                <div className="text-[8px] uppercase tracking-wide text-muted-foreground">
                  Protocol wallets
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9px] text-muted-foreground">
                      Fee wallet
                    </span>
                    <div className="flex items-center gap-1">
                      <a
                        href="https://solscan.io/account/31qHCz3moBBbbCgwaHfHkHjy5y6e4A1Y1HDtQRsa5Ms2"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[9px] font-mono text-primary hover:text-primary/80"
                      >
                        31qH…Ms2
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            '31qHCz3moBBbbCgwaHfHkHjy5y6e4A1Y1HDtQRsa5Ms2',
                            'Fee wallet'
                          )
                        }
                        className="inline-flex h-4 w-4 items-center justify-center rounded bg-background/60 border border-border/40 hover:border-primary/60"
                      >
                        <Copy className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9px] text-muted-foreground">
                      Burn wallet
                    </span>
                    <div className="flex items-center gap-1">
                      <a
                        href="https://solscan.io/account/A3mpAVduHM9QyRgH1NSZp5ANnbPr2Z5vkXtc8EgDaZBF"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[9px] font-mono text-primary hover:text-primary/80"
                      >
                        A3mp…ZBF
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopy(
                            'A3mpAVduHM9QyRgH1NSZp5ANnbPr2Z5vkXtc8EgDaZBF',
                            'Burn wallet'
                          )
                        }
                        className="inline-flex h-4 w-4 items-center justify-center rounded bg-background/60 border border-border/40 hover:border-primary/60"
                      >
                        <Copy className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
