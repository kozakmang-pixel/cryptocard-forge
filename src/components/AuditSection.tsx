// src/components/AuditSection.tsx
import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/languageStore';
import { apiService } from '@/services/api';
import { toast } from 'sonner';
import {
  Loader2,
  Search,
  RefreshCcw,
  Shield,
  Activity,
  ExternalLink,
} from 'lucide-react';
import { useTokenLookup } from '@/hooks/useTokenLookup';

interface CardStatus {
  public_id: string;
  created_at: string;
  updated_at: string;
  funded: boolean;
  locked: boolean;
  claimed: boolean;
  refunded: boolean;
  token_amount: number | null;
  token_units?: number | null; // REAL token units snapshot (set by backend)
  amount_fiat: number | null;
  currency: string | null;
  deposit_address: string | null;
  template_url?: string | null;
  message?: string | null;
  expires_at?: string | null;
  token_mint?: string | null;
  token_symbol?: string | null;
}

interface CardBalanceResponse {
  deposit_address: string;
  lamports: number;
  sol: number;
  rpc?: string;
}

interface TokenPortfolioToken {
  mint: string;
  amount_ui: number;
  decimals: number;
  price_sol_per_token: number | null;
  total_value_sol: number | null;
}

interface TokenPortfolio {
  owner: string;
  total_value_sol: number;
  tokens: TokenPortfolioToken[];
}

interface SyncFundingResponse {
  public_id: string;
  deposit_address: string;
  lamports: number;
  sol: number; // alias for total_value_sol in some implementations
  sol_native: number;
  tokens_total_value_sol: number;
  total_value_sol: number;
  funded: boolean;
  locked: boolean;
  hasDeposit: boolean;
  token_portfolio?: TokenPortfolio;
  token_units?: number | null;
}

type TimelineType = 'created' | 'funded' | 'locked' | 'claimed' | 'refunded';

interface TimelineEvent {
  type: TimelineType;
  label: string;
  detail: string;
  at: string | null;
}

interface AmountView {
  tokenAmount: number;
  solValue: number;
  fiat: number;
  currency: string;
  tokenSymbol: string;
}

