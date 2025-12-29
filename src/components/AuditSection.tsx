import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import { apiService, type CardStatusResponse } from '@/services/api';
import { useLanguage } from '@/lib/languageStore';

export function AuditSection() {
  const { t } = useLanguage();
  const [cardId, setCardId] = useState('');
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState<CardStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [solPrice, setSolPrice] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/sol-price');
        if (!res.ok) return;
        const data = await res.json();
        if (data.price_usd) setSolPrice(Number(data.price_usd));
      } catch {
        // ignore
      }
    };
    load();
  }, []);

  const handleSearch = async () => {
    const trimmed = cardId.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setCard(null);

    try {
      const status = await apiService.getCardStatus(trimmed);
      setCard(status);
    } catch (e: any) {
      setError(e?.message || 'Card not found');
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (iso?: string | null) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch {
      return iso;
    }
  };

  const tokenAmount =
    typeof card?.token_amount === 'number' && card.token_amount > 0
      ? card.token_amount
      : 0;
  const solAmount = tokenAmount; // using SOL as token
  const usdAmount =
    solPrice && tokenAmount > 0 ? tokenAmount * solPrice : card?.amount_fiat || 0;

  const tokenStr = tokenAmount > 0 ? tokenAmount.toFixed(6) : '0.000000';
  const solStr = solAmount > 0 ? solAmount.toFixed(6) : '0.000000';
  const usdStr = usdAmount > 0 ? `$${usdAmount.toFixed(2)} USD` : '$0.00 USD';

  const statusColor = (flag: boolean, neutral = false) =>
    flag
      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
      : neutral
      ? 'bg-muted/40 text-muted-foreground border-muted/40'
      : 'bg-yellow-500/15 text-yellow-400 border-yellow-500/40';

  return (
    <section className="mt-8 glass-card rounded-2xl border border-border/40 bg-card/60 shadow-card">
      <div className="px-4 pt-4 pb-3 border-b border-border/30">
        <h2 className="text-base md:text-lg font-black gradient-text text-center uppercase tracking-wide">
          On-chain Audit Trail
        </h2>
        <p className="text-[10px] text-muted-foreground text-center mt-1">
          Search any CRYPTOCARD ID to view its full on-chain lifecycle on Solana mainnet.
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* Search row */}
        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <Input
            value={cardId}
            onChange={(e) => setCardId(e.target.value.toUpperCase())}
            placeholder="Enter CRYPTOCARD ID (e.g. 1234-5678)"
            className="h-8 text-[10px] font-mono bg-card/60 border-border/40"
          />
          <Button
            onClick={handleSearch}
            disabled={loading}
            className="h-8 text-[10px] font-black gradient-primary text-primary-foreground"
          >
            {loading ? 'Searching…' : 'Pull Audit'}
          </Button>
        </div>

        {error && (
          <div className="text-[10px] text-destructive bg-destructive/10 border border-destructive/40 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {card && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
            {/* Summary */}
            <div className="md:col-span-1 space-y-2 bg-card/80 border border-border/40 rounded-xl p-3">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">
                Summary
              </div>
              <div className="text-[10px] space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID</span>
                  <span className="font-mono font-bold">{card.public_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span>
                    {card.claimed
                      ? 'Claimed'
                      : card.locked
                      ? 'Locked'
                      : card.funded
                      ? 'Funded'
                      : 'Created'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Token</span>
                  <span>
                    {tokenStr} {card.token_symbol || card.currency || 'SOL'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Value</span>
                  <span className="font-semibold">
                    {solStr} SOL • {usdStr}
                  </span>
                </div>
              </div>

              {card.deposit_address && (
                <div className="mt-3">
                  <div className="text-[9px] uppercase text-muted-foreground mb-1">
                    Deposit Address
                  </div>
                  <div className="text-[9px] font-mono break-all bg-background/40 border border-border/40 rounded-md px-2 py-1">
                    {card.deposit_address}
                  </div>
                </div>
              )}

              {card.claimed && card.claim_tx && (
                <div className="mt-3">
                  <div className="text-[9px] uppercase text-muted-foreground mb-1">
                    Claim Transaction
                  </div>
                  <a
                    href={`https://solscan.io/tx/${card.claim_tx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[9px] text-primary hover:text-primary/80"
                  >
                    View on Solscan
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Timeline */}
            <div className="md:col-span-2 bg-card/80 border border-border/40 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                  Lifecycle timeline
                </span>
              </div>
              <div className="space-y-2 text-[10px]">
                <div className="flex items-start gap-2">
                  <Badge
                    variant="outline"
                    className={statusColor(true, true) + ' text-[9px] px-2 py-0.5'}
                  >
                    Created
                  </Badge>
                  <div>
                    <div className="text-muted-foreground">
                      {formatDateTime(card.created_at || card.createdAt)}
                    </div>
                    <div className="text-[9px] text-muted-foreground/80">
                      Card initialized on-chain with template and message.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Badge
                    variant="outline"
                    className={statusColor(!!card.funded) + ' text-[9px] px-2 py-0.5'}
                  >
                    Funded
                  </Badge>
                  <div>
                    <div className="text-muted-foreground">
                      {card.funded
                        ? formatDateTime(card.funded_at || card.updated_at)
                        : 'Awaiting on-chain funds'}
                    </div>
                    <div className="text-[9px] text-muted-foreground/80">
                      {card.funded || card.claimed
                        ? `On-chain balance: ${tokenStr} ${card.token_symbol ||
                            card.currency ||
                            'SOL'} • ${solStr} SOL • ${usdStr}`
                        : 'No value recorded yet.'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Badge
                    variant="outline"
                    className={statusColor(!!card.locked) + ' text-[9px] px-2 py-0.5'}
                  >
                    Locked
                  </Badge>
                  <div>
                    <div className="text-muted-foreground">
                      {card.locked
                        ? formatDateTime(card.locked_at || card.updated_at)
                        : 'Not locked yet'}
                    </div>
                    <div className="text-[9px] text-muted-foreground/80">
                      Once locked, the deposit wallet can only be claimed or refunded.
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Badge
                    variant="outline"
                    className={statusColor(!!card.claimed) + ' text-[9px] px-2 py-0.5'}
                  >
                    Claimed
                  </Badge>
                  <div>
                    <div className="text-muted-foreground">
                      {card.claimed
                        ? formatDateTime(card.claimed_at || card.updated_at)
                        : 'Not claimed yet'}
                    </div>
                    <div className="text-[9px] text-muted-foreground/80">
                      {card.claimed
                        ? `Final claimed amount: ${tokenStr} ${card.token_symbol ||
                            card.currency ||
                            'SOL'} • ${solStr} SOL • ${usdStr}`
                        : 'Awaiting claim with correct CVV.'}
                    </div>
                  </div>
                </div>

                {card.refunded && (
                  <div className="flex items-start gap-2">
                    <Badge
                      variant="outline"
                      className="bg-blue-500/10 text-blue-400 border-blue-500/40 text-[9px] px-2 py-0.5"
                    >
                      Refunded
                    </Badge>
                    <div>
                      <div className="text-muted-foreground">
                        {formatDateTime(card.refunded_at || card.updated_at)}
                      </div>
                      <div className="text-[9px] text-muted-foreground/80">
                        Funds were returned to the creator&apos;s wallet after expiry or manual
                        refund.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
