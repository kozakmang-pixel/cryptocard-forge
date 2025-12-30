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
  const { loading, tokenInfo, fetchInfo } = useTokenLookup();

  useEffect(() => {
    if (tokenAddress) {
      fetchInfo(tokenAddress);
    }
  }, [tokenAddress, fetchInfo]);

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
        {t('designer.message')}
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
          {FONT_OPTIONS.map((f) => (
            <SelectItem key={f} value={f} className="text-[10px]">
              {f}
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
        <Input
          type="date"
          value={expiryDate}
          onChange={(e) => onExpiryDateChange(e.target.value)}
          className="text-[10px] font-medium h-8 mt-1"
        />
      )}

      {/* Artwork grid */}
      <ImageGrid
        selectedImage={selectedImage}
        onSelectImage={onImageSelect}
        onUpload={onImageUpload}
      />

      {/* SAVE DESIGN & CONTINUE */}
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
          ? 'DESIGN SAVED – PROCEED'
          : 'SAVE DESIGN & CONTINUE'}
      </Button>

      {/* How do CRYPTOCARDS work? */}
      <div className="bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/5 p-3 rounded-xl mt-4 border border-border/50">
        <h3 className="text-[10px] font-black uppercase text-primary text-center mb-2">
          {t('designer.howItWorks')}
        </h3>
        <div className="text-[9px] text-foreground leading-relaxed space-y-1">
          <p>{t('designer.how1')}</p>
          <p>{t('designer.how2')}</p>
          <p>{t('designer.how3')}</p>
          <p>{t('designer.how4')}</p>
        </div>
      </div>

      {/* Fee info */}
      <div className="bg-card/50 border border-border/40 p-3 rounded-xl mt-4">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="flex flex-col items-center">
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

