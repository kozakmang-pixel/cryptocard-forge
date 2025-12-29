import { cn } from '@/lib/utils';
import { useLanguage } from '@/lib/languageStore';

interface ProgressBarProps {
  currentStep: number;
  locked: boolean;
  funded: boolean;
}

export function ProgressBar({ currentStep, locked, funded }: ProgressBarProps) {
  const { t } = useLanguage();
  const progress = currentStep === 1 ? 0 : currentStep === 2 ? 50 : 100;

  return (
    <div className="mb-3">
      <div className="flex justify-between mb-1.5 text-[8px] font-semibold text-muted-foreground">
        <span className={cn(currentStep >= 1 && 'text-accent animate-glow')}>
          {t('progress.design')}
        </span>
        <span className={cn((funded || locked) && 'text-accent animate-glow')}>
          {t('progress.fund')}
        </span>
        <span className={cn(locked && 'text-accent animate-glow')}>
          {t('progress.gift')}
        </span>
      </div>
      <div className="relative h-2 bg-muted/30 rounded-full overflow-hidden border border-border/30">
        <div
          className="absolute inset-0 h-full gradient-primary transition-all duration-1000 ease-out rounded-full"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 animate-shine overflow-hidden">
            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shine" />
          </div>
        </div>
      </div>
    </div>
  );
}
