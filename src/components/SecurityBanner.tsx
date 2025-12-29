import { Shield } from 'lucide-react';
import { useLanguage } from '@/lib/languageStore';

export function SecurityBanner() {
  const { t } = useLanguage();
  
  return (
    <div className="fixed top-0 left-0 right-0 z-[10000] px-2 py-0.5 text-[7px] bg-card/98 border-b border-border/30 text-center backdrop-blur-xl shadow-lg">
      <Shield className="inline-block w-2.5 h-2.5 mr-1 text-primary" />
      <span className="text-muted-foreground">
        {t('security.message')}
      </span>
    </div>
  );
}
