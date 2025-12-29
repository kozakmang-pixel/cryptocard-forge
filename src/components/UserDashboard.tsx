import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiService } from '@/services/api';
import { ExternalLink, LogOut, RefreshCw, Trash2 } from 'lucide-react';
import { useLanguage } from '@/lib/languageStore';

interface UserDashboardProps {
  token: string | null;
  user: { id: string; username: string; email?: string | null };
  onLogout: () => void;
  onEmailUpdate: (email: string) => void;
  refreshKey: number;
}

interface DbCard {
  id: string;
  public_id: string;
  created_at: string;
  funded: boolean;
  locked: boolean;
  claimed: boolean;
  token_amount: number | null;
  currency: string | null;
  amount_fiat: number | null;
}

export function UserDashboard({
  token,
  user,
  onLogout,
  onEmailUpdate,
  refreshKey,
}: UserDashboardProps) {
  const { t } = useLanguage();
  const [cards, setCards] = useState<DbCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [emailEditing, setEmailEditing] = useState(false);
  const [emailInput, setEmailInput] = useState(user.email || '');

  const loadCards = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiService.getMyCards(token);
      setCards(data as DbCard[]);
    } catch (err) {
      console.error('UserDashboard error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, refreshKey]);

  const recent = useMemo(() => cards.slice(0, 10), [cards]);

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch {
      return iso;
    }
  };

  const formatUsd = (v: number | null | undefined) =>
    v && v > 0 ? `$${v.toFixed(2)} USD` : '$0.00 USD';

  const formatSol = (v: number | null | undefined) =>
    v && v > 0 ? `${v.toFixed(6)} SOL` : '0.000000 SOL';

  const displayStatus = (c: DbCard) => {
    if (c.claimed) return 'Claimed • completed';
    if (c.locked && c.funded) return 'Locked • ready to claim';
    if (c.funded) return 'Funded • awaiting lock';
    return 'Not funded yet';
  };

  const handleDelete = async (cardId: string) => {
    const sure = window.confirm(
      'Deleting this CRYPTOCARD will permanently remove it from your creator dashboard. On-chain history remains immutable. Continue?'
    );
    if (!sure) return;

    try {
      await apiService.deleteCard(cardId);
      setCards((prev) => prev.filter((c) => c.public_id !== cardId));
    } catch (err) {
      console.error('Failed to delete card', err);
    }
  };

  const handleEmailSave = async () => {
    if (!token) return;
    const trimmed = emailInput.trim();
    if (!trimmed || !trimmed.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }

    try {
      const res = await fetch('/auth/update-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newEmail: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update email');
      }

      onEmailUpdate(trimmed);
      setEmailEditing(false);
    } catch (err) {
      console.error('Email update error', err);
      alert(
        err instanceof Error ? err.message : 'Failed to update email. Please try again.'
      );
    }
  };

  return (
    <section className="mt-8 glass-card rounded-2xl border border-border/40 bg-card/60 shadow-card">
      <div className="px-4 pt-4 pb-3 border-b border-border/30 flex items-center justify-between gap-2">
        <div className="flex-1 text-center">
          <h2 className="text-base md:text-lg font-black gradient-text uppercase tracking-wide">
            Creator Dashboard
          </h2>
          <p className="text-[10px] text-muted-foreground mt-1">
            Overview of all CRYPTOCARDS you&apos;ve created on Solana mainnet.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={loadCards}
            disabled={loading}
            className="h-8 w-8 border-border/40"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={onLogout}
            className="h-8 w-8 border-border/40"
          >
            <LogOut className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* User + email row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[10px]">
          <div>
            <div className="font-semibold">{user.username}</div>
            {!emailEditing ? (
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-muted-foreground">
                  {user.email || 'No email set'}
                </span>
                <Button
                  variant="outline"
                  size="xs"
                  className="h-6 px-2 text-[9px]"
                  onClick={() => {
                    setEmailInput(user.email || '');
                    setEmailEditing(true);
                  }}
                >
                  Change email
                </Button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 mt-0.5">
                <Input
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="your@email.com"
                  className="h-7 text-[9px] bg-card/60 border-border/40"
                />
                <div className="flex gap-1">
                  <Button
                    size="xs"
                    className="h-7 px-2 text-[9px]"
                    onClick={handleEmailSave}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    className="h-7 px-2 text-[9px]"
                    onClick={() => setEmailEditing(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div className="text-muted-foreground">
            Total cards:{' '}
            <span className="font-semibold">{cards.length}</span>
          </div>
        </div>

        {/* Scrollable list */}
        <div className="mt-2 max-h-80 overflow-y-auto space-y-2 pr-1">
          {recent.length === 0 && (
            <div className="text-[10px] text-muted-foreground text-center py-4">
              No CRYPTOCARDS created yet. Design and fund a card to see it here.
            </div>
          )}

          {recent.map((c) => {
            const token = c.token_amount || 0;
            const fiat = c.amount_fiat || 0;

            return (
              <div
                key={c.id}
                className="flex items-start justify-between gap-2 bg-background/40 border border-border/40 rounded-lg px-2 py-2 text-[9px]"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold truncate">
                      {c.public_id || '—'}
                    </span>
                    <span className="text-[8px] text-muted-foreground">
                      {formatDateTime(c.created_at)}
                    </span>
                  </div>
                  <div className="mt-0.5 text-muted-foreground">{displayStatus(c)}</div>
                  <div className="mt-1 text-[8px] text-muted-foreground">
                    Value:{' '}
                    {token > 0 ? (
                      <>
                        <span className="font-semibold">
                          {token.toFixed(6)} {c.currency || 'SOL'}
                        </span>{' '}
                        • <span>{formatUsd(fiat)}</span>
                      </>
                    ) : (
                      'Not funded yet'
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <a
                    href={`https://solscan.io/account/${encodeURIComponent(
                      c.public_id
                    )}?cluster=mainnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[8px] text-primary hover:text-primary/80"
                  >
                    Solscan
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-6 w-6 border-destructive/40 text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(c.public_id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-[9px] text-muted-foreground text-center mt-2">
          On-chain history remains immutable even if you delete a CRYPTOCARD from this dashboard.
        </div>
      </div>
    </section>
  );
}