export function AuditSection() {
  const { t } = useLanguage();

  const [cardIdInput, setCardIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState<CardStatus | null>(null);
  const [balance, setBalance] = useState<CardBalanceResponse | null>(null);
  const [funding, setFunding] = useState<SyncFundingResponse | null>(null);
  const [solPrice, setSolPrice] = useState<number | null>(null);

  // token identity for this card
  const [tokenMint, setTokenMint] = useState<string>('');
  const [tokenSymbolOverride, setTokenSymbolOverride] = useState<string | null>(null);

  const { tokenInfo } = useTokenLookup(tokenMint || '');

  // Snapshot of the funding values at the time we first detect non-zero amounts (pre-claim)
  const [fundingSnapshot, setFundingSnapshot] = useState<AmountView | null>(null);

  const formatUnits = (value: number, maxDecimals = 6) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return '0';
    const abs = Math.abs(n);
    // Show fewer decimals for larger numbers, but keep precision for small amounts.
    const decimals = abs >= 1 ? Math.min(4, maxDecimals) : maxDecimals;
    return n.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  };

  const fetchSolPrice = async () => {
    try {
      const res = await fetch('/sol-price');
      if (!res.ok) throw new Error('Failed to fetch SOL price');
      const data = await res.json();
      const price =
        typeof data.price_usd === 'number' ? data.price_usd : data.sol_price_usd;
      if (typeof price === 'number') {
        setSolPrice(price);
      }
    } catch (err) {
      console.error('AuditSection: failed to fetch SOL price', err);
    }
  };

  const handlePullAudit = async () => {
    const trimmed = cardIdInput.trim();
    if (!trimmed) {
      toast.error('Please enter a Card ID.');
      return;
    }

    setLoading(true);
    setCard(null);
    setBalance(null);
    setFunding(null);
    setTokenMint('');
    setTokenSymbolOverride(null);
    setFundingSnapshot(null);

    try {
      // 1) Base card status (DB snapshot)
      const status = (await apiService.getCardStatus(trimmed)) as CardStatus;
      setCard(status);

      // capture token identity from status if present
      const mintFromStatus =
        typeof status.token_mint === 'string' ? status.token_mint.trim() : '';
      if (mintFromStatus) {
        setTokenMint(mintFromStatus);
      }
      if (
        typeof status.token_symbol === 'string' &&
        status.token_symbol.trim().length > 0
      ) {
        setTokenSymbolOverride(status.token_symbol.trim());
      }

      // 2) Live native SOL balance
      try {
        const res = await fetch(`/card-balance/${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const bal = (await res.json()) as CardBalanceResponse;
          setBalance(bal);
        }
      } catch (err) {
        console.error('AuditSection: failed to fetch card-balance', err);
      }

      // 3) Full funding sync (SOL + SPL tokens with Jupiter pricing)
      try {
        const res = await fetch(`/sync-card-funding/${encodeURIComponent(trimmed)}`, {
          method: 'POST',
        });
        if (res.ok) {
          const fund = (await res.json()) as SyncFundingResponse;
          setFunding(fund);
        }
      } catch (err) {
        console.error('AuditSection: failed to sync card funding', err);
      }

      toast.success('On-chain audit loaded.');
    } catch (err: any) {
      console.error('AuditSection: failed to load card status', err);
      setCard(null);
      setBalance(null);
      setFunding(null);
      setTokenMint('');
      setTokenSymbolOverride(null);
      setFundingSnapshot(null);
      toast.error(err?.message || 'Card not found. Check the Card ID.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    if (!cardIdInput.trim()) return;
    fetchSolPrice();
    handlePullAudit();
  };

  useEffect(() => {
    fetchSolPrice();
  }, []);

  const derived = useMemo(() => {
    if (!card) {
      return null;
    }

    const isTokenCard = !!card.token_mint;

    // --- SOL value (from sync-card-funding + DB fallbacks) ---

    let solValue = 0; // total SOL-equivalent (SOL + SPL) for display
    let nativeSol = 0; // raw native SOL balance at deposit at sync time

    if (funding) {
      // Preferred: total_value_sol if backend populates it
      if (
        typeof funding.total_value_sol === 'number' &&
        funding.total_value_sol > 0
      ) {
        solValue = funding.total_value_sol;
      } else {
        // Otherwise aggregate components that may be present
        let sum = 0;

        if (
          typeof funding.tokens_total_value_sol === 'number' &&
          funding.tokens_total_value_sol > 0
        ) {
          sum += funding.tokens_total_value_sol;
        }

        if (
          typeof funding.sol_native === 'number' &&
          funding.sol_native > 0
        ) {
          sum += funding.sol_native;
          nativeSol = funding.sol_native;
        }

        if (sum > 0) {
          solValue = sum;
        } else if (typeof funding.sol === 'number' && funding.sol > 0) {
          // Some implementations may alias sol → total SOL value
          solValue = funding.sol;
        }
      }
    }

    // fallback to live native SOL from /card-balance if needed
    if (solValue <= 0 && typeof balance?.sol === 'number' && balance.sol > 0) {
      solValue = balance.sol;
    }

    // FINAL fallback: use normalized SOL snapshot from DB token_amount
    // Backend stores a normalized "SOL value" in token_amount after funding sync.
    if (
      solValue <= 0 &&
      typeof card.token_amount === 'number' &&
      card.token_amount > 0
    ) {
      solValue = card.token_amount;
    }

    // --- Token amount (units) ---

    let tokenAmount = 0;

    if (isTokenCard) {
      // ✅ Prefer the real token units snapshot stored in DB (persists after claim)
      if (typeof card.token_units === 'number' && card.token_units > 0) {
        tokenAmount = card.token_units;
      } else {
        // Next best: token units from token_portfolio at sync time
        const mintStr =
          typeof card.token_mint === 'string' ? card.token_mint.trim() : '';

        const match =
          mintStr && funding?.token_portfolio?.tokens
            ? funding.token_portfolio.tokens.find((t) => t && t.mint === mintStr)
            : null;

        const primary =
          match ||
          (funding?.token_portfolio?.tokens && funding.token_portfolio.tokens[0]
            ? funding.token_portfolio.tokens[0]
            : null);

        if (primary && typeof primary.amount_ui === 'number' && primary.amount_ui > 0) {
          tokenAmount = primary.amount_ui;
        } else {
          // Do NOT fall back to card.token_amount for token cards — token_amount is SOL-equivalent in this backend.
          tokenAmount = 0;
        }
      }
    } else {
      // SOL-only card: "token" is just SOL
      if (solValue > 0) {
        tokenAmount = solValue;
      } else if (typeof card.token_amount === 'number' && card.token_amount > 0) {
        tokenAmount = card.token_amount;
      } else {
        tokenAmount = 0;
      }
    }

    // --- Fiat value ---

    const currency = card.currency || 'USD';

    const fiatFromDb =
      typeof card.amount_fiat === 'number' && card.amount_fiat > 0
        ? card.amount_fiat
        : null;

    let fiat = 0;
    if (fiatFromDb !== null) {
      fiat = fiatFromDb;
    } else if (solPrice && solValue > 0) {
      fiat = solValue * solPrice;
    }

    const statusLabel = card.claimed
      ? 'Claimed'
      : card.locked
      ? 'Locked'
      : card.funded
      ? 'Funded'
      : 'Not funded';

    const statusColor = card.claimed
      ? 'bg-purple-500/15 text-purple-400 border border-purple-500/40'
      : card.locked
      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/40'
      : card.funded
      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40'
      : 'bg-muted text-muted-foreground';

    const onChainAddress = balance?.deposit_address || card.deposit_address || '';

    // Resolve token symbol: override → card.token_symbol → lookup → SOL/TOKEN fallback
    const rawSymbol =
      tokenSymbolOverride ||
      (typeof card.token_symbol === 'string' && card.token_symbol.trim().length > 0
        ? card.token_symbol.trim()
        : null) ||
      (tokenInfo?.symbol && tokenInfo.symbol.trim().length > 0
        ? tokenInfo.symbol.trim()
        : null);

    const tokenSymbol =
      typeof rawSymbol === 'string' && rawSymbol.trim().length > 0
        ? rawSymbol.trim()
        : !isTokenCard && solValue > 0
        ? 'SOL'
        : 'TOKEN';

    // Ensure numeric fallbacks
    const safeTokenAmount = Number.isFinite(tokenAmount) ? tokenAmount : 0;
    const safeSolValue = Number.isFinite(solValue) ? solValue : 0;
    const safeFiat = Number.isFinite(fiat) ? fiat : 0;

    return {
      isTokenCard,
      tokenAmount: safeTokenAmount,
      solValue: safeSolValue,
      nativeSol,
      fiat: safeFiat,
      currency,
      statusLabel,
      statusColor,
      onChainAddress,
      tokenSymbol,
    };
  }, [card, balance, funding, solPrice, tokenInfo, tokenSymbolOverride]);

  // Snapshot the first non-zero funding view while card is NOT claimed
  useEffect(() => {
    if (!card || !derived) return;
    if (card.claimed) return; // don't overwrite snapshot after claim

    const hasNonZero =
      derived.tokenAmount > 0 || derived.solValue > 0 || derived.fiat > 0;

    if (!hasNonZero) return;

    // Only set once per audit pull, keep the earliest "funded" snapshot
    setFundingSnapshot((prev) => {
      if (prev) return prev;
      return {
        tokenAmount: derived.tokenAmount,
        solValue: derived.solValue,
        fiat: derived.fiat,
        currency: derived.currency,
        tokenSymbol: derived.tokenSymbol,
      };
    });
  }, [card, derived]);

  const timeline: TimelineEvent[] = useMemo(() => {
    if (!card || !derived) return [];

    const events: TimelineEvent[] = [];

    const formatAmountLine = (prefix: string, view: AmountView) => {
      const parts: string[] = [];

      // Always show token amount
      parts.push(`${formatUnits(view.tokenAmount)} ${view.tokenSymbol}`);

      // Show SOL-equivalent value when we have it
      if (view.solValue > 0) {
        parts.push(`${formatUnits(view.solValue)} SOL`);
      }

      // Show fiat if we have it
      if (view.fiat > 0) {
        parts.push(`${view.currency} ${view.fiat.toFixed(2)}`);
      }

      return `${prefix}: ${parts.join(' • ')}.`;
    };

    const fundedView: AmountView =
      fundingSnapshot ||
      (typeof card.token_units === 'number' && card.token_units > 0
        ? {
            tokenAmount: card.token_units,
            solValue: derived.solValue,
            fiat: derived.fiat,
            currency: derived.currency,
            tokenSymbol: derived.tokenSymbol,
          }
        : {
            tokenAmount: derived.tokenAmount,
            solValue: derived.solValue,
            fiat: derived.fiat,
            currency: derived.currency,
            tokenSymbol: derived.tokenSymbol,
          });

    // For claimed cards, we still want to display the REAL claimed token units.
    // Prefer the same funded snapshot (or DB token_units) because the deposit wallet becomes empty after claim.
    const claimedView: AmountView = fundedView;

    // Created
    events.push({
      type: 'created',
      label: 'Created',
      detail: 'CRYPTOCARD created with a unique on-chain deposit wallet.',
      at: card.created_at || null,
    });

    // Funded: show if card was ever funded / locked / claimed / refunded and has amount
    const hasFundingHistory =
      (card.funded || card.locked || card.claimed || card.refunded) &&
      (fundedView.tokenAmount > 0 || fundedView.solValue > 0 || fundedView.fiat > 0);

    if (hasFundingHistory) {
      events.push({
        type: 'funded',
        label: 'Funded',
        // USE SNAPSHOT if available so it doesn't change after claim
        detail: formatAmountLine('On-chain funding detected', fundedView),
        at: card.updated_at || card.created_at || null,
      });
    }

    if (card.locked) {
      events.push({
        type: 'locked',
        label: 'Locked',
        detail:
          'Card locked for claiming. Funding amount is now fixed for the recipient.',
        at: card.updated_at || card.created_at || null,
      });
    }

    if (card.claimed) {
      events.push({
        type: 'claimed',
        label: 'Claimed',
        // Claimed uses the current derived view (final values)
        detail: formatAmountLine('Final claimed amount', claimedView),
        at: card.updated_at || null,
      });
    }

    if (card.refunded) {
      events.push({
        type: 'refunded',
        label: 'Refunded',
        detail: 'Funds were returned to the original creator wallet.',
        at: card.updated_at || null,
      });
    }

    return events;
  }, [card, derived, fundingSnapshot]);

  const dotClassForType = (type: TimelineType) => {
    switch (type) {
      case 'created':
        return 'bg-primary shadow-[0_0_0_3px_rgba(59,130,246,0.25)]';
      case 'funded':
        return 'bg-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]';
      case 'locked':
        return 'bg-amber-400 shadow-[0_0_0_3px_rgba(245,158,11,0.25)]';
      case 'claimed':
        return 'bg-purple-400 shadow-[0_0_0_3px_rgba(168,85,247,0.25)]';
      case 'refunded':
        return 'bg-rose-400 shadow-[0_0_0_3px_rgba(244,63,94,0.25)]';
      default:
        return 'bg-primary shadow-[0_0_0_3px_rgba(59,130,246,0.25)]';
    }
  };

  // Choose which view to show in the "Card amount (snapshot)" box:
  const snapshotView: AmountView | null = useMemo(() => {
    if (!derived) return null;
    if (fundingSnapshot) return fundingSnapshot;
    return {
      tokenAmount: derived.tokenAmount,
      solValue: derived.solValue,
      fiat: derived.fiat,
      currency: derived.currency,
      tokenSymbol: derived.tokenSymbol,
    };
  }, [derived, fundingSnapshot]);

  return (
    <section className="glass-card rounded-xl p-3 mt-5 shadow-card hover:shadow-card-hover transition-all">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-3">
        <h2 className="text-xs font-black gradient-text tracking-[0.25em] uppercase">
          ON-CHAIN AUDIT TRAIL
        </h2>
        <p className="text-[9px] text-muted-foreground mt-1 max-w-md">
          Inspect the full lifecycle of any{' '}
          <span className="font-semibold text-primary">CRYPTOCARD</span> by its public Card ID —
          from funding to lock to claim.
        </p>
      </div>

      {/* Search row */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="flex-1 flex items-center gap-2">
          <Input
            value={cardIdInput}
            onChange={(e) => setCardIdInput(e.target.value.toUpperCase())}
            placeholder="Enter Card ID (e.g. 1234-5678)"
            className="h-8 text-[10px] bg-card/60 border-border/40 font-mono"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3 text-[9px] flex items-center gap-1"
            onClick={handlePullAudit}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading
              </>
            ) : (
              <>
                <Search className="w-3 h-3" />
                Pull audit
              </>
            )}
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-[9px] flex items-center gap-1"
          onClick={handleRefresh}
          disabled={loading || !cardIdInput.trim()}
        >
          <RefreshCcw className="w-3 h-3" />
          Refresh
        </Button>
      </div>

      {!card && !loading && (
        <div className="rounded-lg border border-dashed border-border/50 bg-background/40 p-3 text-center text-[9px] text-muted-foreground">
          Enter a Card ID above and pull the on-chain audit to view its lifecycle.
        </div>
      )}

      {card && derived && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Left: summary */}
          <div className="md:col-span-1 space-y-2">
            <div className="rounded-lg border border-border/40 bg-background/60 p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Shield className="w-3 h-3 text-primary" />
                  <span className="text-[9px] font-semibold uppercase tracking-wide">
                    Summary
                  </span>
                </div>
                {solPrice !== null && (
                  <span className="text-[8px] text-muted-foreground">
                    SOL: ${solPrice.toFixed(2)} USD
                  </span>
                )}
              </div>

              <div className="mb-1">
                <div className="text-[8px] uppercase tracking-wide text-muted-foreground">
                  Card ID
                </div>
                <div className="text-[11px] font-mono font-semibold">
                  {card.public_id}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-1 mb-2">
                <div>
                  <div className="text-[8px] uppercase tracking-wide text-muted-foreground">
                    Created
                  </div>
                  <div className="text-[9px]">
                    {card.created_at
                      ? new Date(card.created_at).toLocaleString()
                      : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-[8px] uppercase tracking-wide text-muted-foreground">
                    Last update
                  </div>
                  <div className="text-[9px]">
                    {card.updated_at
                      ? new Date(card.updated_at).toLocaleString()
                      : '-'}
                  </div>
                </div>
              </div>

              <div className="mb-2">
                <div className="text-[8px] uppercase tracking-wide text-muted-foreground mb-0.5">
                  Status
                </div>
                <span
                  className={
                    'inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-semibold ' +
                    derived.statusColor
                  }
                >
                  {derived.statusLabel.toUpperCase()}
                </span>
              </div>

              <div className="space-y-0.5">
                <div className="text-[8px] uppercase tracking-wide text-muted-foreground">
                  Token amount
                </div>
                <div className="text-[10px] font-semibold">
                  {formatUnits(derived.tokenAmount)} {derived.tokenSymbol}
                </div>

                <div className="mt-1 text-[8px] uppercase tracking-wide text-muted-foreground">
                  SOL value (total)
                </div>
                <div className="text-[10px] font-semibold">
                  {formatUnits(derived.solValue)} SOL
                </div>

                <div className="mt-1 text-[8px] uppercase tracking-wide text-muted-foreground">
                  Fiat value
                </div>
                <div className="text-[10px] font-semibold">
                  {derived.currency} {derived.fiat.toFixed(2)}
                </div>
              </div>
            </div>

            {/* On-chain balance */}
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Activity className="w-3 h-3 text-primary" />
                  <span className="text-[9px] font-semibold uppercase tracking-wide">
                    On-chain balance
                  </span>
                </div>
                {balance?.rpc && (
                  <span className="text-[8px] text-muted-foreground">
                    RPC: {balance.rpc.includes('https') ? 'Custom' : 'Default'}
                  </span>
                )}
              </div>

              {/* Current deposit wallet live balance */}
              <div className="text-[9px] mb-1">
                {balance ? (
                  <>
                    <span className="font-semibold">
                      {formatUnits(balance.sol)} SOL
                    </span>{' '}
                    ({balance.lamports} lamports)
                    {card.claimed && balance.sol === 0 && (
                      <span className="block text-[8px] text-muted-foreground mt-0.5">
                        Deposit wallet is empty after claim – funds were moved to the
                        recipient.
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground">
                    No live deposit balance available for this card.
                  </span>
                )}
              </div>

              {/* Card amount snapshot (use funding snapshot if present) */}
              {snapshotView && (
                <div className="mt-1">
                  <div className="text-[8px] uppercase tracking-wide text-muted-foreground mb-0.5">
                    Card amount (snapshot)
                  </div>
                  <div className="text-[9px] font-semibold">
                    {formatUnits(snapshotView.tokenAmount)} {snapshotView.tokenSymbol}
                    {snapshotView.solValue > 0 && (
                      <> • {formatUnits(snapshotView.solValue)} SOL</>
                    )}
                    {snapshotView.fiat > 0 && (
                      <>
                        {' '}
                        • {snapshotView.currency} {snapshotView.fiat.toFixed(2)}
                      </>
                    )}
                  </div>
                </div>
              )}

              {derived.onChainAddress && (
                <div className="mt-2">
                  <div className="text-[8px] uppercase tracking-wide text-muted-foreground mb-0.5">
                    Deposit wallet
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9px] font-mono truncate">
                      {derived.onChainAddress}
                    </span>
                    <a
                      href={`https://solscan.io/account/${derived.onChainAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[8px] text-primary hover:text-primary/80"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Solscan
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: timeline */}
          <div className="md:col-span-2 rounded-lg border border-border/40 bg-background/60 p-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-semibold uppercase tracking-wide">
                Lifecycle timeline
              </span>
            </div>

            {timeline.length === 0 && (
              <div className="text-[9px] text-muted-foreground">
                No lifecycle events recorded yet for this CRYPTOCARD.
              </div>
            )}

            {timeline.length > 0 && (
              <ol className="relative border-l border-border/40 pl-3 mt-1 space-y-2">
                {timeline.map((evt, idx) => (
                  <li key={idx} className="relative pl-2">
                    <span
                      className={
                        'absolute -left-[9px] top-1 w-2 h-2 rounded-full ' +
                        dotClassForType(evt.type)
                      }
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-semibold uppercase tracking-wide">
                        {evt.label}
                      </span>
                      <span className="text-[8px] text-muted-foreground">
                        {evt.at
                          ? new Date(evt.at).toLocaleString()
                          : '—'}
                      </span>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      {evt.detail}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}

      {loading && (
        <div className="mt-3 flex items-center justify-center text-[9px] text-muted-foreground">
          <Loader2 className="w-3 h-3 mr-2 animate-spin" />
          Loading on-chain audit…
        </div>
      )}
    </section>
  );
}
