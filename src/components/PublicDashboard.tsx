import { useEffect, useState, useMemo } from 'react';
import { apiService } from '@/services/api';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/languageStore';

interface PublicStats {
  total_cards_funded: number;
  total_volume_sol: number;
  total_volume_usd: number;
  total_claimed_sol: number;
  total_claimed_usd: number;
  total_burns_sol: number;
  total_burns_usd: number;
  recent_events: Array<{
    id: string;
    public_id: string;
    created_at: string;
    event_type: 'CREATED' | 'FUNDED' | 'LOCKED' | 'CLAIMED';
    token_amount: number;
    currency: string | null;
    amount_fiat: number | null;
  }>;
}

export function PublicDashboard() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await apiService.getPublicDashboard();
      setStats(data as PublicStats);
    } catch (err) {
      console.error('PublicDashboard error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const recent = useMemo(
    () => (stats?.recent_events || []).slice(0, 10),
    [stats?.recent_events]
  );

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch {
      return iso;
    }
  };

  const formatUsd = (v: number | null | undefined) =>
    v && v > 0 ? `$${v.toFixed(2)} USD` : '$0.00 USD';

  const formatSol = (v: number | null | undefined) =>
    v && v > 0 ? `${v.toFixed(6)} SOL` : '0.000000 SOL';

  return (
    <section className="mt-10 glass-card rounded-2xl border border-border/40 bg-card/60 shadow-card">
      <div className="px-4 pt-4 pb-3 border-b border-border/30 flex items-center justify-between gap-2">
        <div className="flex-1 text-center">
          <h2 className="text-base md:text-lg font-black gradient-text uppercase tracking-wide">
            Network Activity &amp; Burns
          </h2>
          <p className="text-[10px] text-muted-foreground mt-1">
            Live mainnet view of funded, locked, and claimed CRYPTOCARDS — plus protocol burn
            activity.
          </p>
        </div>
        <Button
          size="icon"
          variant="outline"
          onClick={loadStats}
          disabled={loading}
          className="h-8 w-8 border-border/40"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {/* Top metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div className="bg-card/80 rounded-xl border border-border/40 p-3">
            <div className="text-[9px] font-semibold uppercase text-muted-foreground mb-1">
              Total cards funded
            </div>
            <div className="text-sm font-black gradient-text">
              {stats ? stats.total_cards_funded.toLocaleString() : '—'}
            </div>
          </div>

          <div className="bg-card/80 rounded-xl border border-border/40 p-3">
            <div className="text-[9px] font-semibold uppercase text-muted-foreground mb-1">
              Total volume funded
            </div>
            <div className="text-[11px] font-bold">
              {stats ? formatSol(stats.total_volume_sol) : '—'}
            </div>
            <div className="text-[9px] text-muted-foreground">
              {stats ? formatUsd(stats.total_volume_usd) : '$0.00 USD'}
            </div>
          </div>

          <div className="bg-card/80 rounded-xl border border-border/40 p-3">
            <div className="text-[9px] font-semibold uppercase text-muted-foreground mb-1">
              Total volume claimed
            </div>
            <div className="text-[11px] font-bold">
              {stats ? formatSol(stats.total_claimed_sol) : '—'}
            </div>
            <div className="text-[9px] text-muted-foreground">
              {stats ? formatUsd(stats.total_claimed_usd) : '$0.00 USD'}
            </div>
          </div>

          <div className="bg-card/80 rounded-xl border border-border/40 p-3">
            <div className="text-[9px] font-semibold uppercase text-muted-foreground mb-1">
              Protocol burns
            </div>
            <div className="text-[11px] font-bold">
              {stats ? formatSol(stats.total_burns_sol) : '—'}
            </div>
            <div className="text-[9px] text-muted-foreground">
              {stats ? formatUsd(stats.total_burns_usd) : '$0.00 USD'}
            </div>
          </div>
        </div>

        {/* Recent activity list – only 10 visible but scrollable if more */}
        <div className="bg-card/80 rounded-xl border border-border/40 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-semibold uppercase text-muted-foreground">
              Recent mainnet activity
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {recent.length === 0 && (
              <div className="text-[10px] text-muted-foreground text-center py-2">
                Activity bootstrapping… create, fund, and claim CRYPTOCARDS to populate this feed.
              </div>
            )}

            {recent.map((e) => {
              const token = e.token_amount || 0;
              const fiat = e.amount_fiat || 0;
              return (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-2 text-[9px] bg-background/40 border border-border/30 rounded-lg px-2 py-1.5"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold truncate">
                        {e.public_id || '—'}
                      </span>
                      <span className="text-[8px] uppercase text-muted-foreground">
                        {e.event_type}
                      </span>
                    </div>
                    <div className="text-[8px] text-muted-foreground">
                      {formatDateTime(e.created_at)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end text-right">
                    <span className="font-semibold">
                      {token.toFixed(6)} {e.currency || 'SOL'}
                    </span>
                    <span className="text-[8px] text-muted-foreground">
                      {fiat > 0 ? `$${fiat.toFixed(2)} USD` : '$0.00 USD'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-[8px] text-muted-foreground">
            <div>
              <div className="font-semibold uppercase mb-1">Estimated protocol tax (SOL)</div>
              <div>{stats ? formatSol(stats.total_burns_sol) : '0.000000 SOL'}</div>
            </div>
            <div>
              <div className="font-semibold uppercase mb-1">Estimated protocol tax (USD)</div>
              <div>{stats ? formatUsd(stats.total_burns_usd) : '$0.00 USD'}</div>
            </div>
            <div>
              <div className="font-semibold uppercase mb-1">Burn mechanics</div>
              <p>
                1.5% protocol tax swaps to $CRYPTOCARDS and is sent to a public burn wallet that
                auto-burns when threshold is reached.
              </p>
            </div>
          </div>
        </div>

        <div className="text-[9px] text-muted-foreground text-center">
          Data sourced from on-chain CRYPTOCARDS activity on Solana mainnet.
        </div>
      </div>
    </section>
  );
}
