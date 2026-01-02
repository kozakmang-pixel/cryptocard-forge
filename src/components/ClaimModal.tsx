// src/components/ClaimModal.tsx
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { CryptoCard } from './CryptoCard';
import { useLanguage } from '@/lib/languageStore';
import { apiService, type CardStatusResponse } from '@/services/api';
import type { CardData } from '@/types/card';

// CRYPTOCARDS mint (your CA from header)
const CRYPTOCARDS_MINT = 'AuxRtUDw7KhWZxbMcfqPoB1cLcvq44Sw83UHRd3Spump';

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

function getSymbolForCard(card: CardStatusResponse | null, mainTokenMint?: string | null) {
  const mint = (card as any)?.token_mint || mainTokenMint || null;

  if (!mint) return 'SOL';
  if (mint === CRYPTOCARDS_MINT) return 'CRYPTOCARDS';
  return 'TOKEN';
}

export function ClaimModal({ open, onOpenChange, initialCardId }: ClaimModalProps) {
  const { t } = useLanguage();

  // Treat missing translations as undefined (some i18n stores return the key itself).
  const safeT = (key: string) => {
    const v = t(key);
    if (!v || v === key) return undefined;
    return v;
  };

  type PersistedSnapshot = {
    tokenAmount: number;
    tokenSymbol: string;
    solAmount: number;
    usdAmount: number;
  };

  const snapshotKey = (id: string) => `cc_claim_snapshot_${id}`;

  const loadSnapshot = (id: string): PersistedSnapshot | null => {
    try {
      const raw = localStorage.getItem(snapshotKey(id));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed) return null;
      const tokenAmount = Number(parsed.tokenAmount);
      const solAmount = Number(parsed.solAmount);
      const usdAmount = Number(parsed.usdAmount);
      const tokenSymbol = typeof parsed.tokenSymbol === 'string' ? parsed.tokenSymbol : 'TOKEN';
      if (!Number.isFinite(tokenAmount) || !Number.isFinite(solAmount) || !Number.isFinite(usdAmount)) {
        return null;
      }
      return { tokenAmount, solAmount, usdAmount, tokenSymbol };
    } catch {
      return null;
    }
  };

  const saveSnapshot = (id: string, snap: PersistedSnapshot) => {
    try {
      localStorage.setItem(snapshotKey(id), JSON.stringify(snap));
    } catch {
      // ignore
    }
  };

  // Unified message for "not funded / already claimed"
  // Unified message for "not funded / already claimed"
  const notFundedMessage =
    safeT('claim.notFundedOrClaimed') ??
    'This card appears to have no funds. It may already be claimed or hasn\'t been funded yet.';

  const [cardId, setCardId] = useState(initialCardId ?? '');
  const [walletAddress, setWalletAddress] = useState('');
  const [cvv, setCvv] = useState('');
  const [loading, setLoading] = useState(false);
  const [pulledCard, setPulledCard] = useState<CardStatusResponse | (CardStatusResponse & any) | null>(null);
  const [funding, setFunding] = useState<FundingSnapshot | null>(null);

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

      toast.success(t('claim.cardFound') ?? 'CRYPTOCARD found!');
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

      const tokenSymbol = getSymbolForCard(
        pulledCard,
        mainToken?.mint || cardAny.token_mint || null
      );

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
  const { cardData, previewTriple, previewSymbol, previewNumbers } = useMemo(() => {
    if (!pulledCard) return { cardData: null, previewTriple: null, previewSymbol: 'SOL', previewNumbers: null };

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

    const tokenSymbol = getSymbolForCard(
      pulledCard,
      mainToken?.mint || anyCard.token_mint || null
    );

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

    const createdAt: string =
      anyCard.created_at || new Date().toISOString();

    const cardData: CardData = {
      cardId: pulledCard.public_id,
      cvv: '•••••', // never show real CVV
      depositAddress: anyCard.deposit_address || '',
      image: anyCard.template_url || '',
      tokenAddress: anyCard.token_mint || '',
      tokenSymbol: displaySymbol,
      tokenAmount: displayTokenAmount.toFixed(6),
      message: anyCard.message || 'Gift',
      font: anyCard.font || 'Inter',
      hasExpiry: !!pulledCard.expires_at,
      expiryDate: pulledCard.expires_at || '',
      created: createdAt,
      locked: !!pulledCard.locked,
      funded: !!pulledCard.funded,
      fiatValue: displayUsdAmount.toFixed(2),
      solValue: displaySolAmount.toFixed(6),
      step: 3,
    };

    return {
      cardData,
      previewTriple: {
        tokenAmount: displayTokenAmount,
        solAmount: displaySolAmount,
        usdAmount: displayUsdAmount,
      },
      previewSymbol: displaySymbol,
      previewNumbers: { tokenAmount: displayTokenAmount, solAmount: displaySolAmount, usdAmount: displayUsdAmount, tokenSymbol: displaySymbol },
    };
  }, [pulledCard, funding, solPriceUsd]);

  // Persist a snapshot of the funded amounts so the preview remains correct even after the card is claimed.
  useEffect(() => {
    if (!pulledCard || !previewNumbers) return;
    const anyCard: any = pulledCard;
    if (anyCard.claimed) return;

    const hasNonZero =
      (Number.isFinite(previewNumbers.tokenAmount) && previewNumbers.tokenAmount > 0) ||
      (Number.isFinite(previewNumbers.solAmount) && previewNumbers.solAmount > 0) ||
      (Number.isFinite(previewNumbers.usdAmount) && previewNumbers.usdAmount > 0);
    if (!hasNonZero) return;

    const existing = loadSnapshot(anyCard.public_id);
    if (existing) {
      // If we previously saved a placeholder symbol, upgrade it when we learn the real one.
      if (existing.tokenSymbol === 'TOKEN' && previewNumbers.tokenSymbol && previewNumbers.tokenSymbol !== 'TOKEN') {
        saveSnapshot(anyCard.public_id, { ...existing, tokenSymbol: previewNumbers.tokenSymbol });
      }
      return;
    }

    saveSnapshot(anyCard.public_id, {
      tokenAmount: previewNumbers.tokenAmount,
      tokenSymbol: previewNumbers.tokenSymbol || 'TOKEN',
      solAmount: previewNumbers.solAmount,
      usdAmount: previewNumbers.usdAmount,
    });
  }, [pulledCard, previewNumbers]);

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
            <Input
              value={cvv}
              onChange={(e) => setCvv(e.target.value)}
              placeholder={t('claim.cvvPlaceholder')}
              className="h-8 text-[10px] bg-card/60 border-border/30 mt-1"
              maxLength={5}
            />
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
