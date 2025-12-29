// src/components/UserDashboard.tsx
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/lib/languageStore';
import { toast } from 'sonner';
import {
  Loader2,
  RefreshCcw,
  Mail,
  LogOut,
  CreditCard,
  Trash2,
  Copy,
} from 'lucide-react';

interface UserInfo {
  id: string;
  username: string;
  email?: string;
}

interface UserDashboardProps {
  token: string | null;
  user: UserInfo | null;
  onLogout: () => void;
  onEmailUpdate: (email: string) => void;
  refreshKey: number;
}

interface DashboardCard {
  public_id: string;
  created_at: string;
  funded: boolean;
  locked: boolean;
  claimed: boolean;
  token_amount: number | null;
  amount_fiat: number | null;
  currency: string | null;
}

function formatDateTime(iso: string) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function UserDashboard({
  token,
  user,
  onLogout,
  onEmailUpdate,
  refreshKey,
}: UserDashboardProps) {
  const { t } = useLanguage();

  const [cards, setCards] = useState<DashboardCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [emailInput, setEmailInput] = useState(user?.email || '');
  const [savingEmail, setSavingEmail] = useState(false);

  // Fetch SOL price from backend
  const fetchSolPrice = async () => {
    try {
      const res = await fetch('/sol-price');
      if (!res.ok) throw new Error('Failed to fetch SOL price');
      const data = await res.json();
      const price = typeof data.price_usd === 'number' ? data.price_usd : data.sol_price_usd;
      if (typeof price === 'number') {
        setSolPrice(price);
      }
    } catch (err) {
      console.error('UserDashboard: failed to fetch SOL price', err);
    }
  };

  // Fetch cards created by this user
  const fetchCards = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/my-cards', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error('Failed to load cards');
      }
      const data = (await res.json()) as DashboardCard[];
      setCards(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('UserDashboard: failed to fetch cards', err);
      toast.error(err?.message || 'Failed to load your cards');
    } finally {
      setLoading(false);
    }
  };

  // Initial + refresh on refreshKey change
  useEffect(() => {
    fetchSolPrice();
    fetchCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, token]);

  // Keep email input in sync with user
  useEffect(() => {
    if (user?.email) {
      setEmailInput(user.email);
    }
  }, [user?.email]);

  const handleRefreshClick = () => {
    fetchSolPrice();
    fetchCards();
  };

  const handleEmailSave = async () => {
    const trimmed = emailInput.trim();
    if (!trimmed || !trimmed.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (!token) {
      toast.error('Not authenticated');
      return;
    }

    setSavingEmail(true);
    try {
      const res = await fetch('/auth/update-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newEmail: trimmed }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update email');
      }

      toast.success('Notification email updated');
      onEmailUpdate(trimmed);
    } catch (err: any) {
      console.error('UserDashboard: update email failed', err);
      toast.error(err?.message || 'Failed to update email');
    } finally {
      setSavingEmail(false);
    }
  };

  const enrichedCards = useMemo(() => {
    return cards.map((card) => {
      const sol = typeof card.token_amount === 'number' ? card.token_amount : 0;
      const currency = card.currency || 'USD';
      const fiatFromDb =
        typeof card.amount_fiat === 'number' && card.amount_fiat > 0
          ? card.amount_fiat
          : null;
      const fiat =
        fiatFromDb !== null
          ? fiatFromDb
          : solPrice && sol > 0
          ? sol * solPrice
          : 0;

      return {
        ...card,
        sol,
        fiat,
        currency,
      };
    });
  }, [cards, solPrice]);

  const visibleCards = enrichedCards.slice(0, enrichedCards.length);

  const totalCreated = enrichedCards.length;
  const totalFunded = enrichedCards.filter((c) => c.funded).length;
  const totalClaimed = enrichedCards.filter((c) => c.claimed).length;

  const handleDeleteCard = async (publicId: string) => {
    if (!token) {
      toast.error('Not authenticated');
      return;
    }

    const confirmed = window.confirm(
      'Delete this CRYPTOCARD from your dashboard?\n\nThis will permanently remove its record from your creator dashboard. This cannot be undone.'
    );
    if (!confirmed) return;

    try {
      const res = await fetch('/delete-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ public_id: publicId }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to delete card');
      }

      setCards((prev) => prev.filter((c) => c.public_id !== publicId));
      toast.success('CRYPTOCARD removed from your dashboard.');
    } catch (err: any) {
      console.error('UserDashboard: delete card failed', err);
      toast.error(err?.message || 'Failed to delete card');
    }
  };

  const handleCopyCardId = async (publicId: string) => {
    try {
      await navigator.clipboard.writeText(publicId);
      toast.success('Card ID copied to clipboard');
    } catch {
      toast.error('Failed to copy Card ID');
    }
  };

  return (
    <section className="glass-card rounded-xl p-3 mt-5 shadow-card hover:shadow-card-hover transition-all">
      {/* Header */}
      <div className="flex flex-col items-center text-center mb-3">
        <h2 className="text-xs font-black gradient-text tracking-[0.25em] uppercase">
          CREATOR DASHBOARD
        </h2>
        <p className="text-[9px] text-muted-foreground mt-1 max-w-md">
          Overview of all <span className="font-semibold text-primary">CRYPTOCARDS</span> you&apos;ve
          created on Solana mainnet.
        </p>
      </div>

      {/* Top row: user info + actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Signed in as
            </div>
            <div className="text-[11px] font-bold">
              {user?.username || 'Creator'}
              {user?.email && (
                <span className="text-[9px] text-muted-foreground ml-1">
                  · {user.email}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[9px] flex items-center gap-1"
            onClick={handleRefreshClick}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Refresh
              </>
            ) : (
              <>
                <RefreshCcw className="w-3 h-3" />
                Refresh
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="h-7 px-2 text-[9px] flex items-center gap-1"
            onClick={onLogout}
          >
            <LogOut className="w-3 h-3" />
            Logout
          </Button>
        </div>
      </div>

      {/* Email settings */}
      <div className="mb-3 rounded-lg border border-border/40 bg-card/60 p-2.5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Mail className="w-3 h-3 text-primary" />
            <span className="text-[9px] font-semibold uppercase tracking-wide">
              Notification email
            </span>
          </div>
          {solPrice !== null && (
            <span className="text-[8px] text-muted-foreground">
              Live SOL price:{' '}
              <span className="font-semibold">${solPrice.toFixed(2)} USD</span>
            </span>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            placeholder="your@email.com"
            className="h-7 text-[10px] bg-background/60 border-border/40"
          />
          <Button
            type="button"
            size="sm"
            className="h-7 px-3 text-[9px] font-semibold"
            onClick={handleEmailSave}
            disabled={savingEmail}
          >
            {savingEmail ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                Saving…
              </>
            ) : (
              'Save email'
            )}
          </Button>
        </div>
        <p className="text-[8px] text-muted-foreground mt-1">
          Used for claim notifications and security alerts. This does not change your login
          username.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg bg-primary/5 border border-primary/30 px-2 py-1.5 text-center">
          <div className="text-[8px] uppercase tracking-wide text-muted-foreground mb-0.5">
            Total created
          </div>
          <div className="text-[13px] font-black text-primary">{totalCreated}</div>
        </div>
        <div className="rounded-lg bg-accent/5 border border-accent/30 px-2 py-1.5 text-center">
          <div className="text-[8px] uppercase tracking-wide text-muted-foreground mb-0.5">
            Funded
          </div>
          <div className="text-[13px] font-black text-accent">{totalFunded}</div>
        </div>
        <div className="rounded-lg bg-secondary/5 border border-secondary/30 px-2 py-1.5 text-center">
          <div className="text-[8px] uppercase tracking-wide text-muted-foreground mb-0.5">
            Claimed
          </div>
          <div className="text-[13px] font-black text-secondary">{totalClaimed}</div>
        </div>
      </div>

      {/* Cards list */}
      <div className="rounded-xl border border-border/40 bg-background/40 p-2 max-h-72 overflow-y-auto">
        {loading && visibleCards.length === 0 && (
          <div className="flex items-center justify-center py-6 text-[9px] text-muted-foreground">
            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
            Loading your CRYPTOCARDS…
          </div>
        )}

        {!loading && visibleCards.length === 0 && (
          <div className="py-5 text-center text-[9px] text-muted-foreground">
            You haven&apos;t created any CRYPTOCARDS yet. Design one above to see it here.
          </div>
        )}

        {visibleCards.map((card) => {
          const tokenSymbol = 'TOKEN';
          const solDisplay = card.sol ?? 0;
          const fiatDisplay = card.fiat ?? 0;
          const currency = card.currency || 'USD';

          let statusLabel = 'Not funded';
          let statusClass = 'bg-muted text-muted-foreground';
          let statusDetail = 'Waiting for deposit to funding address.';

          if (card.funded && !card.locked && !card.claimed) {
            statusLabel = 'Funded';
            statusClass = 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40';
            statusDetail = 'Funded on-chain, ready to lock your CRYPTOCARD.';
          } else if (card.funded && card.locked && !card.claimed) {
            statusLabel = 'Locked';
            statusClass = 'bg-amber-500/15 text-amber-400 border border-amber-500/40';
            statusDetail = 'Locked on-chain, ready for the recipient to claim.';
          } else if (card.claimed) {
            statusLabel = 'Claimed';
            statusClass = 'bg-purple-500/15 text-purple-400 border border-purple-500/40';
            statusDetail = 'Funding and claim complete. This CRYPTOCARD has been redeemed.';
          }

          return (
            <div
              key={card.public_id}
              className="mb-2 last:mb-0 rounded-lg bg-card/70 border border-border/40 px-2 py-1.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[8px] uppercase tracking-wide text-muted-foreground">
                    Card ID
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="text-[11px] font-mono font-semibold">
                      {card.public_id}
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded bg-background/60 border border-border/40 hover:border-primary/60 px-1 h-4"
                      onClick={() => handleCopyCardId(card.public_id)}
                    >
                      <Copy className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="text-right">
                    <div className="text-[8px] uppercase tracking-wide text-muted-foreground">
                      Created
                    </div>
                    <div className="text-[9px]">
                      {formatDateTime(card.created_at)}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-[8px] text-destructive/80 hover:text-destructive transition-colors"
                    onClick={() => handleDeleteCard(card.public_id)}
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </div>

              <div className="mt-1 grid grid-cols-3 gap-2">
                <div>
                  <div className="text-[8px] uppercase tracking-wide text-muted-foreground">
                    Token
                  </div>
                  <div className="text-[10px] font-semibold">
                    {solDisplay.toFixed(6)} {tokenSymbol}
                  </div>
                </div>
                <div>
                  <div className="text-[8px] uppercase tracking-wide text-muted-foreground">
                    SOL
                  </div>
                  <div className="text-[10px] font-semibold">
                    {solDisplay.toFixed(6)} SOL
                  </div>
                </div>
                <div>
                  <div className="text-[8px] uppercase tracking-wide text-muted-foreground">
                    Fiat
                  </div>
                  <div className="text-[10px] font-semibold">
                    {currency} {fiatDisplay.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="mt-1 flex items-center justify-between gap-2">
                <span
                  className={
                    'inline-flex items-center px-2 py-0.5 rounded-full text-[8px] font-semibold ' +
                    statusClass
                  }
                >
                  {statusLabel.toUpperCase()}
                </span>
                <span className="text-[8px] text-muted-foreground text-right">
                  {statusDetail}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
