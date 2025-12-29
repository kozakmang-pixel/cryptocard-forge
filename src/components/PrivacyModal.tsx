import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lock } from 'lucide-react';

interface PrivacyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrivacyModal({ open, onOpenChange }: PrivacyModalProps) {
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

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
            <p className="text-muted-foreground text-[12px] text-center">Last updated: {currentDate}</p>

            <p className="text-muted-foreground leading-relaxed">
              CRYPTOCARDS ("we," "our," or "us") respects your privacy. This Privacy Policy explains what information we collect, 
              how we use it, and how we protect it.
            </p>

            <section>
              <h3 className="text-primary font-bold mb-2">1. Information We Collect</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed mb-2">We may collect:</p>
              <p className="text-muted-foreground text-[13px] font-semibold mt-2">Data you provide voluntarily:</p>
              <ul className="text-muted-foreground text-[13px] space-y-1 list-disc pl-4">
                <li>Username, password, optional email</li>
                <li>Card messages, wallet addresses, and related metadata</li>
                <li>IP address and browser info for security logs</li>
              </ul>
              <p className="text-muted-foreground text-[13px] font-semibold mt-2">Automatically collected analytics:</p>
              <ul className="text-muted-foreground text-[13px] space-y-1 list-disc pl-4">
                <li>Page views and usage metrics</li>
                <li>Device type, region, OS, browser fingerprinting</li>
              </ul>
            </section>

            <section>
              <h3 className="text-primary font-bold mb-2">2. How We Use Your Information</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed mb-2">We use collected data to:</p>
              <ul className="text-muted-foreground text-[13px] space-y-1 list-disc pl-4">
                <li>Provide and maintain the Service</li>
                <li>Secure accounts</li>
                <li>Deliver card creation, claiming, and notifications</li>
                <li>Improve platform functionality</li>
                <li>Detect abuse and prevent fraud</li>
              </ul>
              <p className="text-muted-foreground text-[13px] leading-relaxed mt-3 font-semibold">We do NOT:</p>
              <ul className="text-muted-foreground text-[13px] space-y-1 list-disc pl-4">
                <li>Sell your personal information</li>
                <li>Rent, trade, or transfer your identity to marketers</li>
              </ul>
            </section>

            <section>
              <h3 className="text-primary font-bold mb-2">3. Email & Notifications</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed mb-2">
                Email is optional. If provided, it may be used for:
              </p>
              <ul className="text-muted-foreground text-[13px] space-y-1 list-disc pl-4">
                <li>Password recovery</li>
                <li>Card claim notifications</li>
                <li>Support messages</li>
              </ul>
              <p className="text-muted-foreground text-[13px] leading-relaxed mt-2">
                You may opt out at any time.
              </p>
            </section>

            <section>
              <h3 className="text-primary font-bold mb-2">4. Cookies / Local Storage</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed">
                We may store authentication tokens in local storage or cookies on your device. 
                You are responsible for device security.
              </p>
            </section>

            <section>
              <h3 className="text-primary font-bold mb-2">5. Data Storage & Retention</h3>
              <ul className="text-muted-foreground text-[13px] space-y-1 list-disc pl-4">
                <li>User and card data may be retained as long as needed for functionality or legal reasons.</li>
                <li>If the Service shuts down, stored data may be deleted without recovery guarantees.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-primary font-bold mb-2">6. Security</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed mb-2">
                We take reasonable steps to protect data, but:
              </p>
              <ul className="text-muted-foreground text-[13px] space-y-1 list-disc pl-4">
                <li>No digital system is perfectly secure</li>
                <li>Blockchain assets and tokens are not recoverable if mishandled</li>
              </ul>
            </section>

            <section>
              <h3 className="text-primary font-bold mb-2">7. Children's Privacy</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed">
                This Service is not intended for individuals under age 18. We do not knowingly collect data from children.
              </p>
            </section>

            <section>
              <h3 className="text-primary font-bold mb-2">8. Requests, Deletion, & Rights</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed mb-2">Users may request:</p>
              <ul className="text-muted-foreground text-[13px] space-y-1 list-disc pl-4">
                <li>Data deletion</li>
                <li>Account closure</li>
                <li>Export of stored info</li>
              </ul>
              <p className="text-muted-foreground text-[13px] leading-relaxed mt-2">
                To make a request, contact: cryptocards@linuxmail.org
              </p>
            </section>

            <section>
              <h3 className="text-primary font-bold mb-2">9. Changes to this Policy</h3>
              <p className="text-muted-foreground text-[13px] leading-relaxed">
                We may update this Privacy Policy periodically. Updates will become effective upon posting to the website.
              </p>
            </section>

            <section>
              <h3 className="text-primary font-bold mb-2">10. Contact Us</h3>
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
