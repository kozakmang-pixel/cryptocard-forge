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

// For claim-complete toast data
interface ClaimSummary {
  tokenAmount: number;
  tokenSymbol: string;
  solAmount: number;
  fiatAmount: number;
  destination: string;
}

export function ClaimModal({ open, onOpenChange, initialCardId }: ClaimModalProps) {
  const { t } = useLanguage();

  const [cardId, setCardId] = useState(initialCardId ?? '');
  const [walletAddress, setWalletAddress] = useState('');
  const [cvv, setCvv] = useState('');
  const [loading, setLoading] = useState(false);
  const [pulledCard, setPulledCard] = useState<CardStatusResponse | (CardStatusResponse & any) | null>(null);

  // Local SOL price just for this modal (optional – used only if backend stored fiat = 0)
  const [solPriceOverride, setSolPriceOverride] = useState<number | null>(null);

  // Claim summary for a nicer toast
  const [lastClaim, setLastClaim] = useState<ClaimSummary | null>(null);

  // Keep cardId in sync if initialCardId changes (e.g. different /claim?id=...)
  useEffect(() => {
    if (initialCardId) {
      setCardId(initialCardId);
    }
  }, [initialCardId]);

  // Optional SOL price fetch (from backend helper). If it fails, we just stay null and
  // rely on amount_fiat coming from the backend.
  useEffect(() => {
    const fetchSolPrice = async () => {
      try {
        const res = await fetch('/sol-price');
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (data && typeof data.price_usd === 'number') {
          setSolPriceOverride(data.price_usd);
        }
      } catch {
        // silent – we only use this as a helper
      }
    };
    if (open) {
      fetchSolPrice();
    }
  }, [open]);

  const handleClose = () => {
    setCardId(initialCardId ?? '');
    setWalletAddress('');
    setCvv('');
    setPulledCard(null);
    setLoading(false);
    setLastClaim(null);
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
    setLastClaim(null);

    try {
      const status = await apiService.getCardStatus(trimmed);

      if (!status.funded && !status.claimed) {
        toast.error(t('claim.notFunded') ?? 'This card is not funded yet.');
      }
      if (!status.locked && !status.claimed) {
        toast.error(t('claim.notLocked') ?? 'This card must be locked before claiming.');
      }

      setPulledCard(status as any);
      toast.success(
        t('claim.cardFoundNice') ??
          'CRYPTOCARD located. Review the details below before claiming.'
      );
    } catch (err: any) {
      console.error('Failed to load card status', err);
      setPulledCard(null);
      toast.error(err?.message || t('claim.notFound') || 'Card not found. Check the Card ID.');
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!pulledCard) {
      toast.error(t('claim.pullFirst') ?? 'Pull a card first');
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

    if (!pulledCard.locked && !pulledCard.claimed) {
      toast.error(t('claim.notLocked') ?? 'This card must be locked before claiming.');
      return;
    }
    if (!pulledCard.funded && !pulledCard.claimed) {
      toast.error(t('claim.notFunded') ?? 'This card is not funded yet.');
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

      const sig = result.signature as string | undefined;
      const amountSol = typeof result.amount_sol === 'number' ? result.amount_sol : 0;

      // Derive token + fiat for SOL-based cards
      const anyCard = pulledCard as any;
      const rawTokenAmt =
        typeof anyCard.token_amount === 'number' && anyCard.token_amount > 0
          ? anyCard.token_amount
          : amountSol;

      const tokenSymbolFromCard: string | undefined =
        anyCard.token_symbol || anyCard.tokenSymbol || null;

      const tokenSymbol =
        tokenSymbolFromCard ||
        (anyCard.token_mint ? 'TOKEN' : 'SOL'); // SOL default when no token mint

      const effectiveSol = amountSol || rawTokenAmt || 0;

      // Prefer backend amount_fiat if it was already there
      const fiatFromDb =
        typeof pulledCard.amount_fiat === 'number' && pulledCard.amount_fiat > 0
          ? pulledCard.amount_fiat
          : 0;

      const effectiveFiat =
        fiatFromDb > 0
          ? fiatFromDb
          : solPriceOverride && effectiveSol > 0
          ? effectiveSol * solPriceOverride
          : 0;

      setLastClaim({
        tokenAmount: rawTokenAmt || effectiveSol,
        tokenSymbol,
        solAmount: effectiveSol,
        fiatAmount: effectiveFiat,
        destination: walletAddress.trim(),
      });

      toast.success(
        sig
          ? `Claim complete: ${
              rawTokenAmt || effectiveSol
            } ${tokenSymbol} • ${effectiveSol.toFixed(
              6
            )} SOL • $${effectiveFiat.toFixed(
              2
            )} USD. Tx: ${sig.slice(0, 8)}…`
          : t('claim.claimSuccess') ?? 'Claim request submitted!'
      );

      // Mark card as claimed locally so status text is correct if user pulls again
      setPulledCard((prev) =>
        prev
          ? ({
              ...prev,
              claimed: true,
              funded: false,
              token_amount: effectiveSol,
              amount_fiat:
                effectiveFiat > 0 ? effectiveFiat : prev.amount_fiat ?? 0,
            } as any)
          : prev
      );
    } catch (err: any) {
      console.error('Claim failed', err);
      toast.error(err?.message || t('claim.claimError') || 'Failed to claim this card');
    } finally {
      setLoading(false);
    }
  };

  // Derived card data for preview + summary
  const { cardData, summary } = useMemo(() => {
    if (!pulledCard) {
      return {
        cardData: null as CardData | null,
        summary: null as
          | {
              tokenAmount: number;
              tokenSymbol: string;
              solAmount: number;
              fiatAmount: number;
            }
          | null,
      };
    }

    const anyCard = pulledCard as any;

    const tokenAmountRaw =
      typeof anyCard.token_amount === 'number' ? anyCard.token_amount : 0;

    const tokenSymbolFromCard: string | undefined =
      anyCard.token_symbol || anyCard.tokenSymbol || null;

    const tokenSymbol =
      tokenSymbolFromCard ||
      (anyCard.token_mint ? 'TOKEN' : 'SOL'); // if no token_mint, treat as SOL card

    const solAmount = tokenAmountRaw;

    const fiatFromDb =
      typeof pulledCard.amount_fiat === 'number' && pulledCard.amount_fiat > 0
        ? pulledCard.amount_fiat
        : 0;

    const effectiveFiat =
      fiatFromDb > 0
        ? fiatFromDb
        : solPriceOverride && solAmount > 0
        ? solAmount * solPriceOverride
        : 0;

    const createdAt: string =
      anyCard.created_at || new Date().toISOString();

    const card: CardData = {
      cardId: pulledCard.public_id,
      // Backend never returns real CVV; we still show placeholder on preview
      cvv: '•••••',
      depositAddress: anyCard.deposit_address || '',
      image: anyCard.template_url || '',
      tokenAddress: anyCard.token_mint || '',
      tokenSymbol,
      tokenAmount: solAmount.toString(),
      message: anyCard.message || 'Gift',
      font: anyCard.font || 'Inter',
      hasExpiry: !!pulledCard.expires_at,
      expiryDate: pulledCard.expires_at || '',
      created: createdAt,
      locked: !!pulledCard.locked,
      funded: !!pulledCard.funded,
      fiatValue: effectiveFiat.toFixed(2),
      solValue: solAmount.toFixed(6),
      step: 3,
    };

    return {
      cardData: card,
      summary: {
        tokenAmount: solAmount,
        tokenSymbol,
        solAmount,
        fiatAmount: effectiveFiat,
      },
    };
  }, [pulledCard, solPriceOverride]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-primary text-center text-sm font-black tracking-wide">
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

          {/* Preview + balance summary */}
          {pulledCard && cardData && summary && (
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
                      'CVV is on the physical/sent card. Keep it safe!'
                  );
                }}
              />

              {/* Card info under preview */}
              <div className="text-[9px] space-y-1 mt-2 px-1 py-1.5 rounded-lg bg-card/40 border border-border/30">
                <div className="flex justify-between">
                  <span className="font-semibold uppercase">
                    {t('claim.balance') ?? 'Balance'}
                  </span>
                  <span className="font-mono">
                    {summary.tokenAmount.toFixed(6)} {summary.tokenSymbol} •{' '}
                    {summary.solAmount.toFixed(6)} SOL • $
                    {summary.fiatAmount.toFixed(2)} USD
                  </span>
                </div>
              </div>

              <div className="text-[9px] space-y-1">
                <div>
                  <span className="font-semibold">{t('claim.status')} </span>
                  <span
                    className={
                      pulledCard.claimed
                        ? 'text-emerald-400'
                        : pulledCard.locked
                        ? 'text-destructive'
                        : 'text-amber-400'
                    }
                  >
                    {pulledCard.claimed
                      ? t('claim.claimed') ?? 'Claimed'
                      : pulledCard.locked
                      ? t('claim.locked') ?? 'Locked'
                      : t('claim.unlocked') ?? 'Unlocked'}
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

          {/* Claim summary (stays after claim) */}
          {lastClaim && (
            <div className="mt-1 p-2 rounded-lg border border-emerald-400/50 bg-emerald-500/10 text-[9px] space-y-1">
              <div className="font-bold uppercase text-emerald-400">
                {t('claim.claimCompleteTitle') ?? 'Claim complete'}
              </div>
              <div>
                {(lastClaim.tokenAmount || lastClaim.solAmount).toFixed(6)}{' '}
                {lastClaim.tokenSymbol}{' '}
                • {lastClaim.solAmount.toFixed(6)} SOL • $
                {lastClaim.fiatAmount.toFixed(2)} USD{' '}
                {t('claim.claimCompleteSubtitle') ??
                  'has been sent to:'}
              </div>
              <div className="font-mono break-all opacity-90">
                {lastClaim.destination}
              </div>
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
