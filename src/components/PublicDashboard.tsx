// src/components/PublicDashboard.tsx
import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/lib/languageStore';
import { cn } from '@/lib/utils';
import { apiService } from '@/services/api';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Flame,
  Globe2,
  Loader2,
  RefreshCcw,
  Shield,
  Sparkles,
} from 'lucide-react';

interface PublicMetrics {
  total_cards_funded: number;
  total_volume_funded_sol: number;
  total_volume_funded_fiat: number;
  total_volume_claimed_sol: number;
  total_volume_claimed_fiat: number;
  protocol_burns_sol: number;
  protocol_burns_fiat: number;
  burn_wallet: string | null;
  last_updated: string | null;
}

type ActivityType = 'CREATED' | 'FUNDED' | 'LOCKED' | 'CLAIMED' | 'BURN';

interface PublicActivityEvent {
  card_id: string;
  type: ActivityType;
  token_amount: number | null;
  sol_amount: number | null;
  fiat_value: number | null;
  currency: string | null;
  token_mint?: string | null;
  timestamp: string;
}

interface SolPriceResponse {
  price_usd?: number;
  sol_price_usd?: number;
}

export function PublicDashboard() {
  const { t } = useLanguage();

  const [metrics, setMetrics] = useState<PublicMetrics | null>(null);
  const [activity, setActivity] = useState<PublicActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [tokenSymbols, setTokenSymbols] = useState<Record<string, string>>({});

  const fetchSolPrice = async () => {
    try {
      const res = await fetch('/sol-price');
      if (!res.ok) return;
      const data: SolPriceResponse = await res.json();
      const price = typeof data.price_usd === 'number' ? data.price_usd : data.sol_price_usd;
      if (typeof price === 'number') {
        setSolPrice(price);
      }
    } catch (err) {
      console.error('PublicDashboard: failed to fetch SOL price', err);
    }
  };

  useEffect(() => {
    if (!activity || activity.length === 0) return;

    const mints = Array.from(
      new Set(
        activity
          .map((evt: any) => (evt.token_mint as string | null) || null)
          .filter((m): m is string => !!m && m.length >= 32)
      )
    );

    const missing = mints.filter((m) => !tokenSymbols[m]);
    if (!missing.length) return;

    missing.forEach(async (mint) => {
      try {
        const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
        if (!res.ok) {
          setTokenSymbols((prev) => (prev[mint] ? prev : { ...prev, [mint]: 'TOKEN' }));
          return;
        }
        const data = await res.json();
        let symbol: string | null = null;
        const pairs: any = (data && (data.pairs || data.pair || data.data)) as any;
        if (Array.isArray(pairs) && pairs.length > 0 && pairs[0].baseToken) {
          symbol = pairs[0].baseToken.symbol || pairs[0].baseToken.name || null;
        }
        setTokenSymbols((prev) => ({
          ...prev,
          [mint]: symbol || 'TOKEN',
        }));
      } catch {
        setTokenSymbols((prev) => (prev[mint] ? prev : { ...prev, [mint]: 'TOKEN' }));
      }
    });
  }, [activity, tokenSymbols]);

  const fetchMetricsAndActivity = async () => {
    setLoading(true);
    try {
      // Metrics
      try {
        const res = await fetch('/public-metrics');
        if (res.ok) {
          const data = await res.json();
          const m: PublicMetrics = {
            total_cards_funded: data.total_cards_funded ?? data.cards_funded ?? 0,
            total_volume_funded_sol:
              data.total_volume_funded_sol ?? data.volume_funded_sol ?? 0,
            total_volume_funded_fiat:
              data.total_volume_funded_fiat ?? data.volume_funded_fiat ?? 0,
            total_volume_claimed_sol:
              data.total_volume_claimed_sol ?? data.volume_claimed_sol ?? 0,
            total_volume_claimed_fiat:
              data.total_volume_claimed_fiat ?? data.volume_claimed_fiat ?? 0,
            protocol_burns_sol:
              data.protocol_burns_sol ?? data.total_burned_sol ?? data.total_burned ?? 0,
            protocol_burns_fiat:
              data.protocol_burns_fiat ??
              data.total_burned_fiat ??
              (typeof data.total_burned === 'number'
                ? data.total_burned
                : 0),
            burn_wallet: data.burn_wallet ?? data.burn_address ?? null,
            last_updated: data.last_updated ?? data.updated_at ?? null,
          };
          setMetrics(m);
        } else {
          console.error('PublicDashboard: public-metrics failed with', res.status);
          try {
            const stats = await apiService.getStats();
            setMetrics({
              total_cards_funded: stats.total_funded ?? 0,
              total_volume_funded_sol: stats.total_funded ?? 0,
              total_volume_funded_fiat: 0,
              total_volume_claimed_sol: 0,
              total_volume_claimed_fiat: 0,
              protocol_burns_sol: stats.total_burned ?? 0,
              protocol_burns_fiat: 0,
              burn_wallet: null,
              last_updated: null,
            });
          } catch (err) {
            console.error('PublicDashboard: getStats fallback failed', err);
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
          const events = Array.isArray(data?.events) ? data.events : Array.isArray(data) ? data : [];
          setActivity(events as PublicActivityEvent[]);
        }
      } catch (err) {
        console.error('PublicDashboard: activity fetch failed', err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSolPrice();
    fetchMetricsAndActivity();
  }, []);

  const enrichedMetrics = useMemo(() => {
    if (!metrics) return null;

    const fundedSol = metrics.total_volume_funded_sol ?? 0;
    const claimedSol = metrics.total_volume_claimed_sol ?? 0;
    const burnsSol = metrics.protocol_burns_sol ?? 0;

    const fundedFiat =
      metrics.total_volume_funded_fiat && metrics.total_volume_funded_fiat > 0
        ? metrics.total_volume_funded_fiat
        : solPrice && fundedSol > 0
        ? fundedSol * solPrice
        : 0;

    const claimedFiat =
      metrics.total_volume_claimed_fiat && metrics.total_volume_claimed_fiat > 0
        ? metrics.total_volume_claimed_fiat
        : solPrice && claimedSol > 0
        ? claimedSol * solPrice
        : 0;

    const burnsFiat =
      metrics.protocol_burns_fiat && metrics.protocol_burns_fiat > 0
        ? metrics.protocol_burns_fiat
        : solPrice && burnsSol > 0
        ? burnsSol * solPrice
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
      case 'BURN':
        return 'Burned';
      default:
        return type;
    }
  };

  const iconForType = (type: ActivityType) => {
    switch (type) {
      case 'CREATED':
        return <Sparkles className="w-3 h-3 text-primary" />;
      case 'FUNDED':
        return <ArrowUpRight className="w-3 h-3 text-emerald-400" />;
      case 'LOCKED':
        return <Shield className="w-3 h-3 text-cyan-300" />;
      case 'CLAIMED':
        return <ArrowDownRight className="w-3 h-3 text-indigo-300" />;
      case 'BURN':
        return <Flame className="w-3 h-3 text-rose-400" />;
      default:
        return <Activity className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const handleRefreshClick = () => {
    fetchSolPrice();
    fetchMetricsAndActivity();
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
          <span className="font-semibold text-primary">CRYPTOCARDS</span> — plus protocol burn
          activity.
        </p>
      </div>

      {/* Top controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
          <Globe2 className="w-3 h-3 text-primary" />
          <span>
            {t('publicDashboard.liveOnSolana') ||
              'Solana mainnet • On-chain backed gift cards • Transparent burn mechanics.'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-[8px] text-muted-foreground">
            {enrichedMetrics?.last_updated && (
              <span>
                Last updated:{' '}
                <span className="font-semibold text-foreground">
                  {new Date(enrichedMetrics.last_updated).toLocaleString()}
                </span>
              </span>
            )}
          </div>
          <button
            onClick={handleRefreshClick}
            disabled={loading}
            className="inline-flex items-center gap-1 px-2 py-1 text-[8px] rounded-full border border-border/50 hover:border-primary/60 hover:bg-primary/5 transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Refreshing
              </>
            ) : (
              <>
                <RefreshCcw className="w-3 h-3" />
                Refresh
              </>
            )}
          </button>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
        {/* Total cards funded */}
        <div className="bg-card/60 border border-border/40 rounded-lg p-3 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[8px] uppercase tracking-wide text-muted-foreground">
              Cards funded
            </span>
            <Activity className="w-3 h-3 text-primary" />
          </div>
          <div className="text-[18px] font-black text-primary">
            {enrichedMetrics?.total_cards_funded?.toLocaleString() ?? '0'}
          </div>
          <div className="text-[8px] text-muted-foreground">
            Total number of CRYPTOCARDS that received on-chain deposits.
          </div>
        </div>

        {/* Volume funded */}
        <div className="bg-card/60 border border-border/40 rounded-lg p-3 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[8px] uppercase tracking-wide text-muted-foreground">
              Volume funded
            </span>
            <ArrowUpRight className="w-3 h-3 text-emerald-400" />
          </div>
          <div className="text-[13px] font-semibold text-emerald-300">
            {(enrichedMetrics?.total_volume_funded_sol ?? 0).toFixed(4)} SOL
          </div>
          <div className="text-[8px] text-muted-foreground">
            ≈{' '}
            {(enrichedMetrics?.fundedFiat ?? 0).toLocaleString(undefined, {
              maximumFractionDigits: 2,
              minimumFractionDigits: 2,
            })}{' '}
            USD
          </div>
        </div>

        {/* Volume claimed */}
        <div className="bg-card/60 border border-border/40 rounded-lg p-3 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[8px] uppercase tracking-wide text-muted-foreground">
              Volume claimed
            </span>
            <ArrowDownRight className="w-3 h-3 text-indigo-300" />
          </div>
          <div className="text-[13px] font-semibold text-indigo-200">
            {(enrichedMetrics?.total_volume_claimed_sol ?? 0).toFixed(4)} SOL
          </div>
          <div className="text-[8px] text-muted-foreground">
            ≈{' '}
            {(enrichedMetrics?.claimedFiat ?? 0).toLocaleString(undefined, {
              maximumFractionDigits: 2,
              minimumFractionDigits: 2,
            })}{' '}
            USD
          </div>
        </div>

        {/* Protocol burns */}
        <div className="bg-card/60 border border-border/40 rounded-lg p-3 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[8px] uppercase tracking-wide text-muted-foreground">
              Protocol burns
            </span>
            <Flame className="w-3 h-3 text-rose-400" />
          </div>
          <div className="text-[13px] font-semibold text-rose-300">
            {(enrichedMetrics?.protocol_burns_sol ?? 0).toFixed(4)} SOL
          </div>
          <div className="text-[8px] text-muted-foreground">
            ≈{' '}
            {(enrichedMetrics?.burnsFiat ?? 0).toLocaleString(undefined, {
              maximumFractionDigits: 2,
              minimumFractionDigits: 2,
            })}{' '}
            USD burned
          </div>
          {enrichedMetrics?.burn_wallet && (
            <div className="text-[7px] text-muted-foreground break-all mt-1">
              Burn wallet:{' '}
              <span className="font-mono text-foreground">
                {enrichedMetrics.burn_wallet}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Activity list */}
      <div className="bg-card/60 border border-border/40 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-[0.18em]">
            Recent on-chain activity
          </span>
          <span className="text-[8px] text-muted-foreground">
            Showing last {topTenEvents.length} events
          </span>
        </div>

        {activityBootstrapping ? (
          <div className="text-[8px] text-muted-foreground">
            Once mainnet activity starts, you&#39;ll see live funding, locking, claiming, and burn
            events here.
          </div>
        ) : topTenEvents.length === 0 ? (
          <div className="text-[8px] text-muted-foreground">
            No public activity has been recorded yet.
          </div>
        ) : (
          <div className="mt-1 max-h-56 overflow-y-auto space-y-1.5">
            {topTenEvents.map((evt, idx) => {
              const sol = evt.sol_amount ?? 0;
              const token = evt.token_amount ?? sol;
              const tokenMint = (evt as any).token_mint as string | null;
              const tokenSymbol = (tokenMint && tokenSymbols[tokenMint]) || 'TOKEN';
              const price = solPrice && solPrice > 0 ? solPrice : null;
              const fiat =
                evt.fiat_value && evt.fiat_value > 0
                  ? evt.fiat_value
                  : price && sol > 0
                  ? sol * price
                  : 0;
              const currency = evt.currency || 'USD';

              return (
                <div
                  key={`${evt.card_id}-${evt.type}-${evt.timestamp}-${idx}`}
                  className="flex items-start gap-2 text-[8px] text-muted-foreground border-b border-border/20 last:border-b-0 pb-1.5"
                >
                  <div className="mt-0.5">{iconForType(evt.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <span
                          className={cn(
                            'px-1.5 py-0.5 rounded-full border text-[7px] font-semibold uppercase tracking-[0.14em]',
                            evt.type === 'FUNDED' && 'border-emerald-400/60 text-emerald-300',
                            evt.type === 'LOCKED' && 'border-cyan-400/60 text-cyan-300',
                            evt.type === 'CLAIMED' && 'border-indigo-400/60 text-indigo-200',
                            evt.type === 'BURN' && 'border-rose-400/60 text-rose-300',
                            evt.type === 'CREATED' && 'border-primary/60 text-primary'
                          )}
                        >
                          {labelForType(evt.type)}
                        </span>
                        <span className="font-mono text-[7px] text-muted-foreground/80">
                          {evt.card_id}
                        </span>
                      </div>
                      <span className="text-[7px] text-muted-foreground">
                        {new Date(evt.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="mt-0.5 flex items-center justify-between gap-2">
                      <div className="flex flex-col gap-0.5">
                        <div className="text-[8px] uppercase tracking-wide text-muted-foreground">
                          Token
                        </div>
                        <div className="text-[10px] font-semibold">
                          {token.toFixed(6)} {tokenSymbol}
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
                      <div className="text-right">
                        <div className="text-[8px] uppercase tracking-wide text-muted-foreground">
                          Est. fiat
                        </div>
                        <div className="text-[10px] font-semibold">
                          {currency} {fiat.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer note */}
      <div className="mt-3 text-[8px] text-muted-foreground text-center">
        Metrics are approximate and may lag behind real-time on-chain activity. Always verify
        critical flows directly on Solana explorers.
      </div>
    </section>
  );
}
