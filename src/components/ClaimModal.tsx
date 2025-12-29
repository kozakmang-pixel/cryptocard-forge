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

interface ClaimModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Optional: pre-fill the Card ID field (used by /claim?id=... links)
  initialCardId?: string;
}

interface ClaimResult {
  success: boolean;
  signature?: string;
  amount_sol?: number;
  amount_fiat?: number;
  destination_wallet?: string;
  error?: string;
}

export function ClaimModal({ open, onOpenChange, initialCardId }: ClaimModalProps) {
  const { t } = useLanguage();

  const [cardId, setCardId] = useState(initialCardId ?? '');
  const [walletAddress, setWalletAddress] = useState('');
  const [cvv, setCvv] = useState('');
  const [loading, setLoading] = useState(false);
  const [pulledCard, setPulledCard] = useState<CardStatusResponse | (CardStatusResponse & any) | null>(null);

  // Keep cardId in sync if initialCardId changes (e.g. different /claim?id=...)
  useEffect(() => {
    if (initialCardId) {
      setCardId(initialCardId);
    }
  }, [initialCardId]);

  const handleClose = () => {
    setCardId(initialCardId ?? '');
    setWalletAddress('');
    setCvv('');
    setPulledCard(null);
    setLoading(false);
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

    try {
      const status = await apiService.getCardStatus(trimmed);

      // Optional: basic guardrails
      if (!status.funded) {
        toast.error(t('claim.notFunded') ?? 'This card is not funded yet.');
      }
      if (!status.locked) {
        toast.error(t('claim.notLocked') ?? 'This card must be locked before claiming.');
      }

      setPulledCard(status as any);
      toast.success(t('claim.cardLocated') ?? 'CRYPTOCARD located. Review details carefully before claiming.');
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

    if (!pulledCard.locked) {
      toast.error(t('claim.notLocked') ?? 'This card must be locked before claiming.');
      return;
    }
    if (!pulledCard.funded) {
      toast.error(t('claim.notFunded') ?? 'This card is not funded yet.');
      return;
    }

    setLoading(true);

    try {
      const result = (await apiService.claimCard({
        public_id: pulledCard.public_id,
        cvv: cvv.trim(),
        destination_wallet: walletAddress.trim(),
      })) as ClaimResult;

      if (!result?.success) {
        throw new Error(result?.error || 'Claim failed');
      }

      const sig = result.signature;
      const amountSol =
        typeof result.amount_sol === 'number' ? result.amount_sol : 0;
      const amountFiat =
        typeof result.amount_fiat === 'number' ? result.amount_fiat : 0;

      const shortDest = result.destination_wallet
        ? `${result.destination_wallet.slice(0, 4)}...${result.destination_wallet.slice(-4)}`
        : '';

      // In v1 the "token" IS SOL, so we intentionally show SOL twice (token + native)
      toast.success(
        `${t('claim.claimCompleteTitle') ?? 'Claim complete'}\n` +
          `${amountSol.toFixed(6)} SOL • ${amountSol.toFixed(6)} SOL • $${amountFiat.toFixed(
            2
          )} USD ${t('claim.sentTo') ?? 'has been sent to:'} ${shortDest}` +
          (sig ? `\nTx: ${sig.slice(0, 8)}...` : '')
      );

      // Keep the modal open so the user can still see the card,
      // but update the local state to reflect claimed = true, funded = false.
      setPulledCard((prev) =>
        prev
          ? ({
              ...prev,
              funded: false,
              claimed: true,
              token_amount: amountSol,
              amount_fiat: amountFiat,
            } as any)
          : prev
      );

      setLoading(false);
    } catch (err: any) {
      console.error('Claim failed', err);
      toast.error(err?.message || t('claim.claimError') || 'Failed to claim this card');
      setLoading(false);
    }
  };

  const cardData: CardData | null = useMemo(() => {
    if (!pulledCard) return null;

    const anyCard = pulledCard as any;

    const tokenAmount =
      typeof anyCard.token_amount === 'number' ? anyCard.token_amount : 0;

    // For v1 we treat "token" as SOL on all loaded cards
    const solAmount = tokenAmount;

    const amountFiat =
      typeof anyCard.amount_fiat === 'number' ? anyCard.amount_fiat : 0;

    const createdAt: string = anyCard.created_at || new Date().toISOString();

    // Always label the token as SOL for now (v1)
    const tokenSymbol = 'SOL';

    return {
      cardId: pulledCard.public_id,
      // Backend never returns real CVV (good). We show placeholder on the preview.
      cvv: '•••••',
      depositAddress: anyCard.deposit_address || '',
      image: anyCard.template_url || '',
      tokenAddress: anyCard.token_mint || '',
      tokenSymbol,
      tokenAmount: tokenAmount.toString(),
      message: anyCard.message || 'Gift',
      font: anyCard.font || 'Inter',
      hasExpiry: !!pulledCard.expires_at,
      expiryDate: pulledCard.expires_at || '',
      created: createdAt,
      locked: !!pulledCard.locked,
      funded: !!pulledCard.funded,
      fiatValue: amountFiat.toFixed(2),
      solValue: solAmount.toFixed(6),
      step: 3,
    };
  }, [pulledCard]);

  // Simple derived amounts for summary line under the card
  const summaryTriple = useMemo(() => {
    if (!pulledCard) {
      return {
        tokenAmount: 0,
        solAmount: 0,
        fiatAmount: 0,
        currency: 'USD',
      };
    }
    const anyCard = pulledCard as any;
    const tokenAmount =
      typeof anyCard.token_amount === 'number' ? anyCard.token_amount : 0;
    const solAmount = tokenAmount; // v1: token = SOL
    const fiatAmount =
      typeof anyCard.amount_fiat === 'number' ? anyCard.amount_fiat : 0;
    const currency: string = anyCard.currency || 'USD';

    return { tokenAmount, solAmount, fiatAmount, currency };
  }, [pulledCard]);

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
                      'CVV is on the physical/sent card. Keep it safe!'
                  );
                }}
              />

              {/* Card summary triple: TOKEN • SOL • FIAT */}
              <div className="text-[9px] space-y-1 mt-1">
                <div>
                  <span className="font-semibold">
                    {t('claim.balance') ?? 'On-chain balance'}{' '}
                  </span>
                  <span>
                    {summaryTriple.tokenAmount.toFixed(6)} SOL •{' '}
                    {summaryTriple.solAmount.toFixed(6)} SOL • $
                    {summaryTriple.fiatAmount.toFixed(2)}{' '}
                    {summaryTriple.currency}
                  </span>
                </div>
              </div>

              <div className="text-[9px] space-y-1 mt-1">
                <div>
                  <span className="font-semibold">
                    {t('claim.status')}{' '}
                  </span>
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
