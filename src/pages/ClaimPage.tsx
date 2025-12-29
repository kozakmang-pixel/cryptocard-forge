import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { SecurityBanner } from '@/components/SecurityBanner';
import { PriceBanner } from '@/components/PriceBanner';
import { Header } from '@/components/Header';
import { ClaimModal } from '@/components/ClaimModal';
import { Button } from '@/components/ui/button';

export default function ClaimPage() {
  const [searchParams] = useSearchParams();
  const initialCardId = (searchParams.get('id') || '').toUpperCase();
  const [claimModalOpen, setClaimModalOpen] = useState(true);
  const [solPrice, setSolPrice] = useState(150);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
        );
        const data = await res.json();
        if (data.solana?.usd) setSolPrice(data.solana.usd);
      } catch {
        // ignore pricing errors in claim page
      }
    };
    fetchPrice();
    const interval = setInterval(fetchPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen pb-12 relative">
      <AnimatedBackground />
      <SecurityBanner />
      <PriceBanner solPrice={solPrice} />

      <div className="pt-[60px] px-3 max-w-5xl mx-auto relative z-10">
        <Header onClaimClick={() => setClaimModalOpen(true)} />

        {/* BACK BUTTON - added only this */}
        <div className="flex justify-center mt-4">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="h-8 text-[10px] font-semibold"
          >
            ← Back to Main Site
          </Button>
        </div>

        <div className="mt-4 flex justify-center">
          <div className="max-w-md text-center text-[11px] text-muted-foreground">
            This page is for recipients of a CRYPTOCARD. If someone sent you a link, the
            claim form will open automatically. You&apos;ll need the Card ID and the CVV
            from the back of the card to withdraw the funds.
          </div>
        </div>
      </div>

      <ClaimModal
        open={claimModalOpen}
        onOpenChange={setClaimModalOpen}
        initialCardId={initialCardId}
      />
    </div>
  );
}
