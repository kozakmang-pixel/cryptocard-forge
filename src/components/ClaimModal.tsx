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
  const [pulledCard, setPulledCard] = useState<CardStatusResponse | (CardStatusResponse & any) | null>(null);

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
    setLoading(false);
    setClaimSummary(null);
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

    try {
      const status = await apiService.getCardStatus(trimmed);

      if (!status.funded) {
        toast.error(t('claim.notFunded') ?? 'This CRYPTOCARD is not funded yet.');
      }
      if (!status.locked) {
        toast.error(t('claim.notLocked') ?? 'This CRYPTOCARD must be locked before claiming.');
      }

      setPulledCard(status as any);
      toast.success(t('claim.cardFound') ?? 'CRYPTOCARD found!');
    } catch (err: any) {
      console.error('Failed to load card status', err);
      setPulledCard(null);
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
      toast.error(t('claim.notFunded') ?? 'This CRYPTOCARD is not funded yet.');
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

      const solAmount =
        typeof result.amount_sol === 'number'
          ? result.amount_sol
          : typeof (pulledCard as any).token_amount === 'number'
          ? (pulledCard as any).token_amount
          : 0;

      const usdFromCard =
        typeof pulledCard.amount_fiat === 'number' ? pulledCard.amount_fiat : 0;

      const usdAmount =
        solPriceUsd && solAmount
          ? solAmount * solPriceUsd
          : usdFromCard;

      const tokenAmount =
        typeof (pulledCard as any).token_amount === 'number'
          ? (pulledCard as any).token_amount
          : solAmount;

      const tokenSymbol = 'SOL'; // Claim flow is SOL-based

      setClaimSummary({
        tokenAmount,
        tokenSymbol,
        solAmount,
        usdAmount,
        destination: result.destination_wallet || walletAddress.trim(),
        txSignature: result.signature || null,
      });

      toast.success(
        `Claim complete: ${tokenAmount.toFixed(6)} ${tokenSymbol} • ${solAmount.toFixed(
          6
        )} SOL • $${usdAmount.toFixed(2)} USD`
      );

      // Mark card locally as claimed
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
      tokenSymbol: 'SOL', // display as SOL, not USD
      tokenAmount: solAmount.toFixed(9),
      message: anyCard.message || 'Gift',
      font: anyCard.font || 'Inter',
      hasExpiry: !!pulledCard.expires_at,
      expiryDate: pulledCard.expires_at || '',
      created: createdAt,
      locked: !!pulledCard.locked,
      funded: !!pulledCard.funded,
      fiatValue: usdAmount.toFixed(2),
      solValue: solAmount.toFixed(6),
      step: 3,
    };
  }, [pulledCard, solPriceUsd]);

  // Helper to render a clean amount line
  const renderAmountTriple = (tokenAmount: number, tokenSymbol: string, solAmount: number, usdAmount: number) => {
    return `${tokenAmount.toFixed(6)} ${tokenSymbol} • ${solAmount.toFixed(
      6
    )} SOL • $${usdAmount.toFixed(2)} USD`;
  };

  // Amounts used in the main "Locked / On-chain amount" line
  const previewTriple = useMemo(() => {
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
    };
  }, [pulledCard, solPriceUsd]);

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
                      'CVV is on the physical/sent CRYPTOCARD. Keep it safe!'
                  );
                }}
              />

              {/* Summary info under card preview */}
              {previewTriple && (
                <div className="text-[9px] space-y-1 mt-2">
                  <div>
                    <span className="font-semibold">Status: </span>
                    <span className={pulledCard.claimed ? 'text-emerald-500' : pulledCard.locked ? 'text-destructive' : 'text-muted-foreground'}>
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
                        'SOL',
                        previewTriple.solAmount,
                        previewTriple.usdAmount
                      )}
                    </span>
                  </div>
                </div>
              )}
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
