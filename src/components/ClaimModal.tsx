import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/languageStore';
import { CryptoCard } from '@/components/CryptoCard';
import { CardData } from '@/types/card';
import { apiService } from '@/services/api';
import { ExternalLink, Loader2 } from 'lucide-react';

interface ClaimModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ClaimResult {
  signature: string;
  amount_sol: number;
  destination_wallet: string;
}

export function ClaimModal({ open, onOpenChange }: ClaimModalProps) {
  const { t } = useLanguage();
  const [cardId, setCardId] = useState('');
  const [cvv, setCvv] = useState('');
  const [wallet, setWallet] = useState('');
  const [checking, setChecking] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [cardStatus, setCardStatus] = useState<any | null>(null);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
  const [solPrice, setSolPrice] = useState<number | null>(null);

  // Load SOL price via backend to avoid CORS
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/sol-price');
        if (!res.ok) return;
        const data = await res.json();
        if (data.price_usd) {
          setSolPrice(Number(data.price_usd));
        }
      } catch {
        // ignore
      }
    };
    if (open) load();
  }, [open]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setCardId('');
      setCvv('');
      setWallet('');
      setCardStatus(null);
      setClaimResult(null);
    }
  }, [open]);

  const handleCheck = async () => {
    if (!cardId.trim()) {
      toast.error('Enter a card ID first.');
      return;
    }
    if (!cvv.trim()) {
      toast.error('Enter the card CVV.');
      return;
    }

    setChecking(true);
    setClaimResult(null);
    try {
      const status = await apiService.getCardStatus(cardId.trim());
      setCardStatus(status);
    } catch (err: any) {
      console.error('ClaimModal check error', err);
      toast.error(err?.message || 'Failed to load card status');
      setCardStatus(null);
    } finally {
      setChecking(false);
    }
  };

  const handleClaim = async () => {
    if (!cardStatus) {
      toast.error('Pull card status first.');
      return;
    }
    if (!wallet.trim()) {
      toast.error('Enter the destination wallet.');
      return;
    }
    if (!cvv.trim()) {
      toast.error('Enter the card CVV.');
      return;
    }

    setClaiming(true);
    try {
      const res = await apiService.claimCard({
        public_id: cardId.trim(),
        cvv: cvv.trim(),
        destination_wallet: wallet.trim(),
      });
      setClaimResult(res as ClaimResult);
      toast.success('CRYPTOCARD claimed successfully!');
      // Card is now claimed; refresh status
      const fresh = await apiService.getCardStatus(cardId.trim());
      setCardStatus(fresh);
    } catch (err: any) {
      console.error('ClaimModal claim error', err);
      toast.error(err?.message || 'Failed to claim card');
    } finally {
      setClaiming(false);
    }
  };

  // Build card preview data for CryptoCard
  const previewCard: CardData | null = useMemo(() => {
    if (!cardStatus) return null;

    const createdIso = cardStatus.created_at || new Date().toISOString();
    const tokenAmount =
      typeof cardStatus.token_amount === 'number' ? cardStatus.token_amount : 0;
    const solAmount = tokenAmount; // using SOL as the token for now
    const usd =
      solPrice && tokenAmount > 0 ? (tokenAmount * solPrice).toFixed(2) : '0.00';

    return {
      cardId: cardStatus.public_id,
      cvv: cvv || '*****', // this is what will be revealed when scratched
      depositAddress: cardStatus.deposit_address || 'N/A',
      image: cardStatus.template_url,
      tokenAddress: cardStatus.token_mint || undefined,
      tokenSymbol: cardStatus.currency || 'SOL',
      tokenAmount: tokenAmount.toString(),
      message: cardStatus.message || 'Gift',
      font: 'Inter',
      hasExpiry: !!cardStatus.expires_at,
      expiryDate: cardStatus.expires_at || undefined,
      created: createdIso,
      locked: !!cardStatus.locked,
      funded: !!cardStatus.funded || !!cardStatus.claimed,
      fiatValue: usd,
      solValue: solAmount.toFixed(6),
      step: 3,
    };
  }, [cardStatus, cvv, solPrice]);

  const claimedSol = claimResult?.amount_sol ?? 0;
  const claimedUsd =
    solPrice && claimedSol > 0 ? (claimedSol * solPrice).toFixed(2) : '0.00';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-card/90 border-border/60">
        <DialogHeader>
          <DialogTitle className="text-sm font-black gradient-text uppercase tracking-wide text-center">
            Claim a CRYPTOCARD
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          {/* Left: Card preview */}
          <div className="glass-card rounded-xl p-3 border border-border/40 bg-card/70">
            {previewCard ? (
              <CryptoCard
                data={previewCard}
                locked={true}
                isClaimMode={true}
                message={previewCard.message}
                image={previewCard.image}
                font={previewCard.font}
                tokenSymbol={previewCard.tokenSymbol}
                tokenAmount={previewCard.tokenAmount}
                solValue={previewCard.solValue}
                fiatValue={previewCard.fiatValue}
                fiatCurrency="USD"
                hasExpiry={previewCard.hasExpiry}
                expiryDate={previewCard.expiryDate}
              />
            ) : (
              <div className="text-[10px] text-muted-foreground text-center py-8">
                Enter a CRYPTOCARD ID and CVV, then pull status to preview the card.
              </div>
            )}
          </div>

          {/* Right: Controls */}
          <div className="space-y-3">
            <div>
              <Label className="text-[9px] uppercase tracking-wide opacity-80">
                CRYPTOCARD ID
              </Label>
              <Input
                value={cardId}
                onChange={(e) => setCardId(e.target.value.toUpperCase())}
                placeholder="1234-5678"
                className="mt-1 h-8 text-[10px] font-mono bg-card/60 border-border/40"
              />
            </div>

            <div>
              <Label className="text-[9px] uppercase tracking-wide opacity-80">
                CVV (scratch code)
              </Label>
              <Input
                value={cvv}
                onChange={(e) => setCvv(e.target.value)}
                placeholder="5-digit CVV"
                maxLength={5}
                className="mt-1 h-8 text-[10px] font-mono bg-card/60 border-border/40"
              />
              <p className="text-[9px] text-muted-foreground mt-1">
                The CVV you enter here is what will be revealed when you scratch the card preview.
              </p>
            </div>

            <div>
              <Label className="text-[9px] uppercase tracking-wide opacity-80">
                Destination wallet (Solana)
              </Label>
              <Input
                value={wallet}
                onChange={(e) => setWallet(e.target.value)}
                placeholder="Enter Solana wallet address"
                className="mt-1 h-8 text-[10px] font-mono bg-card/60 border-border/40"
              />
            </div>

            <div className="flex gap-2 mt-1">
              <Button
                onClick={handleCheck}
                disabled={checking}
                className="flex-1 h-8 text-[10px] font-black gradient-primary text-primary-foreground"
              >
                {checking && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                Pull card status
              </Button>
              <Button
                onClick={handleClaim}
                disabled={claiming || !cardStatus}
                className="flex-1 h-8 text-[10px] font-black gradient-success text-primary-foreground disabled:opacity-60"
              >
                {claiming && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                Claim funds
              </Button>
            </div>

            {cardStatus && (
              <div className="mt-2 text-[9px] bg-card/80 border border-border/40 rounded-lg p-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current status</span>
                  <span className="font-semibold">
                    {cardStatus.claimed
                      ? 'Claimed'
                      : cardStatus.locked
                      ? 'Locked'
                      : cardStatus.funded
                      ? 'Funded'
                      : 'Created'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">On-chain amount</span>
                  <span className="font-semibold">
                    {previewCard?.tokenAmount ?? '0.000000'} {previewCard?.tokenSymbol ?? 'SOL'} •{' '}
                    {previewCard?.solValue ?? '0.000000'} SOL • $
                    {previewCard?.fiatValue ?? '0.00'} USD
                  </span>
                </div>
              </div>
            )}

            {claimResult && (
              <div className="mt-2 bg-secondary/10 border border-secondary/40 rounded-lg p-2 text-[9px] space-y-1">
                <div className="font-semibold text-secondary">
                  Claim complete
                </div>
                <div>
                  {claimedSol.toFixed(6)} SOL • ${claimedUsd} USD has been sent to:
                </div>
                <div className="font-mono break-all text-muted-foreground mt-1">
                  {claimResult.destination_wallet}
                </div>
                <div className="mt-1">
                  <a
                    href={`https://solscan.io/tx/${claimResult.signature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:text-primary/80"
                  >
                    View on Solscan
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
