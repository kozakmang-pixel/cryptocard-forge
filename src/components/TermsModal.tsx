import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield } from 'lucide-react';

interface TermsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TermsModal({ open, onOpenChange }: TermsModalProps) {
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-primary text-center flex items-center justify-center gap-2">
            <Shield className="w-5 h-5" />
            Terms of Service
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[65vh] pr-4">
          <div className="space-y-5 text-sm">
            <p className="text-muted-foreground text-[12px] text-center">Last updated: {currentDate}</p>

            <p className="text-muted-foreground leading-relaxed">
              Please read these Terms of Service ("Terms") carefully before using the CRYPTOCARDS platform ("Service"). 
              By accessing, creating an account on, or using any portion of the Service, you agree to be bound by these Terms.
            </p>

            <section>
              <h3 className="text-primary font-bold mb-2">1. Eligibility</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed">
                You must be at least 18 years old and legally able to enter into agreements in your jurisdiction. 
                By using the Service, you represent that you meet these requirements.
              </p>
            </section>

            <section>
              <h3 className="text-primary font-bold mb-2">2. Use of the Service</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed mb-2">You agree that:</p>
              <ul className="text-muted-foreground text-[13px] space-y-1 list-disc pl-4">
                <li>You will only use CRYPTOCARDS for lawful purposes.</li>
                <li>You are solely responsible for managing and securing card links, CVV/passphrases, and wallet addresses.</li>
                <li>CRYPTOCARDS is not responsible for funds lost due to user negligence, compromised accounts, incorrectly provided wallet addresses, or phishing attempts.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-primary font-bold mb-2">3. Blockchain Transactions</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed mb-2">
                CRYPTOCARDS uses cryptocurrency networks to process value transfers. All blockchain transactions are irreversible. 
                Once submitted, transactions cannot be reversed, cancelled, or recovered.
              </p>
              <p className="text-muted-foreground text-[13px] leading-relaxed mb-2">You acknowledge that:</p>
              <ul className="text-muted-foreground text-[13px] space-y-1 list-disc pl-4">
                <li>Funds may become permanently inaccessible if instructions are followed incorrectly.</li>
                <li>Network fees, confirmation times, and availability are determined by external blockchain networks.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-primary font-bold mb-2">4. Accounts & Data</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed mb-2">
                Creating an account is optional. If you do create an account:
              </p>
              <ul className="text-muted-foreground text-[13px] space-y-1 list-disc pl-4">
                <li>You agree not to impersonate others.</li>
                <li>You are responsible for safeguarding your login credentials.</li>
                <li>We may suspend accounts we believe violate these Terms.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-primary font-bold mb-2">5. No Financial, Investment, or Custodial Services</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed mb-2">CRYPTOCARDS is NOT:</p>
              <ul className="text-muted-foreground text-[13px] space-y-1 list-disc pl-4">
                <li>A bank or financial institution</li>
                <li>A wallet custodian</li>
                <li>An investment advisor</li>
                <li>A money-transmitter or exchange (unless explicitly licensed in the future)</li>
              </ul>
              <p className="text-muted-foreground text-[13px] leading-relaxed mt-2">
                You bear full responsibility for understanding cryptocurrency risks before using the Service.
              </p>
            </section>

            <section>
              <h3 className="text-primary font-bold mb-2">6. Limitation of Liability</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed mb-2">
                To the fullest extent allowed by law, CRYPTOCARDS, its creators, developers, and operators shall not be liable for:
              </p>
              <ul className="text-muted-foreground text-[13px] space-y-1 list-disc pl-4">
                <li>Loss of funds</li>
                <li>Loss of access due to forgotten credentials</li>
                <li>Downtime or service outages</li>
                <li>Failure of third-party networks (blockchains)</li>
                <li>Unauthorized access caused by user behavior</li>
              </ul>
              <p className="text-muted-foreground text-[13px] leading-relaxed mt-2">
                Maximum liability under any circumstance shall not exceed $0.
              </p>
            </section>

            <section>
              <h3 className="text-primary font-bold mb-2">7. Termination</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed">
                We reserve the right to suspend or terminate your access to the Service at our sole discretion, with or without reason or notice.
              </p>
            </section>

            <section>
              <h3 className="text-primary font-bold mb-2">8. Changes to Terms</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed">
                We may revise these Terms at any time. Updated Terms become effective immediately when posted. 
                Continued use of the Service constitutes acceptance.
              </p>
            </section>

            <section>
              <h3 className="text-primary font-bold mb-2">9. Contact</h3>
              <p className="text-muted-foreground text-[13px]">
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
