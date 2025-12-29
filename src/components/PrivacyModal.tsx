// src/components/PrivacyModal.tsx

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lock } from 'lucide-react';

interface PrivacyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrivacyModal({ open, onOpenChange }: PrivacyModalProps) {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-primary text-center flex items-center justify-center gap-2">
            <Lock className="w-5 h-5" />
            Privacy Policy
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[65vh] pr-4">
          <div className="space-y-5 text-sm">
            <p className="text-muted-foreground text-[12px] text-center">
              Last updated: {currentDate}
            </p>

            <p className="text-muted-foreground leading-relaxed">
              CRYPTOCARDS (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to
              protecting your privacy and handling your information responsibly. This Privacy Policy
              explains what we collect, how we use it, and the choices you have.
            </p>

            {/* 1. Information We Collect */}
            <section>
              <h3 className="text-primary font-bold mb-2">1. Information We Collect</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed mb-2">
                We may collect the following categories of information:
              </p>

              <p className="text-muted-foreground text-[13px] font-semibold mt-2">
                Information you provide:
              </p>
              <ul className="text-muted-foreground text-[13px] space-y-1 list-disc pl-4">
                <li>Username, password, and optional email address</li>
                <li>Card messages, wallet addresses, and related metadata</li>
                <li>Support requests or other communications you send to us</li>
              </ul>

              <p className="text-muted-foreground text-[13px] font-semibold mt-2">
                Information collected automatically:
              </p>
              <ul className="text-muted-foreground text-[13px] space-y-1 list-disc pl-4">
                <li>Basic usage analytics (page views, clicks, session length)</li>
                <li>Approximate region, device type, and browser information</li>
                <li>Technical logs used for security and abuse detection</li>
              </ul>
            </section>

            {/* 2. How We Use Your Information */}
            <section>
              <h3 className="text-primary font-bold mb-2">2. How We Use Your Information</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed mb-2">
                We use collected data to:
              </p>
              <ul className="text-muted-foreground text-[13px] space-y-1 list-disc pl-4">
                <li>Operate, maintain, and improve the CRYPTOCARDS platform</li>
                <li>Authenticate users and secure accounts</li>
                <li>Enable card creation, funding, locking, and claiming workflows</li>
                <li>Monitor platform health, performance, and fraud signals</li>
                <li>Respond to support requests and communicate important updates</li>
              </ul>
              <p className="text-muted-foreground text-[13px] leading-relaxed mt-3 font-semibold">
                We do <span className="uppercase">not</span>:
              </p>
              <ul className="text-muted-foreground text-[13px] space-y-1 list-disc pl-4">
                <li>Sell your personal information</li>
                <li>Rent, trade, or otherwise license your identity data to third parties</li>
              </ul>
            </section>

            {/* 3. Email & Notifications */}
            <section>
              <h3 className="text-primary font-bold mb-2">3. Email &amp; Notifications</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed mb-2">
                Providing an email address is optional. If you choose to share it, we may use it to:
              </p>
              <ul className="text-muted-foreground text-[13px] space-y-1 list-disc pl-4">
                <li>Send password reset and account recovery emails</li>
                <li>Notify you about card-related events (for example, claim status)</li>
                <li>Respond to support or security-related inquiries</li>
              </ul>
              <p className="text-muted-foreground text-[13px] leading-relaxed mt-2">
                You can request to stop receiving non-essential communications at any time.
              </p>
            </section>

            {/* 4. Cookies / Local Storage */}
            <section>
              <h3 className="text-primary font-bold mb-2">4. Cookies &amp; Local Storage</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed">
                We may store authentication tokens or basic preferences in your browser&apos;s local
                storage or cookies so you can stay logged in and use the Service smoothly. You are
                responsible for keeping your device and browser access secure.
              </p>
            </section>

            {/* 5. Data Storage & Retention */}
            <section>
              <h3 className="text-primary font-bold mb-2">5. Data Storage &amp; Retention</h3>
              <ul className="text-muted-foreground text-[13px] space-y-1 list-disc pl-4">
                <li>
                  User and card data may be retained for as long as reasonably necessary to operate
                  the Service, comply with legal obligations, or resolve disputes.
                </li>
                <li>
                  Because core card activity occurs on-chain, certain information may remain
                  permanently recorded on the Solana blockchain.
                </li>
                <li>
                  If the Service is discontinued, associated data may be deleted or archived without
                  guarantee of future access or recovery.
                </li>
              </ul>
            </section>

            {/* 6. Security */}
            <section>
              <h3 className="text-primary font-bold mb-2">6. Security</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed mb-2">
                We use reasonable technical and organizational measures to safeguard information
                processed through CRYPTOCARDS. However:
              </p>
              <ul className="text-muted-foreground text-[13px] space-y-1 list-disc pl-4">
                <li>No online system can be guaranteed 100% secure</li>
                <li>
                  Blockchain transactions are irreversible, and misdirected transfers generally
                  cannot be recovered
                </li>
                <li>
                  You are responsible for securing your wallets, private keys, and card claim
                  details (IDs, links, CVVs)
                </li>
              </ul>
            </section>

            {/* 7. Children's Privacy */}
            <section>
              <h3 className="text-primary font-bold mb-2">7. Children&apos;s Privacy</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed">
                The Service is intended for adults and is not directed to individuals under the age
                of 18. We do not knowingly collect personal information from children. If you
                believe a minor has provided us with data, please contact us so we can review and,
                where appropriate, remove it.
              </p>
            </section>

            {/* 8. Requests, Deletion, & Rights */}
            <section>
              <h3 className="text-primary font-bold mb-2">
                8. Requests, Deletion, &amp; Data Rights
              </h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed mb-2">
                Depending on your region, you may have rights regarding your personal information.
                You may request:
              </p>
              <ul className="text-muted-foreground text-[13px] space-y-1 list-disc pl-4">
                <li>Deletion of your account and associated off-chain data</li>
                <li>Closure of your CRYPTOCARDS user profile</li>
                <li>Access to, or a copy of, the data we store about you</li>
              </ul>
              <p className="text-muted-foreground text-[13px] leading-relaxed mt-2">
                To submit a request, contact us at:{' '}
                <span className="font-semibold">cryptocards@linuxmail.org</span>.
              </p>
            </section>

            {/* 9. Changes to this Policy */}
            <section>
              <h3 className="text-primary font-bold mb-2">9. Changes to this Policy</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed">
                We may update this Privacy Policy from time to time to reflect changes in our
                Service, applicable laws, or operational practices. When we make material updates,
                we will update the &quot;Last updated&quot; date above and may provide additional
                notice where appropriate.
              </p>
            </section>

            {/* 10. Contact */}
            <section>
              <h3 className="text-primary font-bold mb-2">10. Contact</h3>
              <p className="text-muted-foreground text-[13px]">
                If you have questions about this Privacy Policy or how we handle data, please
                contact us at:
              </p>
              <p className="text-muted-foreground text-[13px] mt-1">
                <strong>Email:</strong> cryptocards@linuxmail.org
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
