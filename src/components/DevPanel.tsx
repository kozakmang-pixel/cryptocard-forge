import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bug, X } from 'lucide-react';

interface DevPanelProps {
  onSimulateFunded: () => void;
  onSimulateLocked: () => void;
  onSimulateCardCreated: (id: string, amount: string, symbol: string) => void;
  onResetAll: () => void;
  // Optional – if you ever want to wire "lock & share" directly:
  onSimulateShare?: () => void;
}

/**
 * Dev-only control panel for quickly testing the main card flows:
 * - Create card
 * - Fund card
 * - Lock card (lock & share flow is triggered by the main button)
 *
 * This panel:
 * - NOW shows in BOTH dev and production
 * - Sits in the bottom-right corner
 * - Does NOT change your main layout
 */
export function DevPanel({
  onSimulateFunded,
  onSimulateLocked,
  onSimulateCardCreated,
  onResetAll,
  onSimulateShare,
}: DevPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [cardId, setCardId] = useState('DEV-CARD-1');
  const [amount, setAmount] = useState('100');
  const [symbol, setSymbol] = useState('USDC');
  const [log, setLog] = useState<string[]>([]);

  // NOTE: we REMOVED the "if (import.meta.env.PROD) return null;"
  // so this now shows on the live site too.

  const pushLog = (entry: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLog((prev) => [`[${timestamp}] ${entry}`, ...prev].slice(0, 12));
  };

  const handleCreate = () => {
    onSimulateCardCreated(cardId || 'DEV-CARD-1', amount || '0', symbol || 'TOKEN');
    pushLog(
      `Simulated CREATE card (id=${cardId || 'DEV-CARD-1'}, amount=${
        amount || '0'
      }, symbol=${symbol || 'TOKEN'})`
    );
  };

  const handleFund = () => {
    onSimulateFunded();
    pushLog('Simulated FUND card');
  };

  const handleLock = () => {
    onSimulateLocked();
    pushLog('Simulated LOCK card');
  };

  const handleShare = () => {
    if (onSimulateShare) {
      onSimulateShare();
      pushLog('Simulated SHARE flow');
    } else {
      pushLog('Share handler not wired (onSimulateShare not provided)');
    }
  };

  const handleReset = () => {
    onResetAll();
    pushLog('Reset ALL state');
  };

  return (
    <div className="fixed bottom-3 right-3 z-50 pointer-events-none">
      {/* Floating toggle button */}
      <div className="pointer-events-auto flex justify-end mb-1">
        <Button
          size="icon"
          variant="outline"
          className="h-8 w-8 rounded-full shadow-lg bg-background/90 border-primary/40"
          onClick={() => setIsOpen((o) => !o)}
        >
          {isOpen ? <X className="h-4 w-4" /> : <Bug className="h-4 w-4" />}
        </Button>
      </div>

      {isOpen && (
        <div className="pointer-events-auto w-64 sm:w-72 rounded-xl border border-primary/40 bg-background/95 shadow-2xl p-3 text-[10px] space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-bold text-[11px] tracking-wide text-primary">
              DEV TOOLS
            </div>
            <span className="text-[9px] uppercase text-muted-foreground">
              local only
            </span>
          </div>

          {/* Create card controls */}
          <div className="space-y-1.5 border border-border/40 rounded-lg p-2">
            <div className="font-semibold text-[10px] uppercase text-muted-foreground">
              Create Card
            </div>
            <div className="space-y-1">
              <input
                className="w-full h-6 rounded bg-background/70 border border-border/60 px-1 text-[10px] outline-none"
                value={cardId}
                onChange={(e) => setCardId(e.target.value)}
                placeholder="Card ID"
              />
              <div className="flex gap-1">
                <input
                  className="flex-1 h-6 rounded bg-background/70 border border-border/60 px-1 text-[10px] outline-none"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount"
                />
                <input
                  className="w-16 h-6 rounded bg-background/70 border border-border/60 px-1 text-[10px] outline-none"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="SYM"
                />
              </div>
            </div>
            <Button
              size="sm"
              className="w-full h-7 text-[9px] font-bold"
              onClick={handleCreate}
            >
              SIMULATE CREATE
            </Button>
          </div>

          {/* Flow buttons */}
          <div className="grid grid-cols-2 gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[9px] font-semibold"
              onClick={handleFund}
            >
              FUND
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[9px] font-semibold"
              onClick={handleLock}
            >
              LOCK
            </Button>
            <Button
              size="sm"
              variant={onSimulateShare ? 'outline' : 'ghost'}
              className="col-span-2 h-7 text-[9px] font-semibold"
              onClick={handleShare}
            >
              LOCK &amp; SHARE
            </Button>
          </div>

          {/* Reset */}
          <Button
            size="sm"
            variant="destructive"
            className="w-full h-7 text-[9px] font-bold"
            onClick={handleReset}
          >
            RESET ALL
          </Button>

          {/* Mini log */}
          <div className="border border-border/50 rounded-md p-2 max-h-28 overflow-auto bg-background/70">
            <div className="text-[9px] uppercase font-semibold text-muted-foreground mb-1">
              Log
            </div>
            {log.length === 0 ? (
              <div className="text-[9px] text-muted-foreground">
                No actions yet. Use the buttons above.
              </div>
            ) : (
              <ul className="space-y-0.5">
                {log.map((entry, idx) => (
                  <li key={idx} className="text-[9px] leading-snug">
                    {entry}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
