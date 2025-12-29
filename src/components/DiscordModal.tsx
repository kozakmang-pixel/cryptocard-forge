import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';

interface DiscordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DiscordModal({ open, onOpenChange }: DiscordModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-primary text-center flex items-center justify-center gap-2">
            <img src="https://cdn.simpleicons.org/discord/00CFFF" alt="Discord" className="w-6 h-6" />
            Discord Community
          </DialogTitle>
        </DialogHeader>

        <div className="text-center py-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Clock className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Coming Soon</h3>
          <p className="text-muted-foreground text-sm">
            Our Discord community is currently being set up. Check back soon for updates!
          </p>
        </div>

        <Button
          onClick={() => onOpenChange(false)}
          variant="outline"
          className="w-full h-8 text-[10px] font-bold"
        >
          CLOSE
        </Button>
      </DialogContent>
    </Dialog>
  );
}
