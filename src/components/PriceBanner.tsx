import { TrendingUp, TrendingDown } from 'lucide-react';

interface PriceBannerProps { 
  solPrice: number; 
  cryptocardsPrice?: number;
}

export function PriceBanner({ solPrice, cryptocardsPrice = 0.00042 }: PriceBannerProps) {
  return (
    <div className="fixed top-[20px] left-1/2 -translate-x-1/2 z-[999] flex gap-3 items-center bg-gradient-to-r from-background/90 via-primary/10 to-secondary/10 px-3 py-1.5 rounded-lg border border-primary/30 shadow-lg backdrop-blur-md">
      {/* SOL Price */}
      <div className="flex items-center gap-1.5 text-[9px]">
        <img src="https://cryptologos.cc/logos/solana-sol-logo.svg" alt="SOL" className="w-4 h-4" />
        <span className="text-muted-foreground font-medium">SOL:</span>
        <span className="text-primary font-bold">${solPrice.toFixed(2)}</span>
        <TrendingUp className="w-3 h-3 text-accent" />
      </div>
      
      {/* Divider */}
      <div className="w-px h-4 bg-border/50" />
      
      {/* $CRYPTOCARDS Price */}
      <div className="flex items-center gap-1.5 text-[9px]">
        <span className="text-[8px] bg-gradient-to-r from-primary to-accent text-primary-foreground px-1.5 py-0.5 rounded font-black">$CC</span>
        <span className="text-muted-foreground font-medium">CRYPTOCARDS:</span>
        <span className="text-accent font-bold">${cryptocardsPrice.toFixed(5)}</span>
        <TrendingDown className="w-3 h-3 text-warning" />
      </div>
    </div>
  );
}
