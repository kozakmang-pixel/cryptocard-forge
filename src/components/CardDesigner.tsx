import { useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  cardCreated: boolean;
  locked: boolean;
  isCreating: boolean;
  onCreateCard: () => void;
  onTokenAddressChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onFontChange: (value: FontFamily) => void;
  onExpiryToggle: (checked: boolean) => void;
  onExpiryDateChange: (value: string) => void;
  onImageSelect: (url: string) => void;
  onImageUpload: (file: File) => void;
  onTokenInfoChange: (info: { symbol: string; name: string } | null) => void;
}

export function CardDesigner({
  tokenAddress,
  message,
  font,
  hasExpiry,
  expiryDate,
  selectedImage,
  tokenName,
  cardCreated,
  locked,
  isCreating,
  onCreateCard,
  onTokenAddressChange,
  onMessageChange,
  onFontChange,
  onExpiryToggle,
  onExpiryDateChange,
  onImageSelect,
  onImageUpload,
  onTokenInfoChange,
}: CardDesignerProps) {
  const { t } = useLanguage();
  const { tokenInfo, loading } = useTokenLookup(tokenAddress);

  useEffect(() => {
    if (tokenInfo) {
      onTokenInfoChange({ symbol: tokenInfo.symbol, name: tokenInfo.name });
    } else {
      onTokenInfoChange(null);
    }
  }, [tokenInfo, onTokenInfoChange]);

  const disabledSave = isCreating || locked;

  return (
    <div className="glass-card rounded-xl p-3 shadow-card">
      {/* Token address */}
      <Label className="text-[10px] font-bold uppercase text-muted-foreground">
        {t('designer.tokenAddress')}
      </Label>
      <div className="flex items-center gap-2 mt-1">
        <Input
          placeholder={t('designer.tokenAddressPlaceholder')}
          value={tokenAddress}
          onChange={(e) => onTokenAddressChange(e.target.value)}
          className="text-[10px] font-medium h-8"
        />
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
        ) : tokenInfo ? (
          <div className="text-[9px] font-bold text-primary whitespace-nowrap">
            {tokenInfo.symbol} — {tokenInfo.name}
          </div>
        ) : tokenAddress ? (
          <div className="text-[9px] font-bold text-destructive whitespace-nowrap">
            {t('designer.tokenNotFound')}
          </div>
        ) : null}
      </div>

      {/* Message */}
      <Label className="text-[10px] font-bold uppercase text-muted-foreground mt-3 block">
        {t('designer.messageLabel')}
      </Label>
      <Textarea
        placeholder={t('designer.messagePlaceholder')}
        value={message}
        onChange={(e) => onMessageChange(e.target.value)}
        className="text-[10px] font-medium min-h-[60px]"
      />

      {/* Font */}
      <Label className="text-[10px] font-bold uppercase text-muted-foreground mt-3 block">
        {t('designer.font')}
      </Label>
      <Select value={font} onValueChange={(v) => onFontChange(v as FontFamily)}>
        <SelectTrigger className="h-8 text-[10px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONT_OPTIONS.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="text-[10px]"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Expiry */}
      <div className="flex items-center justify-between mt-3">
        <Label className="text-[10px] font-bold uppercase text-muted-foreground">
          {t('designer.expiry')}
        </Label>
        <Switch
          checked={hasExpiry}
          onCheckedChange={onExpiryToggle}
          className="data-[state=checked]:bg-primary"
        />
      </div>

      {hasExpiry && (
        <div className="mt-2">
          <Label className="text-[9px] font-medium text-muted-foreground block mb-1">
            {t('designer.expiryDate')}
          </Label>
          <Input
            type="date"
            value={expiryDate}
            onChange={(e) => onExpiryDateChange(e.target.value)}
            className="h-8 text-[10px]"
          />
          <div className="mt-1 text-[9px] text-muted-foreground">
            {t('designer.expiryHint')}
          </div>
        </div>
      )}

      {/* Artwork grid */}
      <ImageGrid
        selectedImage={selectedImage}
        onSelectImage={onImageSelect}
        onUpload={onImageUpload}
      />

      {/* Save design & continue */}
      <Button
        type="button"
        onClick={onCreateCard}
        disabled={disabledSave}
        className="w-full mt-3 h-8 text-[10px] font-black uppercase tracking-wide
                   bg-gradient-to-r from-primary/90 via-accent/80 to-secondary/90
                   text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isCreating
          ? t('designer.creating')
          : cardCreated
          ? 'DESIGN SAVED – PROCEED'
          : 'SAVE DESIGN & CONTINUE'}
      </Button>

      {/* How do CRYPTOCARDS work? */}
      <div className="bg-gradient-to-br from-primary/10 via-accent/10 to-secondary/10 border border-primary/30 rounded-xl p-4 mt-3 text-center">
        <h4 className="text-sm font-bold text-primary text-center mb-2 uppercase tracking-wide">
          How do CRYPTOCARDS work?
        </h4>

        <div className="grid grid-cols-2 gap-3 text-left mb-2">
          <div className="space-y-1">
            <div className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/90 text-[10px] text-primary-foreground">
                1
              </span>
              <span>{t('designer.infoStep1Title')}</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-snug">
              {t('designer.infoStep1Body')}
            </p>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/90 text-[10px] text-primary-foreground">
                2
              </span>
              <span>{t('designer.infoStep2Title')}</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-snug">
              {t('designer.infoStep2Body')}
            </p>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/90 text-[10px] text-primary-foreground">
                3
              </span>
              <span>{t('designer.infoStep3Title')}</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-snug">
              {t('designer.infoStep3Body')}
            </p>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/90 text-[10px] text-primary-foreground">
                4
              </span>
              <span>{t('designer.infoStep4Title')}</span>
            </div>
            <p className="text-[10px] text-muted-foreground leading-snug">
              {t('designer.infoStep4Body')}
            </p>
          </div>
        </div>

        {/* Token + expiry summary */}
        <div className="grid grid-cols-2 gap-3 text-left mt-1">
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">
              Token
            </div>
            <div className="text-[11px] font-semibold text-foreground">
              {tokenName || t('designer.tokenUnknown')}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-muted-foreground uppercase mb-1">
              Expiry
            </div>
            <div className="text-[11px] font-semibold text-foreground">
              {hasExpiry
                ? expiryDate || t('designer.expiryUnset')
                : t('designer.noExpiry')}
            </div>
          </div>
        </div>

        <div className="mt-3 text-[9px] text-muted-foreground leading-snug">
          <div className="font-semibold text-foreground mb-1">
            {t('designer.securityTitle')}
          </div>
          <p>{t('designer.securityBody')}</p>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2 text-left">
          <div className="bg-background/80 border border-primary/30 rounded-lg p-2">
            <div className="text-[10px] font-bold text-primary uppercase mb-1">
              {t('designer.nonCustodialTitle')}
            </div>
            <p className="text-[9px] text-muted-foreground leading-snug">
              {t('designer.nonCustodialBody')}
            </p>
          </div>
          <div className="bg-background/80 border border-primary/30 rounded-lg p-2">
            <div className="text-[10px] font-bold text-primary uppercase mb-1">
              {t('designer.flexibleTitle')}
            </div>
            <p className="text-[9px] text-muted-foreground leading-snug">
              {t('designer.flexibleBody')}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-left">
          <div className="bg-background/80 border border-primary/30 rounded-lg p-2 flex flex-col items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center mb-1">
              <span className="text-[11px] font-bold text-primary">$</span>
            </div>
            <span className="text-[9px] font-bold text-center uppercase tracking-wide">
              No custody
            </span>
          </div>
          <div className="bg-background/80 border border-primary/30 rounded-lg p-2 flex flex-col items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center mb-1">
              <span className="text-[11px] font-bold text-primary">∞</span>
            </div>
            <span className="text-[9px] font-bold text-center uppercase tracking-wide">
              Flexible claims
            </span>
          </div>
          <div className="bg-background/80 border border-primary/30 rounded-lg p-2 flex flex-col items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center mb-1">
              <span className="text-[11px] font-bold text-primary">%</span>
            </div>
            <span className="text-[9px] font-bold text-center uppercase tracking-wide">
              Recycled fees
            </span>
          </div>
        </div>
        <p className="text-[10px] text-foreground text-center max-w-xs mx-auto">
          All protocol fees are recycled back into the ecosystem to grow liquidity,
          deepen burns, and reward long-term community support.
        </p>
      </div>
    </div>
  );
}
