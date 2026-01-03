// src/components/ClaimModal.tsx
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff } from 'lucide-react';
import { CryptoCard } from './CryptoCard';
import { useLanguage } from '@/lib/languageStore';
import { apiService, type CardStatusResponse } from '@/services/api';
import type { CardData } from '@/types/card';
import { useTokenLookup } from '@/hooks/useTokenLookup';

// CRYPTOCARDS mint (your CA from header)
const CRYPTOCARDS_MINT = 'AuxRtUDw7KhWZxbMcfqPoB1cLcvq44Sw83UHRd3Spump';


// ---- helpers ----
const toNumber = (v: unknown, fallback = 0) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

type ClaimSnapshot = {
  tokenAmount: number;
  tokenSymbol: string;
  solAmount: number;
  usdAmount: number;
};

const SNAPSHOT_KEY = 'cc_claim_snapshot_v1';

const loadSnapshotMap = (): Record<string, ClaimSnapshot> => {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const saveSnapshot = (cardId: string, snap: ClaimSnapshot) => {
  try {
    const map = loadSnapshotMap();
    map[cardId] = snap;
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
};

const getSnapshot = (cardId: string): ClaimSnapshot | null => {
  const map = loadSnapshotMap();
  return map[cardId] || null;
};
interface ClaimModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Optional: pre-fill the Card ID field (used by /claim?id=... links)
  initialCardId?: string;
}

interface ClaimSummary {
  tokenAmount: number;
  tokenSymbol: string;
  solAmount: number;
  usdAmount: number;
  destination: string;
  txSignature: string | null;
}

interface TokenPortfolioToken {
  mint: string;
  amount_raw: string;
  amount_ui: number;
  decimals: number;
  price_sol_per_token: number | null;
  total_value_sol: number | null;
}

interface TokenPortfolio {
  owner: string;
  tokens: TokenPortfolioToken[];
  total_value_sol: number;
}

interface FundingSnapshot {
  funded: boolean;
  locked: boolean;
  hasDeposit: boolean;
  sol_native: number;
  sol_total_value: number;
  token_portfolio: TokenPortfolio | null;
}

function getDisplayTokenLabel(
  mint: string | null | undefined,
  tokenInfo: { name: string; symbol: string } | null
) {
  if (!mint) return 'SOL';
  if (mint === CRYPTOCARDS_MINT) return 'CRYPTOCARDS';
  // Pull live token symbol/name (DexScreener) when available
  return tokenInfo?.symbol || tokenInfo?.name || 'TOKEN';
}

export function ClaimModal({ open, onOpenChange, initialCardId }: ClaimModalProps) {
  const { t } = useLanguage();

  const tt = (key: string, fallback: string) => {
    const v = t(key);
    return !v || v === key ? fallback : v;
  };


  // Unified message for "not funded / already claimed"
  const notFundedMessage = tt(
    'claim.notFundedOrClaimed',
    'This card has already been claimed and has no funds available.'
  );

  const [cardId, setCardId] = useState(initialCardId ?? '');
  const [walletAddress, setWalletAddress] = useState('');
  const [cvv, setCvv] = useState('');
  const [showCvv, setShowCvv] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pulledCard, setPulledCard] = useState<CardStatusResponse | (CardStatusResponse & any) | null>(null);
  const [funding, setFunding] = useState<FundingSnapshot | null>(null);

  // Token label lookup for the card (DexScreener)
  const tokenMintForLookup = useMemo(() => {
    const anyCard: any = pulledCard;
    const mintFromCard: string | null = anyCard?.token_mint || null;
    const mintFromPortfolio: string | null =
      funding?.token_portfolio?.tokens?.[0]?.mint || null;
    return mintFromCard || mintFromPortfolio || '';
  }, [pulledCard, funding]);

  const { tokenInfo } = useTokenLookup(tokenMintForLookup);

  // Stabilize token label so it never "flashes" back to TOKEN while async lookups update
  const [resolvedTokenLabel, setResolvedTokenLabel] = useState<string>('');

  // Reset resolved label when we load a different card
  useEffect(() => {
    if (!pulledCard?.public_id) {
      setResolvedTokenLabel('');
      return;
    }
    setResolvedTokenLabel('');
  }, [pulledCard?.public_id]);

  // When we learn a real token label, lock it in (avoid reverting to TOKEN)
  useEffect(() => {
    const anyCard: any = pulledCard;
    const mint =
      (anyCard?.token_mint as string | null) ||
      (funding?.token_portfolio?.tokens?.[0]?.mint as string | null) ||
      null;

    const label = getDisplayTokenLabel(mint, tokenInfo);
    if (label && label !== 'TOKEN') {
      setResolvedTokenLabel(label);
    }
  }, [pulledCard, funding, tokenInfo]);


  const [solPriceUsd, setSolPriceUsd] = useState<number | null>(null);
  const [claimSummary, setClaimSummary] = useState<ClaimSummary | null>(null);

  // Keep cardId in sync if initialCardId changes (e.g. different /claim?id=...)
  useEffect(() => {
    if (initialCardId) {
      setCardId(initialCardId);
    }
  }, [initialCardId]);

  // Fetch SOL price from backend when modal opens
  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const fetchSolPrice = async () => {
      try {
        const res = await fetch('/sol-price');
        if (!res.ok) return;
        const data = await res.json();
        const price = typeof data.price_usd === 'number' ? data.price_usd : null;
        if (!cancelled && price && price > 0) {
          setSolPriceUsd(price);
        }
      } catch {
        // silent – we fall back to whatever amount_fiat exists
      }
    };

    fetchSolPrice();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleClose = () => {
    setCardId(initialCardId ?? '');
    setWalletAddress('');
    setCvv('');
    setPulledCard(null);
    setFunding(null);
    setLoading(false);
    setClaimSummary(null);
    onOpenChange(false);
  };

  const fetchFundingSnapshot = async (publicId: string) => {
    try {
      const res = await fetch(`/sync-card-funding/${encodeURIComponent(publicId)}`, {
        method: 'POST',
      });
      if (!res.ok) return null;
      const json = await res.json();

      // Shape from backend /sync-card-funding
      const snap: FundingSnapshot = {
        funded: !!json.funded,
        locked: !!json.locked,
        hasDeposit: !!json.hasDeposit,
        sol_native: typeof json.sol_native === 'number' ? json.sol_native : 0,
        sol_total_value:
          typeof json.total_value_sol === 'number' ? json.total_value_sol : 0,
        token_portfolio: json.token_portfolio || null,
      };

      return snap;
    } catch (err) {
      console.error('Failed to sync funding for claim modal:', err);
      return null;
    }
  };

  const handlePullCard = async () => {
    const trimmed = cardId.trim();
    if (!trimmed) {
      toast.error(t('claim.cardIdRequired') ?? 'Please enter a Card ID');
      return;
    }

    setLoading(true);
    setPulledCard(null);
    setFunding(null);
    setClaimSummary(null);

    try {
      const status = await apiService.getCardStatus(trimmed);

      if (!status.funded) {
        toast.error(notFundedMessage);
      }
      if (!status.locked) {
        toast.error(t('claim.notLocked') ?? 'This CRYPTOCARD must be locked before claiming.');
      }

      setPulledCard(status as any);

      // Also fetch live funding snapshot so we show correct token/SOL amounts
      const snap = await fetchFundingSnapshot(trimmed);
      if (snap) {
        setFunding(snap);
      }

      toast.success(tt('claim.cardFound', 'Card found. Review the details below.'));
    } catch (err: any) {
      console.error('Failed to load card status', err);
      setPulledCard(null);
      setFunding(null);
      setClaimSummary(null);
      toast.error(err?.message || t('claim.notFound') || 'CRYPTOCARD not found. Check the Card ID.');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!pulledCard) {
      toast.error(t('claim.pullFirst') ?? 'Pull a CRYPTOCARD first');
      return;
    }
    if (!walletAddress.trim()) {
      toast.error(t('claim.walletRequired') ?? 'Please enter a wallet address');
      return;
    }
    if (!cvv.trim()) {
      toast.error(t('claim.cvvRequired') ?? 'Please enter the CVV');
      return;
    }

    if (!pulledCard.locked) {
      toast.error(t('claim.notLocked') ?? 'This CRYPTOCARD must be locked before claiming.');
      return;
    }
    if (!pulledCard.funded) {
      toast.error(notFundedMessage);
      return;
    }

    setLoading(true);

    try {
      const result: any = await apiService.claimCard({
        public_id: pulledCard.public_id,
        cvv: cvv.trim(),
        destination_wallet: walletAddress.trim(),
      });

      if (!result?.success) {
        throw new Error(result?.error || 'Claim failed');
      }

      // Use funding snapshot to derive the nice amounts we show
      const portfolio = funding?.token_portfolio;
      const cardAny: any = pulledCard;

      // Primary token: if card has a token_mint, prefer that entry; else first token if any
      let mainToken: TokenPortfolioToken | null = null;
      if (portfolio && portfolio.tokens && portfolio.tokens.length > 0) {
        if (cardAny.token_mint) {
          mainToken =
            portfolio.tokens.find((t) => t.mint === cardAny.token_mint) ||
            portfolio.tokens[0];
        } else {
          mainToken = portfolio.tokens[0];
        }
      }

      const tokenMint = (cardAny.token_mint || mainToken?.mint || null) as string | null;
      const tokenSymbol = resolvedTokenLabel || getDisplayTokenLabel(tokenMint, tokenInfo);

      const tokenAmount =
        mainToken?.amount_ui ??
        (typeof cardAny.token_amount === 'number' ? cardAny.token_amount : 0);

      // For SOL amount we prefer:
      // - If the card is SOL-only: use sol_native
      // - If we only have SOL-equivalent value: use total_value_sol
      let solAmount = 0;
      if (!cardAny.token_mint) {
        solAmount = funding?.sol_native ?? 0;
      } else {
        // token card – SOL equivalent from valuation if available
        solAmount =
          funding?.sol_total_value ??
          (typeof result.amount_sol === 'number' ? result.amount_sol : 0);
      }

      const usdFromCard =
        typeof pulledCard.amount_fiat === 'number' ? pulledCard.amount_fiat : 0;

      const usdAmount =
        solPriceUsd && solAmount
          ? solAmount * solPriceUsd
          : usdFromCard;

      const txSig =
        result.signature_sol ||
        result.signature_spl ||
        result.signature ||
        null;

      setClaimSummary({
        tokenAmount,
        tokenSymbol,
        solAmount,
        usdAmount,
        destination: result.destination_wallet || walletAddress.trim(),
        txSignature: txSig,
      });

      toast.success(
        `Claim complete: ${tokenAmount.toFixed(6)} ${tokenSymbol} • ${solAmount.toFixed(
          6
        )} SOL • $${usdAmount.toFixed(2)} USD`
      );

      // Mark card locally as claimed
      setPulledCard((prev: any) =>
        prev
          ? {
              ...prev,
              claimed: true,
              funded: false,
              token_amount: tokenAmount,
              amount_fiat: usdAmount,
            }
          : prev
      );
    } catch (err: any) {
      console.error('Claim failed', err);
      toast.error(err?.message || t('claim.claimError') || 'Failed to claim this CRYPTOCARD');
    } finally {
      setLoading(false);
    }
  };

  // Build preview CardData with correct amounts
  const { cardData, previewTriple, previewSymbol, snapshotTriple, snapshotSymbol } = useMemo(() => {
    if (!pulledCard) return { cardData: null, previewTriple: null, previewSymbol: 'SOL', snapshotTriple: null, snapshotSymbol: 'SOL' };

    const anyCard: any = pulledCard;
    const portfolio = funding?.token_portfolio;

    let mainToken: TokenPortfolioToken | null = null;
    if (portfolio && portfolio.tokens && portfolio.tokens.length > 0) {
      if (anyCard.token_mint) {
        mainToken =
          portfolio.tokens.find((t) => t.mint === anyCard.token_mint) ||
          portfolio.tokens[0];
      } else {
        mainToken = portfolio.tokens[0];
      }
    }

    const tokenMint = (anyCard.token_mint || mainToken?.mint || null) as string | null;
    const tokenSymbol = resolvedTokenLabel || getDisplayTokenLabel(tokenMint, tokenInfo);

    const tokenAmount =
      mainToken?.amount_ui ??
      (typeof anyCard.token_amount === 'number' ? anyCard.token_amount : 0);

    let solAmount = 0;
    if (!anyCard.token_mint) {
      solAmount = funding?.sol_native ?? 0;
    } else {
      solAmount =
        funding?.sol_total_value ??
        (typeof anyCard.token_amount === 'number' ? anyCard.token_amount : 0);
    }

    const fiatFromCard =
      typeof pulledCard.amount_fiat === 'number' ? pulledCard.amount_fiat : 0;

    const usdAmount =
      solPriceUsd && solAmount
        ? solAmount * solPriceUsd
        : fiatFromCard;

    
    // Persist / restore funded amounts so claimed cards still display original values
    const snap = getSnapshot(pulledCard.public_id);
    const isClaimed = !!pulledCard.claimed;

    const hasComputedValue =
      (tokenAmount && tokenAmount > 0) || (usdAmount && usdAmount > 0) || (solAmount && solAmount > 0);

    // On-chain display: if claimed, it should read 0 (no funds). Otherwise, use computed values,
    // and fall back to snapshot only when we truly have no computed value yet.
    const onChainTokenAmount = isClaimed ? 0 : (hasComputedValue ? tokenAmount : (snap?.tokenAmount ?? tokenAmount));
    const onChainTokenSymbol = (snap?.tokenSymbol ?? tokenSymbol) || 'TOKEN';
    const onChainSolAmount = isClaimed ? 0 : (hasComputedValue ? solAmount : (snap?.solAmount ?? solAmount));
    const onChainUsdAmount = isClaimed ? 0 : (hasComputedValue ? usdAmount : (snap?.usdAmount ?? usdAmount));

    // Snapshot (pre-claim) display for transparency
    const snapshotTriple = snap
      ? {
          tokenAmount: snap.tokenAmount ?? 0,
          solAmount: snap.solAmount ?? 0,
          usdAmount: snap.usdAmount ?? 0,
        }
      : null;
    const snapshotSymbol = snap?.tokenSymbol ?? onChainTokenSymbol;

    if (hasComputedValue) {
      saveSnapshot(pulledCard.public_id, {
        tokenAmount,
        tokenSymbol,
        solAmount,
        usdAmount,
      });
    }
const createdAt: string =
      anyCard.created_at || new Date().toISOString();

    const cardData: CardData = {
      cardId: pulledCard.public_id,
      cvv: '•••••', // never show real CVV
      depositAddress: anyCard.deposit_address || '',
      image: anyCard.template_url || '',
      tokenAddress: anyCard.token_mint || '',
      tokenSymbol: onChainTokenSymbol,
      tokenAmount: toNumber(onChainTokenAmount).toFixed(9),
      message: anyCard.message || 'Gift',
      font: anyCard.font || 'Inter',
      hasExpiry: !!pulledCard.expires_at,
      expiryDate: pulledCard.expires_at || '',
      created: createdAt,
      locked: !!pulledCard.locked,
      funded: !!pulledCard.funded,
      fiatValue: toNumber(onChainUsdAmount).toFixed(2),
      solValue: toNumber(onChainSolAmount).toFixed(6),
      step: 3,
    };

    return {
      cardData,
      previewTriple: {
        tokenAmount: onChainTokenAmount,
        solAmount: onChainSolAmount,
        usdAmount: onChainUsdAmount,
      },
      previewSymbol: onChainTokenSymbol,
      snapshotTriple,
      snapshotSymbol,
    };
  }, [pulledCard, funding, solPriceUsd, tokenInfo, resolvedTokenLabel]);

  // Helper to render a clean amount line
  const renderAmountTriple = (
    tokenAmount: number,
    tokenSymbol: string,
    solAmount: number,
    usdAmount: number
  ) => {
    return `${tokenAmount.toFixed(6)} ${tokenSymbol} • ${solAmount.toFixed(
      6
    )} SOL • $${usdAmount.toFixed(2)} USD`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary text-center">
            {t('claim.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          {/* How to claim */}
          <div className="rounded-lg border border-border bg-muted/20 p-3 text-center">
            <div className="text-xs font-semibold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent tracking-wide uppercase">
              HOW TO CLAIM
            </div>

            <ol className="mt-2 list-decimal list-inside inline-block text-left space-y-1 text-xs text-muted-foreground">
              <li>
                Enter your Card ID and click{' '}
                <span className="font-medium text-foreground">Pull Card</span>.
              </li>
              <li>Enter the deposit address where you want the tokens delivered.</li>
              <li>Enter the unique CVV for your card.</li>
              <li>
                Click <span className="font-medium text-foreground">Claim Funds</span>.
              </li>
            </ol>

            <div className="mt-2 text-xs text-muted-foreground">
              Don&apos;t have a wallet yet?{' '}
              <a
                href="https://phantom.com/learn/guides/how-to-create-a-new-wallet"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-4 hover:opacity-90"
              >
                Click HERE
              </a>
            </div>
          </div>


          {/* Card ID input */}
          <div>
            <Label className="text-[9px] uppercase">
              {t('claim.cardId')}
            </Label>
            <Input
              value={cardId}
              onChange={(e) => setCardId(e.target.value.toUpperCase())}
              placeholder={t('claim.cardIdPlaceholder')}
              className="h-8 text-[10px] bg-card/60 border-border/30 mt-1 font-mono"
            />
          </div>

          <Button
            onClick={handlePullCard}
            disabled={loading}
            variant="outline"
            className="w-full h-8 text-[10px] font-bold"
          >
            {loading ? t('claim.loading') : t('claim.pullCard')}
          </Button>

          {/* Preview section */}
          {pulledCard && cardData && previewTriple && (
            <div className="space-y-2 border border-border/40 rounded-lg p-2 bg-background/40">
              <p className="text-[9px] font-semibold uppercase text-muted-foreground mb-1">
                {t('claim.preview')}
              </p>
              <CryptoCard
                data={cardData}
                locked={true}
                isClaimMode={true}
                onScratch={() => {
                  toast.success(
                    t('claim.scratchHint') ??
                      'CVV is on the physical/sent CRYPTOCARD. Keep it safe!'
                  );
                }}
              />

              {/* Summary info under card preview */}
              <div className="text-[9px] space-y-1 mt-2">
                <div>
                  <span className="font-semibold">Status: </span>
                  <span
                    className={
                      pulledCard.claimed
                        ? 'text-emerald-500'
                        : pulledCard.locked
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                    }
                  >
                    {pulledCard.claimed
                      ? 'CLAIMED'
                      : pulledCard.locked
                      ? 'LOCKED'
                      : 'UNLOCKED'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold">On-chain amount: </span>
                  <span>
                    {renderAmountTriple(
                      previewTriple.tokenAmount,
                      previewSymbol,
                      previewTriple.solAmount,
                      previewTriple.usdAmount
                    )}
                  </span>

                  {pulledCard.claimed && snapshotTriple && (
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      <span className="font-semibold text-foreground">Snapshot (pre-claim): </span>
                      {renderAmountTriple(
                        snapshotTriple.tokenAmount,
                        snapshotSymbol || previewSymbol,
                        snapshotTriple.solAmount,
                        snapshotTriple.usdAmount
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Wallet + CVV fields */}
          <div>
            <Label className="text-[9px] uppercase">
              {t('claim.wallet')}
            </Label>
            <Input
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder={t('claim.walletPlaceholder')}
              className="h-8 text-[10px] bg-card/60 border-border/30 mt-1"
            />
          </div>

          <div>
            <Label className="text-[9px] uppercase">
              {t('claim.cvv')}
            </Label>
            <div className="relative mt-1">
            <Input
              value={cvv}
              onChange={(e) => setCvv(e.target.value)}
              placeholder={t('claim.cvvPlaceholder')}
              className="h-8 text-[10px] bg-card/60 border-border/30 pr-9"
              maxLength={5}
              type={showCvv ? 'text' : 'password'}
            />
            <button
              type="button"
              onClick={() => setShowCvv((s) => !s)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showCvv ? 'Hide CVV' : 'Show CVV'}
            >
              {showCvv ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
            <p className="text-[8px] text-muted-foreground mt-1">
              {t('claim.cvvHint')}
            </p>
          </div>

          <Button
            onClick={handleClaim}
            disabled={loading || !pulledCard}
            className="w-full h-9 text-[11px] font-black gradient-success text-primary-foreground disabled:opacity-50"
          >
            {loading ? t('claim.claiming') : t('claim.claimButton')}
          </Button>

          {/* Claim summary AFTER success */}
          {claimSummary && (
            <div className="mt-2 p-2 rounded-lg border border-emerald-400/40 bg-emerald-500/5 text-[9px] space-y-1">
              <div className="font-semibold text-emerald-400 uppercase tracking-wide">
                Claim complete
              </div>
              <div>
                <span className="font-semibold">Amount claimed: </span>
                <span>
                  {renderAmountTriple(
                    claimSummary.tokenAmount,
                    claimSummary.tokenSymbol,
                    claimSummary.solAmount,
                    claimSummary.usdAmount
                  )}
                </span>
              </div>
              <div>
                <span className="font-semibold">Sent to: </span>
                <span className="font-mono">
                  {claimSummary.destination}
                </span>
              </div>
              {claimSummary.txSignature && (
                <div>
                  <span className="font-semibold">Transaction: </span>
                  <a
                    href={`https://solscan.io/tx/${claimSummary.txSignature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-primary"
                  >
                    View on Solscan
                  </a>
                </div>
              )}
            </div>
          )}

          <Button
            onClick={handleClose}
            variant="destructive"
            className="w-full h-7 text-[9px]"
          >
            {t('claim.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
