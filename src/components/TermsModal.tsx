// src/components/TermsModal.tsx

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Scale, ShieldAlert } from 'lucide-react';

interface TermsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TermsModal({ open, onOpenChange }: TermsModalProps) {
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
            <Scale className="w-5 h-5" />
            Terms of Service
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[65vh] pr-4">
          <div className="space-y-5 text-sm">
            <p className="text-muted-foreground text-[12px] text-center">
              Last updated: {currentDate}
            </p>

            {/* 1. Agreement to Terms */}
            <section>
              <h3 className="text-primary font-bold mb-2">1. Agreement to Terms</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed">
                These Terms of Service (&quot;Terms&quot;) govern your access to and use of the
                CRYPTOCARDS application, website, and related services (collectively, the
                &quot;Service&quot;). By accessing or using the Service, you agree to be bound by
                these Terms. If you do not agree, you must not use the Service.
              </p>
            </section>

            {/* 2. Nature of the Service */}
            <section>
              <h3 className="text-primary font-bold mb-2">2. Nature of the Service</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed mb-2">
                CRYPTOCARDS provides a non-custodial interface for creating, funding, and claiming
                blockchain-based gift cards (&quot;CRYPTOCARDS&quot;) on Solana. The Service
                interacts with public blockchain networks and on-chain programs we do not fully
                control.
              </p>
              <ul className="text-muted-foreground text-[13px] space-y-1 list-disc pl-4">
                <li>The Service does not hold or take custody of your digital assets.</li>
                <li>
                  All card funding and claiming is ultimately executed via Solana network
                  transactions.
                </li>
                <li>
                  On-chain activity is public, immutable, and may be viewable by anyone with a
                  blockchain explorer.
                </li>
              </ul>
            </section>

            {/* 3. Eligibility */}
            <section>
              <h3 className="text-primary font-bold mb-2">3. Eligibility</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed">
                You may use the Service only if you are at least 18 years of age and legally
                capable of entering into binding contracts in your jurisdiction. By using the
                Service, you represent and warrant that you meet these requirements and are not
                prohibited from using the Service under applicable law.
              </p>
            </section>

            {/* 4. User Responsibilities */}
            <section>
              <h3 className="text-primary font-bold mb-2">4. User Responsibilities</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed mb-2">
                You are solely responsible for:
              </p>
              <ul className="text-muted-foreground text-[13px] space-y-1 list-disc pl-4">
                <li>
                  Securing your wallets, private keys, recovery phrases, and any other credentials.
                </li>
                <li>Safeguarding card IDs, links, and CVV codes associated with CRYPTOCARDS.</li>
                <li>
                  Verifying all destination wallet addresses and transaction details before
                  approving transfers.
                </li>
                <li>
                  Complying with all applicable laws and regulations in your region, including tax
                  and reporting obligations related to digital assets.
                </li>
              </ul>
            </section>

            {/* 5. Prohibited Uses */}
            <section>
              <h3 className="text-primary font-bold mb-2">5. Prohibited Uses</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed mb-2">
                You agree not to use the Service for any unlawful, abusive, or harmful purpose,
                including but not limited to:
              </p>
              <ul className="text-muted-foreground text-[13px] space-y-1 list-disc pl-4">
                <li>Money laundering, terrorist financing, or sanctions evasion.</li>
                <li>Fraud, scams, phishing, or other deceptive conduct.</li>
                <li>
                  Activities that interfere with or disrupt the Service, infrastructure, or other
                  users.
                </li>
                <li>
                  Circumventing technical or security measures, rate limits, or access controls.
                </li>
              </ul>
            </section>

