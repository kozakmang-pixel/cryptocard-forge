import { FC } from 'react';
import { Button } from '@/components/ui/button';
import { Gift, ShieldCheck, Sparkles } from 'lucide-react';

interface HeaderProps {
  onClaimClick: () => void;
}

export const Header: FC<HeaderProps> = ({ onClaimClick }) => {
  return (
    <header className="sticky top-0 z-30 mb-4">
      <div className="glass-card border border-border/40 backdrop-blur-xl rounded-2xl px-3 py-2 md:px-4 md:py-3 flex items-center justify-between gap-3 shadow-card">
        {/* Left: brand + logo */}
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {/* Logo */}
          <div className="flex-shrink-0">
            <img
              src="/cryptocards-logo.png"
              alt="CRYPTOCARDS logo"
              className="w-8 h-8 md:w-9 md:h-9 rounded-full"
            />
          </div>

          {/* Brand text */}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs md:text-sm font-black tracking-[0.25em] uppercase bg-gradient-to-r from-emerald-300 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                CRYPTOCARDS
              </span>
              <span className="hidden md:inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-[2px] text-[10px] font-semibold text-emerald-300 tracking-wide">
                Live on&nbsp;Solana
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] md:text-[11px] text-muted-foreground">
              <Sparkles className="w-3 h-3 text-cyan-300 flex-shrink-0" />
              <span className="truncate">
                On-chain, non-custodial crypto gift cards.
              </span>
            </div>
          </div>
        </div>

        {/* Right: trust + CTA */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden md:flex items-center gap-1 text-[10px] text-muted-foreground pr-2 border-r border-border/40">
            <ShieldCheck className="w-3 h-3 text-emerald-300" />
            <span className="uppercase tracking-wide font-semibold">
              Non-custodial • Audited
            </span>
          </div>
          <Button
            onClick={onClaimClick}
            size="sm"
            className="h-7 md:h-8 px-3 md:px-4 text-[10px] md:text-[11px] font-black gradient-success text-primary-foreground flex items-center gap-1 shadow-[0_0_25px_rgba(56,189,248,0.9)] ring-2 ring-cyan-400/60 animate-pulse"
          >
            <Gift className="w-3 h-3 md:w-4 md:h-4" />
            <span>CLAIM A CARD</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
