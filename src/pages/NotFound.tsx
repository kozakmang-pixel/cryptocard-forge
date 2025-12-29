import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { SecurityBanner } from '@/components/SecurityBanner';
import { PriceBanner } from '@/components/PriceBanner';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  const [solPrice, setSolPrice] = useState(150);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
        );
        const data = await res.json();
        if (data.solana?.usd) setSolPrice(data.solana.usd);
      } catch {
        // ignore errors
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
        <Header onClaimClick={() => navigate('/claim')} />

        <div className="mt-10 flex justify-center">
          <div className="glass-card rounded-xl p-5 max-w-sm w-full text-center">
            <h1 className="text-[12px] font-bold tracking-[0.22em] text-primary uppercase mb-2">
              Page Not Found
            </h1>
            <p className="text-[10px] text-muted-foreground mb-4 break-words">
              We couldn&apos;t find a page at:
              <br />
              <span className="text-[9px] text-accent break-all">
                {location.pathname}
                {location.search}
              </span>
            </p>

            <div className="flex flex-col gap-2">
              <Button
                className="h-8 text-[10px] font-semibold"
                onClick={() => navigate('/')}
              >
                ← Back to Main Site
              </Button>
              <Button
                variant="outline"
                className="h-8 text-[9px]"
                onClick={() => navigate('/claim')}
              >
                Go to Claim Page
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
