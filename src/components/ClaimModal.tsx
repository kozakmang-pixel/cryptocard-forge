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

export function ClaimModal({ open, onOpenChange, initialCardId }: ClaimModalProps) {
  const { t } = useLanguage();

  const [cardId, setCardId] = useState(initialCardId ?? '');
  const [walletAddress, setWalletAddress] = useState('');
  const [cvv, setCvv] = useState('');
  const [loading, setLoading] = useState(false);
  const [pulledCard, setPulledCard] =
    useState<CardStatusResponse | (CardStatusResponse & any) | null>(null);

  const [solPriceUsd, setSolPriceUsd] = useState<number | null>(null);
  const [claimSummary, setClaimSummary] = useState<ClaimSummary | null>(null);

  const [onChainPreview, setOnChainPreview] = useState<{
    tokenAmount: number;
    solAmount: number;
    usdAmount: number;
    tokenSymbol: string;
  } | null>(null);

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
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        if (!cancelled && typeof data.price_usd === 'number') {
          setSolPriceUsd(data.price_usd);
        }
      } catch (err) {
        console.error('ClaimModal: failed to fetch SOL price', err);
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
    setLoading(false);
    setClaimSummary(null);
    setOnChainPreview(null);
    onOpenChange(false);
  };

  const handlePullCard = async () => {
    const trimmed = cardId.trim();
    if (!trimmed) {
      toast.error(t('claim.cardIdRequired') ?? 'Please enter a Card ID');
      return;
    }

    setLoading(true);
    setPulledCard(null);
    setClaimSummary(null);
    setOnChainPreview(null);

    try {
      const status = await apiService.getCardStatus(trimmed);

      if (!status.funded) {
        toast.error(t('claim.notFunded') ?? 'This CRYPTOCARD is not funded yet.');
      }
      if (!status.locked) {
        toast.error(t('claim.notLocked') ?? 'This CRYPTOCARD must be locked before claiming.');
      }

      // Try to sync latest on-chain funding (SOL + SPL tokens) so the preview line is accurate.
      try {
        const syncResult: any = await apiService.syncCardFunding(trimmed);
        const portfolio = syncResult?.token_portfolio;
        const totalValueSol =
          typeof syncResult?.total_value_sol === 'number'
            ? syncResult.total_value_sol
            : typeof syncResult?.sol === 'number'
            ? syncResult.sol
            : 0;

        let tokenAmount = totalValueSol;
        let tokenSymbol = 'SOL';

        if (portfolio && Array.isArray(portfolio.tokens) && portfolio.tokens.length > 0) {
          // Pick the token with the highest SOL value as the "primary" asset for display.
          const sorted = [...portfolio.tokens].sort(
            (a: any, b: any) =>
              (Number(b.total_value_sol || 0) || 0) - (Number(a.total_value_sol || 0) || 0)
          );
          const primary = sorted[0];

          const rawUiAmount = primary?.amount_ui ?? primary?.amountRaw ?? primary?.uiAmount;
          tokenAmount = typeof rawUiAmount === 'number' ? rawUiAmount : Number(rawUiAmount || 0);

          // If this card was created as a pure SOL card, still show SOL as the label.
          tokenSymbol = status.currency === 'SOL' ? 'SOL' : 'TOKEN';
        }

        const fiatFromCard =
          typeof status.amount_fiat === 'number' ? status.amount_fiat : 0;

        const usdAmount =
          solPriceUsd && totalValueSol
            ? totalValueSol * solPriceUsd
            : fiatFromCard;

        setOnChainPreview({
          tokenAmount,
          solAmount: totalValueSol,
          usdAmount,
          tokenSymbol,
        });
      } catch (syncErr) {
        console.error('Failed to sync on-chain funding for claim preview', syncErr);
      }

      setPulledCard(status as any);
      toast.success(t('claim.cardFound') ?? 'CRYPTOCARD found!');
    } catch (err: any) {
      console.error('Failed to load card status', err);
      setPulledCard(null);
      setClaimSummary(null);
      setOnChainPreview(null);
      toast.error(
        err?.message || t('claim.notFound') || 'CRYPTOCARD not found. Check the Card ID.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!pulledCard) {
      toast.error(t('claim.pullFirst') ?? 'Pull a CRYPTOCARD first');
      return;
    }

    const trimmedCardId = cardId.trim();
    const trimmedWallet = walletAddress.trim();
    const trimmedCvv = cvv.trim();

    if (!trimmedWallet) {
      toast.error(t('claim.walletRequired') ?? 'Please enter a Solana wallet address');
      return;
    }
    if (!trimmedCvv) {
      toast.error(t('claim.cvvRequired') ?? 'Please enter the CVV printed on the card');
      return;
    }

    setLoading(true);
    setClaimSummary(null);

    try {
      const response = await apiService.claimCard({
        public_id: trimmedCardId,
        cvv: trimmedCvv,
        destination_wallet: trimmedWallet,
      });

      const solAmount =
        typeof response.amount_sol === 'number' ? response.amount_sol : 0;
      const usdAmount =
        solPriceUsd && solAmount ? solAmount * solPriceUsd : 0;

      const summary: ClaimSummary = {
        tokenAmount: solAmount,
        tokenSymbol: 'SOL',
        solAmount,
        usdAmount,
        destination: response.destination_wallet,
        txSignature: response.signature ?? null,
      };

      setClaimSummary(summary);

      // Update local pulledCard state so the preview reflects that it has been claimed
      setPulledCard((prev) =>
        prev
          ? {
              ...prev,
              claimed: true,
              funded: false,
              token_amount: solAmount,
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

  // Build preview CardData with correct SOL + fiat
  const cardData: CardData | null = useMemo(() => {
    if (!pulledCard) return null;

    const anyCard = pulledCard as any;

    const rawTokenAmount =
      typeof anyCard.token_amount === 'number' ? anyCard.token_amount : 0;

    const solAmount = rawTokenAmount;
    const fiatFromCard =
      typeof pulledCard.amount_fiat === 'number' ? pulledCard.amount_fiat : 0;

    const usdAmount =
      solPriceUsd && solAmount
        ? solAmount * solPriceUsd
        : fiatFromCard;

    const createdAt: string =
      anyCard.created_at || new Date().toISOString();

    return {
      cardId: pulledCard.public_id,
      cvv: '•••••', // never show real CVV here
      depositAddress: anyCard.deposit_address || '',
      image: anyCard.template_url || '',
      tokenAddress: anyCard.token_mint || '',
      senderName: anyCard.creator_email || '',
      message: pulledCard.message || '',
      createdAt,
      // For the preview card we show token_amount as the "main" amount
      tokenAmount: solAmount.toFixed(6),
      tokenSymbol: 'SOL',
      locked: !!pulledCard.locked,
      funded: !!pulledCard.funded,
      fiatValue: usdAmount.toFixed(2),
      solValue: solAmount.toFixed(6),
      step: 3,
    };
  }, [pulledCard, solPriceUsd]);

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

  // Amounts used in the main "Locked / On-chain amount" line
  const previewTriple = useMemo(() => {
    // If we already have a synced on-chain preview (from /sync-card-funding),
    // prefer that so SPL token cards show the correct token + SOL + USD triple.
    if (onChainPreview) {
      return onChainPreview;
    }

    if (!pulledCard) return null;

    const anyCard = pulledCard as any;
    const tokenAmount =
      typeof anyCard.token_amount === 'number' ? anyCard.token_amount : 0;
    const solAmount = tokenAmount;
    const fiatFromCard =
      typeof pulledCard.amount_fiat === 'number' ? pulledCard.amount_fiat : 0;

    const usdAmount =
      solPriceUsd && solAmount
        ? solAmount * solPriceUsd
        : fiatFromCard;

    return {
      tokenAmount,
      solAmount,
      usdAmount,
      tokenSymbol: 'SOL',
    };
  }, [onChainPreview, pulledCard, solPriceUsd]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary text-center">
            {t('claim.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Card ID + Pull button */}
          <div className="space-y-1">
            <Label htmlFor="card-id" className="text-[10px] uppercase tracking-wide">
              {t('claim.cardIdLabel') ?? 'CRYPTOCARD ID'}
            </Label>
            <div className="flex gap-2">
              <Input
                id="card-id"
                value={cardId}
                onChange={(e) => setCardId(e.target.value)}
                placeholder={t('claim.cardIdPlaceholder') ?? 'XXXX-XXXX'}
                className="h-8 text-[11px] font-mono"
              />
              <Button
                onClick={handlePullCard}
                disabled={loading}
                className="h-8 text-[11px] font-semibold"
              >
                {loading ? t('claim.loading') : t('claim.pullCard')}
              </Button>
            </div>
          </div>

          {/* Preview section */}
          {pulledCard && cardData && (
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
                      'This is a preview. The real card is scratched by the recipient.'
                  );
                }}
              />
              {previewTriple && (
                <div className="mt-1 text-[10px] text-muted-foreground space-y-0.5">
                  <div>
                    <span className="font-semibold">Status: </span>
                    <span
                      className={
                        pulledCard.claimed
                          ? 'text-emerald-400'
                          : pulledCard.locked
                          ? 'text-amber-300'
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
                        previewTriple.tokenSymbol,
                        previewTriple.solAmount,
                        previewTriple.usdAmount
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Claim form */}
          <div className="space-y-2 border border-border/40 rounded-lg p-2 bg-background/40">
            <Label className="text-[10px] uppercase tracking-wide">
              {t('claim.destinationWalletLabel') ?? 'Destination wallet (Solana)'}
            </Label>
            <Input
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder={t('claim.destinationWalletPlaceholder') ?? 'Enter recipient wallet address'}
              className="h-8 text-[11px] font-mono"
            />

            <Label className="text-[10px] uppercase tracking-wide mt-2">
              {t('claim.cvvLabel') ?? 'CVV from card'}
            </Label>
            <Input
              value={cvv}
              onChange={(e) => setCvv(e.target.value)}
              placeholder={t('claim.cvvPlaceholder') ?? 'Enter the 5-digit CVV'}
              className="h-8 text-[11px] font-mono"
            />

            <Button
              onClick={handleClaim}
              disabled={loading || !pulledCard}
              className="w-full h-8 mt-2 text-[11px] font-black gradient-success text-primary-foreground disabled:opacity-70"
            >
              {loading ? t('claim.claiming') ?? 'Claiming…' : t('claim.claimButton') ?? 'Claim now'}
            </Button>

            {claimSummary && (
              <div className="mt-2 text-[10px] text-muted-foreground border-t border-border/30 pt-2 space-y-1">
                <div>
                  <span className="font-semibold">Claimed: </span>
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
                  <span className="font-semibold">To: </span>
                  <span className="font-mono break-all">{claimSummary.destination}</span>
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
          </div>

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
