import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ImageGrid } from './ImageGrid';
import { FONT_OPTIONS, FontFamily } from '@/types/card';
import { useTokenLookup } from '@/hooks/useTokenLookup';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/lib/languageStore';

interface CardDesignerProps {
  tokenAddress: string;
  message: string;
  font: FontFamily;
  hasExpiry: boolean;
  expiryDate: string;
  selectedImage: string;
  tokenName: string;
  onTokenAddressChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onFontChange: (value: FontFamily) => void;
  onExpiryToggle: (value: boolean) => void;
  onExpiryDateChange: (value: string) => void;
  onImageSelect: (url: string) => void;
  onImageUpload: (file: File) => void;
  onCreateCard: () => void;
  onTokenInfoChange?: (info: { symbol: string; name: string } | null) => void;
  isCreating: boolean;
  cardCreated: boolean;
  locked: boolean;
}

export function CardDesigner({
  tokenAddress,
  message,
  font,
  hasExpiry,
  expiryDate,
  selectedImage,
  tokenName,
  onTokenAddressChange,
  onMessageChange,
  onFontChange,
  onExpiryToggle,
  onExpiryDateChange,
  onImageSelect,
  onImageUpload,
  onCreateCard,
  onTokenInfoChange,
  isCreating,
  cardCreated,
  locked,
}: CardDesignerProps) {
  const { t } = useLanguage();
  const { tokenInfo, loading: tokenLoading, error: tokenError } = useTokenLookup(tokenAddress);

  useEffect(() => {
    if (onTokenInfoChange) onTokenInfoChange(tokenInfo);
  }, [tokenInfo, onTokenInfoChange]);

  const disabledSave = isCreating || cardCreated || locked;

  return (
    <div className="glass-card rounded-xl p-3 space-y-2 shadow-card hover:shadow-card-hover transition-all hover:-translate-y-0.5">
      {/* Token address */}
      <div>
        <Label className="text-[8px] uppercase tracking-wide opacity-80">
          {t('designer.tokenAddress')}
        </Label>
        <Input
          value={tokenAddress}
          onChange={(e) => onTokenAddressChange(e.target.value)}
          placeholder={t('designer.tokenPlaceholder')}
          className="mt-1 h-7 text-[9px] bg-card/60 border-border/30"
        />
        {tokenLoading && (
          <div className="flex items-center gap-1 text-[8px] text-muted-foreground mt-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Looking up token…</span>
          </div>
        )}
        {tokenInfo && (
          <div className="text-[8px] text-accent font-bold mt-1">
            ${tokenInfo.symbol} ({tokenInfo.name})
          </div>
        )}
        {tokenError && tokenAddress.length >= 32 && (
          <div className="text-[8px] text-destructive mt-1">{tokenError}</div>
        )}
      </div>

      {/* Message */}
      <div>
        <Label className="text-[8px] uppercase tracking-wide opacity-80">
          {t('designer.message')}
        </Label>
        <Textarea
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          placeholder={t('designer.messagePlaceholder')}
          rows={2}
          disabled={locked}
          className="mt-1 text-[9px] bg-card/60 border-border/30 resize-none disabled:opacity-50"
        />
      </div>

      {/* Font */}
      <div>
        <Label className="text-[8px] uppercase tracking-wide opacity-80">
          {t('designer.font')}
        </Label>
        <Select
          value={font}
          onValueChange={(v) => onFontChange(v as FontFamily)}
        >
          <SelectTrigger className="mt-1 h-7 text-[8px] bg-card/60 border-border/30">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-[200px] bg-card border-border z-50">
            {FONT_OPTIONS.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                className="text-[8px]"
                style={{ fontFamily: opt.value }}
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Expiry toggle */}
      <div className="flex items-center justify-between bg-card p-1.5 rounded-lg border border-border/30">
        <span className="text-[8px] font-semibold">
          {t('designer.expiry')}
        </span>
        <Switch
          checked={hasExpiry}
          onCheckedChange={onExpiryToggle}
          className="scale-75"
        />
      </div>

      {hasExpiry && (
        <>
          <Input
            type="date"
            value={expiryDate}
            onChange={(e) => onExpiryDateChange(e.target.value)}
            className="h-7 text-[9px] bg-card/60 border-border/30"
          />
          <div className="text-[7px] text-warning p-1.5 bg-warning/10 border border-warning/30 rounded">
            If not claimed before expiry, funds return to the creator&apos;s wallet.
          </div>
        </>
      )}

      {/* Artwork grid */}
      <ImageGrid
        selectedImage={selectedImage}
        onSelectImage={onImageSelect}
        onUpload={onImageUpload}
      />

      {/* Save design & continue (now above info card, persists but greys out) */}
      <Button
        type="button"
        onClick={onCreateCard}
        disabled={disabledSave}
        className="w-full mt-3 h-8 text-[10px] font-black rounded-lg transition-all
                   bg-gradient-to-r from-primary/90 via-accent/80 to-secondary/90
                   text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isCreating
          ? t('designer.creating')
          : cardCreated
          ? 'Design saved – proceed below'
          : 'Save design & continue'}
      </Button>

      {/* How do CRYPTOCARDS work? */}
      <div className="bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 border border-primary/30 rounded-xl p-4 mt-3 text-center">
        <h4 className="text-sm font-bold text-primary text-center mb-2 uppercase tracking-wide">
          How do CRYPTOCARDS work?
        </h4>
        <p className="text-[10px] text-foreground/90 mb-4 max-w-xs mx-auto">
          On-chain, non-custodial crypto gift cards with no wallet connection required.
          Perfect for giveaways, streams, and real-world gifting.
        </p>

        <div className="space-y-2.5">
          {/* On-chain & verifiable */}
          <div className="p-2 bg-card/40 rounded-lg">
            <div className="flex flex-col items-center justify-center gap-1 mb-1">
              <span className="text-primary text-sm">🛡️</span>
              <span className="text-[9px] font-bold text-center uppercase tracking-wide">
                On-chain &amp; verifiable
              </span>
            </div>
            <p className="text-[10px] text-foreground text-center max-w-xs mx-auto">
              Every CRYPTOCARD is funded on-chain, publicly auditable, and can only be
              claimed once.
            </p>
          </div>

          {/* Protocol tax → buybacks */}
          <div className="p-2 bg-card/40 rounded-lg">
            <div className="flex flex-col items-center justify-center gap-1 mb-1">
              <span className="text-warning text-sm">🔥</span>
              <span className="text-[9px] font-bold text-center uppercase tracking-wide">
                Protocol tax → buybacks
              </span>
            </div>
            <p className="text-[10px] text-foreground text-center max-w-xs mx-auto">
              A transparent protocol tax powers $CRYPTOCARDS buybacks and permanent burn
              mechanics tied directly to on-chain activity.
            </p>
          </div>

          {/* Recycled fees */}
          <div className="p-2 bg-card/40 rounded-lg">
            <div className="flex flex-col items-center justify-center gap-1 mb-1">
              <span className="text-accent text-sm">⚡</span>
              <span className="text-[9px] font-bold text-center uppercase tracking-wide">
                Recycled fees
              </span>
            </div>
            <p className="text-[10px] text-foreground text-center max-w-xs mx-auto">
              All protocol fees are recycled back into the ecosystem to grow liquidity,
              deepen burns, and reward long-term community support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
