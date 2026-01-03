import { useState } from 'react';
import { cn } from '@/lib/utils';
import { CardData } from '@/types/card';

interface CryptoCardProps {
  data: CardData | null;
  locked: boolean;
  onScratch?: () => void;
  message?: string;
  image?: string;
  font?: string;
  tokenSymbol?: string;
  tokenAmount?: string;
  solValue?: string;
  fiatValue?: string;
  fiatCurrency?: string;
  expiryDate?: string;
  hasExpiry?: boolean;
  isClaimMode?: boolean;
  claimCvv?: string;
}

export function CryptoCard({
  data,
  locked,
  onScratch,
  message = 'Your message here',
  image = 'https://picsum.photos/300/190?random=1',
  font = 'Inter',
  tokenSymbol = 'TOKEN',
  tokenAmount = '0',
  solValue = '0.0000',
  fiatValue = '0.00',
  fiatCurrency = 'USD',
  expiryDate,
  hasExpiry = false,
  isClaimMode = false,
  claimCvv,
}: CryptoCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [scratched, setScratch] = useState(false);

  const cardId = data?.cardId || '0000-0000';

  const cvv =
    (isClaimMode && claimCvv && claimCvv.trim()) ||
    data?.cvv ||
    '*****';

  const displayImage = data?.image || image;
  const displayMessage = data?.message || message;
  const displayFont = data?.font || font;
  const displayToken = data?.tokenSymbol || tokenSymbol;
  const displayTokenAmount = data?.tokenAmount || tokenAmount;
  const displaySolValue = data?.solValue || solValue;
  const displayFiatValue = data?.fiatValue || fiatValue;
  const displayExpiry =
    hasExpiry && expiryDate
      ? expiryDate
      : data?.hasExpiry && data.expiryDate
      ? data.expiryDate
      : null;

  const canScratch = isClaimMode && locked;

  // IMPORTANT: place your logo file at: /public/cryptocards-logo.png
  const logoSrc = '/cryptocards-logo.png';

  const handleScratch = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canScratch) {
      setScratch(true);
      onScratch?.();
    }
  };

  return (
    <div className="flex justify-center mb-3">
      <div
        onClick={() => setFlipped(!flipped)}
        className="relative w-[280px] h-[175px] cursor-pointer perspective-1000"
        style={{ perspective: '1000px' }}
      >
        <div
          className={cn(
            'relative w-full h-full transition-transform duration-700',
            flipped && 'rotate-y-180'
          )}
          style={{
            transformStyle: 'preserve-3d',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front */}
          <div
            className={cn(
              'absolute inset-0 rounded-xl overflow-hidden bg-card border border-border/50',
              flipped && 'opacity-0'
            )}
            style={{ backfaceVisibility: 'hidden' }}
          >
            <img
              src={displayImage}
              className="absolute inset-0 w-full h-full object-cover opacity-55"
            />

            {/* Logo (Front) */}
            <img
              src={logoSrc}
              alt="CRYPTOCARDS"
              className="absolute bottom-2 right-2 w-[28px] h-[28px] object-contain z-20 drop-shadow"
              draggable={false}
            />

            <div className="absolute inset-0 p-3 flex flex-col justify-between z-10">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[8px] text-muted-foreground uppercase font-semibold">
                    {displayToken}
                  </span>
                  <div className="text-lg font-black text-accent leading-tight">
                    {displayTokenAmount}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground">
                    ≈ {displaySolValue} SOL
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    ≈ ${displayFiatValue} {fiatCurrency}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-end text-[6px] opacity-70">
                <div className="flex flex-col leading-tight">
                  <span className="uppercase font-semibold">
                    {displayExpiry || 'NO EXPIRATION DATE'}
                  </span>
                  <span className="uppercase">ID: {cardId}</span>
                </div>
              </div>

              <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-black tracking-[0.25em] uppercase bg-gradient-to-r from-emerald-300 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                CRYPTOCARDS
              </span>
            </div>
          </div>

          {/* Back */}
          <div
            className={cn(
              'absolute inset-0 rounded-xl overflow-hidden bg-card border border-border/50',
              !flipped && 'opacity-0'
            )}
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <img
              src={displayImage}
              className="absolute inset-0 w-full h-full object-cover opacity-55"
            />

            {/* Logo (Back) */}
            <img
              src={logoSrc}
              alt="CRYPTOCARDS"
              className="absolute bottom-2 right-2 w-[26px] h-[26px] object-contain z-10 drop-shadow"
              draggable={false}
            />

            <div className="absolute inset-0 p-2 flex flex-col items-center justify-center z-10">
              <span
                className="text-sm font-semibold text-center max-w-[80%]"
                style={{ fontFamily: displayFont }}
              >
                {displayMessage}
              </span>

              <div className="absolute bottom-2 right-2" style={{ transform: 'translateY(-32px)' }}>
                <div
                  onClick={handleScratch}
                  className={cn(
                    'px-2 py-1 rounded text-[9px] font-mono font-black tracking-wider border border-border/50',
                    scratched
                      ? 'bg-foreground text-background'
                      : 'bg-gradient-to-r from-muted to-card',
                    canScratch
                      ? 'cursor-pointer'
                      : 'opacity-60 cursor-not-allowed'
                  )}
                >
                  {scratched ? cvv : isClaimMode ? 'SCRATCH' : '•••••'}
                </div>
              </div>

              <div className="absolute bottom-2 left-2 text-[6px] uppercase opacity-60 leading-tight">
                <div className="font-semibold">
                  {displayExpiry || 'NO EXPIRATION DATE'}
                </div>
                <div>ID: {cardId}</div>
              </div>

              <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] font-black tracking-[0.25em] uppercase bg-gradient-to-r from-emerald-300 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                CRYPTOCARDS
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
