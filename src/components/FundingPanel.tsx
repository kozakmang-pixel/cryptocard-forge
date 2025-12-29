import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Copy, Eye, EyeOff, CheckCircle, Lock } from 'lucide-react';
import { useLanguage } from '@/lib/languageStore';
import { apiService } from '@/services/api';

interface FundingPanelProps {
  cardId: string;
  cvv: string;
  depositAddress: string;
  funded: boolean;
  locked: boolean;
  tokenAmount: number;
  solAmount: number;
  fiatAmount: number;
  onFundingStatusChange?: (funded: boolean, solAmount: number) => void;
}

export function FundingPanel({
  cardId,
  cvv,
  depositAddress,
  funded,
  locked,
  tokenAmount,
  solAmount,
  fiatAmount,
  onFundingStatusChange,
}: FundingPanelProps) {
  const { t } = useLanguage();
  const [showCvv, setShowCvv] = useState(false);

  useEffect(() => {
    if (!cardId || !depositAddress) return;

    let isMounted = true;

    const checkFunding = async () => {
      try {
        const result = await apiService.syncCardFunding(cardId);
        if (!isMounted) return;

        const sol = typeof result.sol === 'number' ? result.sol : 0;
        const isFunded = !!result.funded;

        if (onFundingStatusChange) {
          onFundingStatusChange(isFunded, sol);
        }
      } catch (err) {
        console.error('Failed to sync card funding', err);
      }
    };

    checkFunding();
    const intervalId = setInterval(checkFunding, 15000);
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [cardId, depositAddress, onFundingStatusChange]);

  const copyAddress = () => {
    navigator.clipboard.writeText(depositAddress);
    toast.success('Address copied!');
  };

  const copyCardId = () => {
    navigator.clipboard.writeText(cardId);
    toast.success('Card ID copied!');
  };

  const copyCvv = () => {
    navigator.clipboard.writeText(cvv);
    toast.success('CVV copied!');
  };

  const status = (() => {
    if (locked) {
      return {
        text: t('button.cardLocked'),
        color: 'text-secondary',
        bgColor: 'bg-secondary',
        icon: Lock,
      };
    }
    if (funded) {
      return {
        text: t('funding.funded'),
        color: 'text-accent',
        bgColor: 'bg-accent',
        icon: CheckCircle,
      };
    }
    return {
      text: t('funding.waiting'),
      color: 'text-warning',
      bgColor: 'bg-warning',
      icon: null,
    };
  })();

  const tokenStr = tokenAmount > 0 ? tokenAmount.toFixed(6) : '0.000000';
  const solStr = solAmount > 0 ? solAmount.toFixed(6) : '0.000000';
  const fiatStr = fiatAmount > 0 ? `$${fiatAmount.toFixed(2)} USD` : '$0.00 USD';

  const taxSol = solAmount * 0.015;
  const taxUsd = fiatAmount * 0.015;
  const taxToken = tokenAmount * 0.015;

  const taxTokenStr = taxToken > 0 ? taxToken.toFixed(6) : '0.000000';
  const taxSolStr = taxSol > 0 ? taxSol.toFixed(6) : '0.000000';
  const taxUsdStr = taxUsd > 0 ? `$${taxUsd.toFixed(2)} USD` : '$0.00 USD';

  return (
    <div className="glass-card rounded-2xl p-4 mt-3 border border-border/40 bg-card/70 space-y-3">
      <h3 className="text-xs font-black gradient-text text-center uppercase tracking-wide mb-1">
        Fund your CRYPTOCARD
      </h3>

      {/* Card ID */}
      <div>
        <Label className="text-[9px] uppercase tracking-wide opacity-80 text-center block">
          {t('funding.cardId')}
        </Label>
        <div className="flex items-center justify-center gap-2 mt-1.5 p-2 bg-background/40 rounded-lg border border-border/30">
          <span className="text-xs font-mono font-bold text-primary truncate max-w-[200px]">
            {cardId}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyCardId}
            className="h-6 px-2 text-[8px]"
          >
            <Copy className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* CVV */}
      <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-center">
        <p className="text-[10px] font-bold text-destructive mb-1.5">
          {t('funding.cvvWarning')}
        </p>
        <div
          className={cn(
            'font-mono text-lg text-primary font-black tracking-widest my-2',
            !showCvv && 'blur-sm select-none'
          )}
        >
          {cvv}
        </div>
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCvv(!showCvv)}
            className="h-6 px-3 text-[8px] font-semibold"
          >
            {showCvv ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
            {showCvv ? t('funding.hide') : t('funding.show')}
          </Button>
          {showCvv && (
            <Button
              variant="outline"
              size="sm"
              onClick={copyCvv}
              className="h-6 px-3 text-[8px] font-semibold"
            >
              <Copy className="w-3 h-3 mr-1" />
              {t('header.copy')}
            </Button>
          )}
        </div>
      </div>

      {/* Deposit address */}
      <div>
        <Label className="text-[9px] uppercase tracking-wide opacity-80">
          {t('funding.depositAddress')}
        </Label>
        <div
          onClick={copyAddress}
          className="flex items-center justify-center gap-2 mt-1.5 p-2 bg-background/40 rounded-lg border border-border/30 cursor-pointer hover:border-primary/50 hover:bg-card/80 transition-all"
        >
          <span className="text-[9px] font-mono truncate max-w-[220px]">
            {depositAddress}
          </span>
          <Copy className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-center gap-2 font-bold text-[10px]">
        <div
          className={cn(
            'w-2.5 h-2.5 rounded-full',
            status.bgColor,
            !locked && !funded && 'animate-blink'
          )}
        />
        <span className={status.color}>{status.text}</span>
        {status.icon && <status.icon className={cn('w-4 h-4', status.color)} />}
      </div>

      {/* Funded totals */}
      <div className="space-y-2 text-center text-[9px]">
        <div className="bg-primary/5 border border-primary/30 rounded-lg py-2 px-2">
          <div className="font-semibold uppercase mb-0.5">
            Funded
          </div>
          <div className="font-bold">
            {tokenStr} TOKEN • {solStr} SOL • {fiatStr}
          </div>
        </div>
      </div>

      {/* Protocol tax */}
      <div className="bg-warning/10 border border-warning/40 rounded-lg py-2 px-3 text-center text-[9px]">
        <div className="font-semibold uppercase mb-1">
          1.5% Protocol Tax on funded &amp; locked CRYPTOCARDS
        </div>
        <p className="mb-1">
          A 1.5% protocol tax is applied to the SOL balance on each funded and locked CRYPTOCARD.
          Tax proceeds automatically swap to $CRYPTOCARDS and are sent to our public burn wallet,
          which triggers a burn whenever its balance reaches 0.02&nbsp;SOL or more.
        </p>
        <div className="font-bold mt-1">
          Estimated tax on this CRYPTOCARD: {taxTokenStr} TOKEN • {taxSolStr} SOL • ~
          {taxUsdStr}
        </div>
      </div>
    </div>
  );
}
