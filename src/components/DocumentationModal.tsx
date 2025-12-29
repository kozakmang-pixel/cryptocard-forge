import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Book,
  Gift,
  Wallet,
  Lock,
  Share2,
  Clock,
  User,
  Shield,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';

interface DocumentationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentationModal({ open, onOpenChange }: DocumentationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-primary text-center flex items-center justify-center gap-2">
            <Book className="w-4 h-4" />
            CRYPTOCARDS Documentation
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="space-y-6 text-[13px] leading-relaxed">
            {/* Overview */}
            <section>
              <h3 className="text-primary font-bold text-base mb-2 flex items-center gap-2">
                <Book className="w-4 h-4" /> Overview
              </h3>
              <p className="text-muted-foreground">
                CRYPTOCARDS is a platform for creating, sending, and claiming blockchain-powered
                digital gift cards (&quot;CRYPTOCARD&quot;). A CRYPTOCARD allows a user to
                pre-load cryptocurrency value or token credit and deliver it to another person using
                a unique shareable link.
              </p>
              <p className="text-muted-foreground mt-2">
                This documentation provides a high-level summary of how the system works, how users
                are expected to interact with the service, and what to expect from the product.
              </p>
            </section>

            {/* How CRYPTOCARDS Works */}
            <section>
              <h3 className="text-primary font-bold text-base mb-3 flex items-center gap-2">
                <Gift className="w-4 h-4" /> How CRYPTOCARDS Works
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Create a Card */}
                <div className="bg-card/60 border border-border/60 rounded-lg p-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2 mb-2">
                    <Gift className="w-4 h-4" /> Create a Card
                  </h4>
                  <ul className="text-muted-foreground space-y-1">
                    <li>
                      • A user enters card details such as amount, currency, message, expiry, and
                      theme.
                    </li>
                    <li>
                      • The platform generates a secure deposit address and a unique public ID.
                    </li>
                  </ul>
                </div>

                {/* Fund the Card */}
                <div className="bg-card/60 border border-border/60 rounded-lg p-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2 mb-2">
                    <Wallet className="w-4 h-4" /> Fund the Card
                  </h4>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• The sender transfers crypto to the assigned deposit address.</li>
                    <li>• Once confirmed, the card is marked as funded.</li>
                    <li>• The card can be funded multiple times until you manually lock it.</li>
                  </ul>
                </div>

                {/* Lock and Share the Card */}
                <div className="bg-card/60 border border-border/60 rounded-lg p-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2 mb-2">
                    <Lock className="w-4 h-4" /> Lock and Share the Card
                  </h4>
                  <ul className="text-muted-foreground space-y-1">
                    <li>
                      • Once you are satisfied with your amount, currency, message, expiry, and
                      theme - you can then lock your card.
                    </li>
                    <li>• A shareable link containing the public card ID is generated.</li>
                    <li>• A CVV is provided for security.</li>
                  </ul>
                </div>

                {/* Claim the Card */}
                <div className="bg-card/60 border border-border/60 rounded-lg p-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2 mb-2">
                    <Share2 className="w-4 h-4" /> Claim the Card
                  </h4>
                  <ul className="text-muted-foreground space-y-1">
                    <li>
                      • A recipient enters in a card ID, destination wallet address and security
                      CVV.
                    </li>
                    <li>• Once validated, the card balance is transferred.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Expiration / Refund / Burn Logic */}
            <section>
              <h3 className="text-primary font-bold text-base mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Expiration / Refund Logic / Burn Logic
              </h3>
              <p className="text-muted-foreground mb-2">
                If the card expires before it is claimed, the sender may be able to reclaim funds
                if supported.
              </p>
              <p className="text-muted-foreground">
                All card creations are subject to a 1.5% tax fee on the Solana value of the card.
                The 1.5% tax fee is used to buy $CRYPTOCARDS and burn the token, reducing supply and
                benefitting the ecosystem. The tax fees are collected in our public burn wallet
                (&nbsp;
                <a
                  href="https://solscan.io/account/A3mpAVduHM9QyRgH1NSZp5ANnbPr2Z5vkXtc8EgDaZBF"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-primary font-mono"
                >
                  A3mpAVduHM9QyRgH1NSZp5ANnbPr2Z5vkXtc8EgDaZBF
                </a>
                ). The wallet will automatically purchase $CRYPTOCARDS every time the balance of the
                public wallet is 0.05 SOL or greater.
              </p>
            </section>

            {/* Accounts & Authentication */}
            <section>
              <h3 className="text-primary font-bold text-base mb-2 flex items-center gap-2">
                <User className="w-4 h-4" /> 👤 Accounts &amp; Authentication
              </h3>
              <ul className="text-muted-foreground space-y-1">
                <li>• Users may create optional accounts to track created cards.</li>
                <li>• Email is optional but may be needed for recovery or notifications.</li>
                <li>• Authentication tokens are stored securely in-browser.</li>
              </ul>
            </section>

            {/* Security Expectations */}
            <section>
              <h3 className="text-primary font-bold text-base mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4" /> 🛡 Security Expectations
              </h3>
              <ul className="text-muted-foreground space-y-1">
                <li>
                  • Users remain fully responsible for secure handling of card links and CVV codes.
                </li>
                <li>• Card links should only be shared directly with the intended recipient.</li>
                <li>• The platform cannot guarantee recovery of funds if credentials are leaked.</li>
              </ul>
            </section>

            {/* Limitations / Disclaimers */}
            <section>
              <h3 className="text-warning font-bold text-base mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> ⚠ Limitations / Disclaimers
              </h3>
              <p className="text-muted-foreground">
                CRYPTOCARDS is provided &quot;as-is&quot; and is not a bank, custody service, or
                licensed financial institution. Blockchain transactions are irreversible — support
                cannot unwind or reverse lost funds.
              </p>
            </section>

            {/* Support */}
            <section>
              <h3 className="text-primary font-bold text-base mb-2 flex items-center gap-2">
                <HelpCircle className="w-4 h-4" /> 🆘 Support
              </h3>
              <p className="text-muted-foreground">
                <span className="font-semibold">Email:</span> cryptocards@linuxmail.org
              </p>
              <p className="text-muted-foreground">
                <span className="font-semibold">Website:</span>{' '}
                <a
                  href="https://cryptocards.fun"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-primary"
                >
                  https://cryptocards.fun
                </a>
              </p>
            </section>
          </div>
        </ScrollArea>

        <Button
          onClick={() => onOpenChange(false)}
          variant="outline"
          className="w-full h-8 text-[10px] font-bold mt-2"
        >
          CLOSE
        </Button>
      </DialogContent>
    </Dialog>
  );
}
