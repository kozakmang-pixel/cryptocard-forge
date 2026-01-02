import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Copy, Mail, MessageCircle, Send } from 'lucide-react';
import { useLanguage } from '@/lib/languageStore';

interface ShareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cardId: string;
}

export function ShareModal({ open, onOpenChange, cardId }: ShareModalProps) {
  const { t } = useLanguage();

  const claimLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/claim?id=${encodeURIComponent(cardId)}`
      : `/claim?id=${encodeURIComponent(cardId)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(claimLink);
      toast.success('Claim link copied!');
    } catch {
      toast.error('Unable to copy link');
    }
  };

  const emailShare = () => {
    const subject = encodeURIComponent('You received a CryptoCard!');
    const body = encodeURIComponent(`You've been gifted a CryptoCard! Claim it here: ${claimLink}`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const telegramShare = () => {
    const text = encodeURIComponent(`You've been gifted a CryptoCard! Claim it here: ${claimLink}`);
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(claimLink)}&text=${text}`,
      '_blank'
    );
  };

  const twitterShare = () => {
    const text = encodeURIComponent(`You've been gifted a CryptoCard! Claim it here: ${claimLink}`);
    window.open(
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(claimLink)}&text=${text}`,
      '_blank'
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="text-primary text-center">
            {t('share.title')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-[10px]">
          {/* Card + link info */}
          <div className="space-y-1">
            <p className="font-semibold uppercase text-[9px] text-muted-foreground">
              {t('claim.cardId')}:
            </p>
            <p className="font-mono text-xs bg-background/60 border border-border/40 rounded px-2 py-1">
              {cardId}
            </p>
          </div>

          <div className="space-y-1">
            <p className="font-semibold uppercase text-[9px] text-muted-foreground">
              {t('share.claimLink')}
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <p className="font-mono text-[9px] bg-background/60 border border-border/40 rounded px-2 py-1 break-all">
                  {claimLink}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[9px] font-semibold flex items-center gap-1"
                onClick={copyLink}
              >
                <Copy className="w-3 h-3" />
                {t('share.copyLink')}
              </Button>
            </div>
            <a
              href={claimLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[9px] text-primary underline"
            >
              Open claim link in new tab
            </a>
          </div>

          {/* Share buttons */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={emailShare}
              variant="outline"
              className="h-8 text-[9px] font-semibold flex items-center gap-1 justify-center"
            >
              <Mail className="w-3 h-3" />
              {t('share.email')}
            </Button>

            <Button
              onClick={telegramShare}
              variant="outline"
              className="h-8 text-[9px] font-semibold flex items-center gap-1 justify-center"
            >
              <MessageCircle className="w-3 h-3" />
              {t('share.telegram')}
            </Button>

            <Button
              onClick={twitterShare}
              variant="outline"
              className="h-8 text-[9px] font-semibold flex items-center gap-1 justify-center"
            >
              <Send className="w-3 h-3" />
              {t('share.twitter')}
            </Button>
          </div>

          {/* ⚠ Critical safety warning you asked for */}
          <div className="border-2 border-destructive/60 bg-destructive/10 rounded-lg p-4 text-[12px] text-destructive font-bold leading-snug">
            <div className="text-[14px] tracking-wide">⚠ IMPORTANT</div>
            <div className="mt-1 font-semibold text-[12px]">Save the <span className="underline">CARD ID</span> and <span className="underline">CVV</span> somewhere safe before you send this card.</div>
            <div className="mt-1 font-medium text-[11px] opacity-90">If the recipient loses the CVV or Card ID, the funds on this CRYPTOCARD may be permanently lost.</div>
          </div>

          <Button
            onClick={() => onOpenChange(false)}
            variant="destructive"
            className="w-full h-7 text-[9px]"
          >
            {t('share.close')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
