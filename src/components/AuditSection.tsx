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

interface CardStatus {
  public_id: string;
  created_at: string;
  updated_at: string;
  funded: boolean;
  locked: boolean;
  claimed: boolean;
  refunded: boolean;
  token_amount: number | null;
  amount_fiat: number | null;
  currency: string | null;
  deposit_address: string | null;
  template_url?: string | null;
  message?: string | null;
  expires_at?: string | null;
  token_mint?: string | null;
}

interface CardBalanceResponse {
  deposit_address: string;
  lamports: number;
  sol: number;
  funded: boolean;
}

interface SolPriceResponse {
  price_usd?: number;
  sol_price_usd?: number;
}

type TimelineType = 'created' | 'funded' | 'locked' | 'claimed' | 'refunded';

interface TimelineEvent {
  type: TimelineType;
  label: string;
  detail: string;
  at: string | null;
}

export function AuditSection() {
  const { t } = useLanguage();

  const [cardIdInput, setCardIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState<CardStatus | null>(null);
  const [balance, setBalance] = useState<CardBalanceResponse | null>(null);
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [tokenSymbol, setTokenSymbol] = useState<string>('TOKEN');

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
      console.error('AuditSection: failed to fetch SOL price', err);
    }
  };

  useEffect(() => {
    const mint = card?.token_mint;
    if (!mint || mint.length < 32) {
      setTokenSymbol('TOKEN');
      return;
    }

    let cancelled = false;

    const fetchTokenSymbol = async () => {
      try {
        const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
        if (!res.ok) {
          if (!cancelled) setTokenSymbol('TOKEN');
          return;
        }
        const data = await res.json();
        let symbol: string | null = null;
        const pairs: any = (data && (data.pairs || data.pair || data.data)) as any;
        if (Array.isArray(pairs) && pairs.length > 0 && pairs[0].baseToken) {
          symbol = pairs[0].baseToken.symbol || pairs[0].baseToken.name || null;
        }
        if (!cancelled) {
          setTokenSymbol(symbol || 'TOKEN');
        }
      } catch {
        if (!cancelled) setTokenSymbol('TOKEN');
      }
    };

    fetchTokenSymbol();

    return () => {
      cancelled = true;
    };
  }, [card?.token_mint]);

  const fetchCardStatus = async (publicId: string) => {
    setLoading(true);
    try {
      const status = await apiService.getCardStatus(publicId);
      setCard(status);

      try {
        if (status.deposit_address) {
          const balanceRes = await fetch(
            `/card-balance/${encodeURIComponent(status.deposit_address)}`
          );
          if (balanceRes.ok) {
            const balanceData: CardBalanceResponse = await balanceRes.json();
            setBalance(balanceData);
          } else {
            setBalance(null);
          }
        } else {
          setBalance(null);
        }
      } catch (err) {
        console.error('AuditSection: balance fetch failed', err);
        setBalance(null);
      }
    } catch (err: any) {
      console.error('AuditSection: getCardStatus failed', err);
      toast.error(err?.message || 'Failed to load card status');
      setCard(null);
      setBalance(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSolPrice();
  }, []);

  const derived = useMemo(() => {
    if (!card) {
      return null;
    }

    const solFromStatus =
      typeof card.token_amount === 'number' && card.token_amount > 0
        ? card.token_amount
        : 0;

    const solFromBalance =
      typeof balance?.sol === 'number' && balance.sol > 0
        ? balance.sol
        : 0;

    const onChainSol = solFromBalance || solFromStatus;

    const currency = card.currency || 'USD';

    const fiatFromDb =
      typeof card.amount_fiat === 'number' && card.amount_fiat > 0
        ? card.amount_fiat
        : null;

    const fiat =
      fiatFromDb !== null
        ? fiatFromDb
        : solPrice && onChainSol > 0
        ? onChainSol * solPrice
        : 0;

    const statusLabel = card.claimed
      ? 'CLAIMED'
      : card.refunded
      ? 'REFUNDED'
      : card.locked
      ? 'LOCKED'
      : card.funded
      ? 'FUNDED'
      : onChainSol > 0
      ? 'DEPOSITED'
      : 'CREATED';

    const timeline: TimelineEvent[] = [
      {
        type: 'created',
        label: 'Card created',
        detail: `Card created on ${new Date(card.created_at).toLocaleString()}`,
        at: card.created_at,
      },
    ];

    if (card.funded || onChainSol > 0) {
      timeline.push({
        type: 'funded',
        label: 'Funds detected',
        detail: `Funding detected on-chain: ${onChainSol.toFixed(6)} SOL`,
        at: card.updated_at,
      });
    }

    if (card.locked) {
      timeline.push({
        type: 'locked',
        label: 'Card locked',
        detail: 'Card locked by creator (no more deposits).',
        at: card.updated_at,
      });
    }

    if (card.refunded) {
      timeline.push({
        type: 'refunded',
        label: 'Refunded',
        detail: 'Card was refunded back to the creator.',
        at: card.updated_at,
      });
    }

    if (card.claimed) {
      timeline.push({
        type: 'claimed',
        label: 'Claimed',
        detail: 'Recipient claimed the underlying funds.',
        at: card.updated_at,
      });
    }

    return {
      onChainSol,
      fiat,
      currency,
      statusLabel,
      timeline,
    };
  }, [card, balance, solPrice]);

  const handleAuditClick = () => {
    const trimmed = cardIdInput.trim();
    if (!trimmed) {
      toast.error('Please enter a card ID first');
      return;
    }
    fetchCardStatus(trimmed);
  };

  const handleReset = () => {
    setCardIdInput('');
    setCard(null);
    setBalance(null);
  };

  return (
    <section className="glass-card rounded-xl p-3 mt-5 shadow-card hover:shadow-card-hover transition-all">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-black gradient-text tracking-[0.26em] uppercase">
              {t('audit.title') || 'ON-CHAIN CARD AUDIT'}
            </h2>
          </div>
          <p className="text-[9px] text-muted-foreground max-w-md">
            {t('audit.description') ||
              'Verify any CRYPTOCARD on Solana mainnet: check deposits, lock state, and claim status with transparent on-chain data.'}
          </p>
        </div>

        {/* Input + buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center gap-1 bg-card/60 border border-border/40 rounded-lg px-2 h-8 min-w-[220px]">
            <Search className="w-3 h-3 text-muted-foreground" />
            <Input
              value={cardIdInput}
              onChange={(e) => setCardIdInput(e.target.value)}
              placeholder={t('audit.placeholder') || 'Paste a CRYPTOCARD ID (public_id)'}
              className="h-7 text-[9px] border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <Button
            onClick={handleAuditClick}
            disabled={loading}
            className="h-8 text-[9px] font-semibold px-3 gradient-primary"
          >
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                {t('audit.scanning') || 'Scanning...'}
              </>
            ) : (
              <>
                <Activity className="w-3 h-3 mr-1" />
                {t('audit.button') || 'Audit card'}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            className="h-8 text-[9px] font-semibold px-3"
          >
            <RefreshCcw className="w-3 h-3 mr-1" />
            {t('audit.reset') || 'Clear'}
          </Button>
        </div>
      </div>

      {/* Content */}
      {derived && card ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Left: Snapshot */}
          <div className="md:col-span-1 bg-card/60 border border-border/40 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-[0.16em]">
                {t('audit.snapshot') || 'Card snapshot'}
              </span>
              <span className="inline-flex items-center gap-1 text-[8px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full border border-primary/50 text-primary bg-primary/10">
                {derived.statusLabel}
              </span>
            </div>

            <div className="text-[8px] text-muted-foreground break-all">
              <span className="font-semibold text-foreground">ID: </span>
              {card.public_id}
            </div>

            {card.message && (
              <div className="mt-2 text-[9px] text-muted-foreground bg-background/40 border border-border/40 rounded-md p-2">
                <div className="text-[8px] uppercase tracking-wide font-semibold mb-1 text-foreground">
                  {t('audit.message') || 'Gift message'}
                </div>
                <div className="text-[9px] whitespace-pre-wrap">{card.message}</div>
              </div>
            )}

            <div className="mt-2 space-y-1 text-[8px] text-muted-foreground">
              <div>
                <span className="font-semibold text-foreground">
                  {t('audit.createdAt') || 'Created:'}{' '}
                </span>
                {new Date(card.created_at).toLocaleString()}
              </div>
              <div>
                <span className="font-semibold text-foreground">
                  {t('audit.updatedAt') || 'Last update:'}{' '}
                </span>
                {new Date(card.updated_at).toLocaleString()}
              </div>
              {card.expires_at && (
                <div>
                  <span className="font-semibold text-foreground">
                    {t('audit.expiresAt') || 'Expires:'}{' '}
                  </span>
                  {new Date(card.expires_at).toLocaleString()}
                </div>
              )}
            </div>

            {card.deposit_address && (
              <div className="mt-2 text-[8px] text-muted-foreground break-all">
                <span className="font-semibold text-foreground">
                  {t('audit.deposit') || 'Deposit address:'}{' '}
                </span>
                <span>{card.deposit_address}</span>
              </div>
            )}

            {solPrice && (
              <div className="mt-2 text-[8px] text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {t('audit.referencePrice') || 'Reference SOL/USD:'}{' '}
                </span>
                1 SOL ≈ {solPrice.toFixed(2)} USD
              </div>
            )}

            {card.template_url && (
              <div className="mt-2">
                <div className="text-[8px] uppercase tracking-wide text-muted-foreground mb-1 font-semibold">
                  {t('audit.cardPreview') || 'Card template preview'}
                </div>
                <div className="rounded-lg overflow-hidden border border-border/40 bg-background/30">
                  <img
                    src={card.template_url}
                    alt="Card template"
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Middle: On-chain metrics */}
          <div className="md:col-span-1 bg-card/60 border border-border/40 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-[0.16em]">
                {t('audit.onChain') || 'On-chain metrics'}
              </span>
              <Shield className="w-3 h-3 text-primary" />
            </div>

            <div className="space-y-1">
              <div className="flex items-baseline justify-between">
                <span className="text-[8px] uppercase tracking-wide text-muted-foreground">
                  Token amount
                </span>
                <span className="text-[10px] font-semibold">
                  {derived.tokenAmount?.toFixed(6)} {tokenSymbol}
                </span>
              </div>

              <div className="flex items-baseline justify-between">
                <span className="text-[8px] uppercase tracking-wide text-muted-foreground">
                  SOL amount
                </span>
                <span className="text-[10px] font-semibold">
                  {derived.onChainSol.toFixed(6)} SOL
                </span>
              </div>

              <div className="flex items-baseline justify-between mt-1">
                <span className="text-[8px] uppercase tracking-wide text-muted-foreground">
                  Fiat value
                </span>
                <span className="text-[10px] font-semibold">
                  {derived.currency} {derived.fiat.toFixed(2)}
                </span>
              </div>
            </div>

            {balance && (
              <div className="mt-2 text-[8px] text-muted-foreground bg-background/40 border border-border/40 rounded-md p-2">
                <div className="text-[8px] uppercase tracking-wide font-semibold mb-1 text-foreground">
                  {t('audit.rawBalance') || 'Raw on-chain balance'}
                </div>
                <div>Lamports: {balance.lamports}</div>
                <div>SOL: {balance.sol.toFixed(9)}</div>
                <div>
                  {t('audit.fundedFlag') || 'Funding flag:'}{' '}
                  <span className="font-semibold text-foreground">
                    {balance.funded ? 'true' : 'false'}
                  </span>
                </div>
              </div>
            )}

            <div className="mt-2 text-[8px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                <a
                  href="https://solscan.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-primary transition-colors"
                >
                  {t('audit.solscan') || 'Open Solscan for deeper on-chain history'}
                </a>
              </div>
            </div>
          </div>

          {/* Right: Timeline */}
          <div className="md:col-span-1 bg-card/60 border border-border/40 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-[0.16em]">
                {t('audit.timeline') || 'Lifecycle & events'}
              </span>
              <Activity className="w-3 h-3 text-primary" />
            </div>

            <div className="space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar">
              {derived.timeline.length === 0 ? (
                <div className="text-[8px] text-muted-foreground">
                  {t('audit.noEvents') || 'No events recorded yet.'}
                </div>
              ) : (
                derived.timeline.map((evt, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <div className="mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[9px] font-semibold text-foreground">
                        {evt.label}
                      </div>
                      <div className="text-[8px] text-muted-foreground">{evt.detail}</div>
                      {evt.at && (
                        <div className="text-[8px] text-muted-foreground">
                          {new Date(evt.at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 text-[9px] text-muted-foreground">
          {t('audit.empty') ||
            'Paste a CRYPTOCARD ID above and run an on-chain audit to see full details.'}
        </div>
      )}
    </section>
  );
}
