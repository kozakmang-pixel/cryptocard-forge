import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';

export function QRModal({ open, onOpenChange, cardId, depositAddress, cvv }: { 
  open: boolean; 
  onOpenChange: (o: boolean) => void; 
  cardId: string; 
  depositAddress: string; 
  cvv?: string;
}) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`Card ID: ${cardId}\nDeposit: ${depositAddress}`)}`;
  
  const copyAll = () => { 
    navigator.clipboard.writeText(`Card ID: ${cardId}\n${cvv ? `CVV: ${cvv}\n` : ''}Deposit Address: ${depositAddress}`); 
    toast.success('Copied!'); 
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-xs">
        <div className="text-center space-y-4">
          <img src={qrUrl} alt="QR" className="w-40 h-40 mx-auto rounded-lg" />
          <div className="text-[10px] text-primary font-semibold">Card ID: {cardId}</div>
          <Button onClick={copyAll} variant="outline" size="sm" className="h-7 text-[9px]">
            <Copy className="w-3 h-3 mr-1" />COPY ALL
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
