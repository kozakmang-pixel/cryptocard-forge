// src/components/DocumentationModal.tsx

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
                CRYPTOCARDS is a non-custodial platform for creating, funding, and claiming
                blockchain-powered digital gift cards (&quot;CRYPTOCARDS&quot;) on Solana. Each
                card represents a one-time claim on a funded on-chain balance, secured by a unique
                card ID and CVV.
              </p>
              <p className="text-muted-foreground mt-2">
                This documentation provides a high-level overview of how CRYPTOCARDS operates, how
                users are expected to interact with the Service, and what to keep in mind when
                using it in production or live environments such as streams.
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
                      • Choose a token, artwork (image or GIF), message, and optional expiry date.
                    </li>
                    <li>
                      • The platform generates a secure deposit address and a unique public card ID.
                    </li>
                    <li>
                      • A private CVV is created to protect the claim process.
                    </li>
                  </ul>
                </div>

                {/* Fund the Card */}
                <div className="bg-card/60 border border-border/60 rounded-lg p-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2 mb-2">
                    <Wallet className="w-4 h-4" /> Fund the Card
                  </h4>
                  <ul className="text-muted-foreground space-y-1">
                    <li>• Send tokens to the deposit address shown in the funding panel.</li>
                    <li>• The on-chain balance is read directly from Solana.</li>
                    <li>
                      • A card can be funded multiple times until you decide to lock it
                      permanently.
                    </li>
                  </ul>
                </div>

                {/* Lock and Share the Card */}
                <div className="bg-card/60 border border-border/60 rounded-lg p-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2 mb-2">
                    <Lock className="w-4 h-4" /> Lock and Share the Card
                  </h4>
                  <ul className="text-muted-foreground space-y-1">
                    <li>
                      • When you are satisfied with the funded amount and design, lock the
                      CRYPTOCARD.
                    </li>
                    <li>
                      • Locking prevents further deposits and finalizes the card for claiming.
                    </li>
                    <li>
                      • You can then share the card ID and claim instructions with the recipient.
                    </li>
                  </ul>
                </div>

                {/* Claim the Card */}
                <div className="bg-card/60 border border-border/60 rounded-lg p-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2 mb-2">
                    <Share2 className="w-4 h-4" /> Claim the Card
                  </h4>
                  <ul className="text-muted-foreground space-y-1">
                    <li>
                      • The recipient enters the card ID, destination wallet address, and CVV in
                        the claim panel.
                    </li>
                    <li>
                      • After validation, the card&apos;s balance is transferred on-chain to the
                        destination wallet.
                    </li>
                    <li>
                      • Once successfully claimed, the card cannot be used again.
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Expiration / Refund / Burn Logic */}
            <section>
              <h3 className="text-primary font-bold text-base mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Expiration, Refund, &amp; Burn Logic
              </h3>
              <p className="text-muted-foreground mb-2">
                Expiry options and refund logic may evolve over time. Where supported, expired
                cards can be earmarked for refund to the original funder or directed to protocol
                burns, depending on configuration.
              </p>
              <p className="text-muted-foreground">
                Each funded and locked CRYPTOCARD is subject to a{' '}
                <span className="font-semibold">1.5% protocol tax</span> on its SOL value. This tax
                is allocated to a public burn wallet and used to purchase $CRYPTOCARDS for
                permanent burns, reducing circulating supply and supporting the long-term economics
                of the ecosystem.
              </p>
              <p className="text-muted-foreground mt-2">
                The current public burn wallet is:{' '}
                <a
                  href="https://solscan.io/account/A3mpAVduHM9QyRgH1NSZp5ANnbPr2Z5vkXtc8EgDaZBF"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-primary font-mono"
                >
                  A3mpAVduHM9QyRgH1NSZp5ANnbPr2Z5vkXtc8EgDaZBF
                </a>
                . When the wallet balance reaches a configured SOL threshold, automated buyback and
                burn events may be triggered.
              </p>
            </section>

            {/* Accounts & Authentication */}
            <section>
              <h3 className="text-primary font-bold text-base mb-2 flex items-center gap-2">
                <User className="w-4 h-4" /> Accounts &amp; Authentication
              </h3>
              <ul className="text-muted-foreground space-y-1">
                <li>• Users may optionally create an account to track created CRYPTOCARDS.</li>
                <li>
                  • Email is optional but recommended for password reset, notifications, and
                    enhanced account recovery.
                </li>
                <li>
                  • Authentication tokens are stored client-side (for example, in local storage)
                    and should be protected by the user&apos;s device security.
                </li>
              </ul>
            </section>

            {/* Security Expectations */}
            <section>
              <h3 className="text-primary font-bold text-base mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Security Expectations
              </h3>
              <ul className="text-muted-foreground space-y-1">
                <li>
                  • Users are responsible for keeping card IDs, CVVs, and claim links private,
                    especially when streaming or sharing screens.
                </li>
                <li>
                  • CRYPTOCARDS does not control recipient wallets or private keys and cannot
                    reverse on-chain transactions.
                </li>
                <li>
                  • Always verify destination addresses before claiming or sending funds.
                </li>
              </ul>
            </section>

            {/* Limitations / Disclaimers */}
            <section>
              <h3 className="text-warning font-bold text-base mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Limitations &amp; Disclaimers
              </h3>
              <p className="text-muted-foreground">
                CRYPTOCARDS is a software interface to on-chain activity and is provided
                &quot;as is&quot; without warranties of any kind. It is not a bank, broker,
                custodian, or licensed financial institution. All blockchain transactions are
                irreversible, and support cannot unwind or recover funds sent to incorrect or
                compromised addresses.
              </p>
              <p className="text-muted-foreground mt-2">
                Use of the Service is at your own risk. You should evaluate your own risk tolerance
                and, where appropriate, consult legal, tax, or financial professionals before
                transacting in digital assets.
              </p>
            </section>

            {/* Support */}
            <section>
              <h3 className="text-primary font-bold text-base mb-2 flex items-center gap-2">
                <HelpCircle className="w-4 h-4" /> Support
              </h3>
              <p className="text-muted-foreground">
                For operational questions, incident reports, or general feedback, you can reach us
                at:
              </p>
              <p className="text-muted-foreground mt-1">
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
