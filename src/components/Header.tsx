import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Gift, Sparkles } from 'lucide-react';
import { useLanguage } from '@/lib/languageStore';

interface HeaderProps {
  onClaimClick: () => void;
}

export function Header({ onClaimClick }: HeaderProps) {
  const { t } = useLanguage();
  const caAddress = '9fakeCRYPTOCARDSaddress123exampleXYZ';

  const copyCA = () => {
    navigator.clipboard.writeText(caAddress);
    toast.success('Contract address copied!');
  };

  return (
    <header className="flex flex-col items-center py-6 px-3">
      {/* Main Title with enhanced styling */}
      <div className="relative mb-2">
        <div className="absolute inset-0 blur-2xl bg-gradient-to-r from-primary/30 via-accent/20 to-secondary/30 rounded-full" />
        <h1 className="relative text-3xl md:text-4xl lg:text-5xl font-black tracking-wider gradient-text text-glow flex items-center gap-3">
          <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-primary animate-pulse" />
          {t('header.title')}
          <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-secondary animate-pulse" style={{ animationDelay: '0.5s' }} />
        </h1>
      </div>
      
      {/* Subtitle */}
      <p className="text-xs md:text-sm text-muted-foreground text-center max-w-md mb-6 leading-relaxed">
        {t('header.subtitle')}
      </p>
      
      {/* Claim Button */}
      <div className="mb-4 w-full max-w-md">
        <Button
          onClick={onClaimClick}
          className="relative w-full h-14 text-lg font-black rounded-xl shadow-glow-green hover:brightness-110 hover:scale-[1.02] transition-all duration-300 overflow-hidden group"
          style={{
            background: 'linear-gradient(135deg, hsl(154, 100%, 50%), hsl(191, 100%, 50%), hsl(277, 100%, 50%))',
            color: 'hsl(0, 0%, 0%)',
          }}
        >
          <span className="relative z-10 flex items-center justify-center gap-2">
            <Gift className="w-6 h-6" />
            <span>{t('header.claimButton')}</span>
          </span>
          <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        </Button>
        <p className="text-center text-[9px] text-accent mt-2 font-semibold animate-pulse">
          {t('header.claimHint')}
        </p>
      </div>

      {/* CA and Buy Button */}
      <div className="flex flex-wrap gap-3 items-center justify-center">
        <div className="flex items-center gap-2 bg-card/60 backdrop-blur-sm px-3 py-2 rounded-lg border border-border/40 hover:border-primary/40 transition-colors">
          <span className="text-[9px] text-primary font-bold">{t('header.ca')}</span>
          <span className="text-[9px] font-mono text-foreground/80">
            {caAddress.slice(0, 12)}...{caAddress.slice(-6)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={copyCA}
            className="h-6 px-2 text-[8px] font-bold border-primary/30 hover:bg-primary/10 hover:border-primary"
          >
            {t('header.copy')}
          </Button>
        </div>
        
        <Button
          className="gradient-primary text-primary-foreground font-black text-[10px] px-4 py-2 h-8 rounded-lg hover:brightness-110 hover:scale-105 transition-all shadow-glow-cyan"
        >
          {t('header.buyButton')}
        </Button>
      </div>
    </header>
  );
}