            {/* 6. No Custody, No Guarantees */}
            <section>
              <h3 className="text-primary font-bold mb-2">6. No Custody, No Guarantees</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed mb-2">
                CRYPTOCARDS does not act as a custodian or trustee of your assets. At all times,
                you retain full control over your wallets and on-chain actions.
              </p>
              <ul className="text-muted-foreground text-[13px] space-y-1 list-disc pl-4">
                <li>We cannot reverse or &quot;undo&quot; blockchain transactions.</li>
                <li>
                  We do not guarantee that a recipient will properly claim or manage received
                  assets.
                </li>
                <li>
                  We are not responsible for lost funds due to user error, compromised wallets,
                  incorrect addresses, or third-party failures.
                </li>
              </ul>
            </section>

            {/* 7. Market & Technology Risks */}
            <section>
              <h3 className="text-primary font-bold mb-2">7. Market &amp; Technology Risks</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed mb-2">
                By using the Service, you acknowledge that digital assets and blockchain networks
                involve significant risk, including:
              </p>
              <ul className="text-muted-foreground text-[13px] space-y-1 list-disc pl-4">
                <li>High price volatility and potential total loss of value.</li>
                <li>
                  Network congestion, outages, or protocol changes affecting confirmations or gas
                  fees.
                </li>
                <li>
                  Smart-contract and infrastructure vulnerabilities, exploits, or unexpected
                  behavior.
                </li>
              </ul>
              <p className="text-muted-foreground text-[13px] leading-relaxed mt-2">
                You should only use the Service if you fully understand these risks and are prepared
                to accept them.
              </p>
            </section>

            {/* 8. No Investment or Legal Advice */}
            <section>
              <h3 className="text-primary font-bold mb-2">8. No Investment or Legal Advice</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed">
                Nothing in the Service, documentation, or communications from CRYPTOCARDS should be
                interpreted as investment, financial, legal, or tax advice. You are solely
                responsible for evaluating your own situation and, where appropriate, consulting
                professional advisors.
              </p>
            </section>

            {/* 9. Fees & Protocol Tax */}
            <section>
              <h3 className="text-primary font-bold mb-2">9. Fees &amp; Protocol Tax</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed mb-2">
                Certain actions may incur fees, including blockchain network fees and any
                application-level or protocol-level charges. A 1.5% protocol tax is currently
                applied to the SOL value of each funded and locked CRYPTOCARD and used to power
                $CRYPTOCARDS buybacks and burns.
              </p>
              <p className="text-muted-foreground text-[13px] leading-relaxed">
                Fees and tax parameters may change over time. Any changes will be reflected in the
                interface or documentation where reasonably possible.
              </p>
            </section>

            {/* 10. Limitation of Liability */}
            <section>
              <h3 className="text-primary font-bold mb-2">10. Limitation of Liability</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed mb-2">
                To the maximum extent permitted by applicable law, CRYPTOCARDS and its contributors
                shall not be liable for any indirect, incidental, special, consequential, or
                punitive damages, or for any loss of profits, data, or goodwill arising out of or in
                connection with your use of the Service.
              </p>
              <p className="text-muted-foreground text-[13px] leading-relaxed">
                Our aggregate liability for any claims relating to the Service will be limited to
                the amount you have paid directly to us for use of the Service, if any, in the
                twelve (12) months preceding the event giving rise to the claim.
              </p>
            </section>

            {/* 11. Changes to the Service and Terms */}
            <section>
              <h3 className="text-primary font-bold mb-2">
                11. Changes to the Service and these Terms
              </h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed mb-2">
                We may update, modify, or discontinue parts of the Service at any time, with or
                without prior notice. We may also update these Terms periodically. When changes are
                made, we will revise the &quot;Last updated&quot; date above and may provide
                additional notice where appropriate.
              </p>
              <p className="text-muted-foreground text-[13px] leading-relaxed">
                Your continued use of the Service after changes become effective constitutes your
                acceptance of the updated Terms.
              </p>
            </section>

            {/* 12. Contact */}
            <section>
              <h3 className="text-primary font-bold mb-2 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                12. Contact
              </h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed">
                If you have questions about these Terms or need to contact us regarding the
                Service, you can reach us at:{' '}
                <span className="font-semibold">cryptocards@linuxmail.org</span>.
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
