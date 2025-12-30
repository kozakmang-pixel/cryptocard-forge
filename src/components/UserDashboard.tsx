// src/components/UserDashboard.tsx
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/lib/languageStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  ArrowLeftRight,
  ArrowRight,
  Lock,
  LogOut,
  Mail,
  RefreshCcw,
  Search,
  Shield,
  User2,
  Loader2,
} from 'lucide-react';
import { apiService } from '@/services/api';

interface DashboardCard {
  public_id: string;
  created_at: string;
  funded: boolean;
  locked: boolean;
  claimed: boolean;
  token_amount: number | null;
  amount_fiat: number | null;
  currency: string | null;
  token_mint?: string | null;
  token_symbol?: string | null;
}

function formatDateTime(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function formatRelative(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hr ago`;
  if (diffDay === 1) return 'Yesterday';
  return `${diffDay} days ago`;
}

function formatAmount(value: number | null, decimals = 6) {
  if (value === null || Number.isNaN(value)) return '0'.padEnd(decimals + 2, '0');
  return value.toFixed(decimals);
}

function formatFiat(value: number | null, currency: string | null = 'USD') {
  if (value === null || Number.isNaN(value)) {
    return `0.00 ${currency || 'USD'}`;
  }
  return `${value.toFixed(2)} ${currency || 'USD'}`;
}

interface UserInfo {
  id: string;
  username?: string;
  email?: string;
}

interface UserDashboardProps {
  token: string | null;
  user: UserInfo | null;
  onLogout: () => void;
  onEmailUpdate: (email: string) => void;
  refreshKey: number;
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
  const [emailUpdating, setEmailUpdating] = useState(false);
  const [emailInput, setEmailInput] = useState(user?.email ?? '');
  const [filter, setFilter] = useState('');
  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [tokenSymbols, setTokenSymbols] = useState<Record<string, string>>({});

  const fetchSolPrice = async () => {
    try {
      const res = await fetch('/sol-price');
      if (!res.ok) return;
      const data: { price_usd?: number; sol_price_usd?: number } = await res.json();
      const price =
        typeof data.price_usd === 'number'
          ? data.price_usd
          : typeof data.sol_price_usd === 'number'
          ? data.sol_price_usd
          : null;
      if (price !== null) {
        setSolPrice(price);
      }
    } catch (err) {
      console.error('UserDashboard: failed to fetch SOL price', err);
    }
  };

  const fetchCards = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/user/cards', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('UserDashboard /user/cards error:', res.status, text);
        throw new Error('Failed to load your cards');
      }

      const data = await res.json();
      if (Array.isArray(data)) {
        setCards(data as DashboardCard[]);
      } else if (Array.isArray(data?.cards)) {
        setCards(data.cards as DashboardCard[]);
      } else {
        setCards([]);
      }
    } catch (err: any) {
      console.error('UserDashboard: error loading cards', err);
      toast.error(err?.message || 'Failed to load your cards');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSolPrice();
  }, []);

  useEffect(() => {
    fetchCards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, refreshKey]);

  useEffect(() => {
    setEmailInput(user?.email ?? '');
  }, [user?.email]);

  // Fetch token symbols for mints we haven't seen yet
  useEffect(() => {
    const mints = Array.from(
      new Set(
        cards
          .map((c: any) => (c.token_mint as string | null) || null)
          .filter((m): m is string => !!m && m.length >= 32)
      )
    );

    const missing = mints.filter((m) => !tokenSymbols[m]);
    if (!missing.length) return;

    missing.forEach(async (mint) => {
      try {
        const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
        if (!res.ok) {
          setTokenSymbols((prev) => (prev[mint] ? prev : { ...prev, [mint]: 'TOKEN' }));
          return;
        }
        const data = await res.json();
        let symbol: string | null = null;
        const pairs: any = (data && (data.pairs || data.pair || data.data)) as any;
        if (Array.isArray(pairs) && pairs.length > 0 && pairs[0].baseToken) {
          symbol = pairs[0].baseToken.symbol || pairs[0].baseToken.name || null;
        }
        setTokenSymbols((prev) => ({
          ...prev,
          [mint]: symbol || 'TOKEN',
        }));
      } catch {
        setTokenSymbols((prev) => (prev[mint] ? prev : { ...prev, [mint]: 'TOKEN' }));
      }
    });
  }, [cards, tokenSymbols]);

  const filteredCards = useMemo(() => {
    if (!filter.trim()) return cards;
    const needle = filter.trim().toLowerCase();
    return cards.filter((card) => {
      return (
        card.public_id.toLowerCase().includes(needle) ||
        formatDateTime(card.created_at).toLowerCase().includes(needle)
      );
    });
  }, [cards, filter]);

  const enrichedCards = useMemo(() => {
    return cards.map((card) => {
      const sol = typeof card.token_amount === 'number' ? card.token_amount : 0;
      const currency = card.currency || 'USD';
      const fiatValue =
        solPrice && sol > 0
          ? solPrice * sol
          : typeof card.amount_fiat === 'number'
          ? card.amount_fiat
          : null;

      const tokenSymbol =
        card.token_symbol ||
        (card.token_mint ? tokenSymbols[card.token_mint] || 'TOKEN' : 'TOKEN');

      return {
        ...card,
        sol,
        fiatValue,
        currency,
        tokenSymbol,
      };
    });
  }, [cards, solPrice, tokenSymbols]);

  const handleLogout = () => {
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
    } catch {
      // ignore
    }
    onLogout();
  };

  const handleDeleteCardLocally = (publicId: string) => {
    setCards((prev) => prev.filter((c) => c.public_id !== publicId));
  };

  const handleResendEmailConfirmation = async () => {
    if (!user?.email || !token) return;
    try {
      const result = await apiService.requestEmailUpdate(user.email, token);
      if (result.success) {
        toast.success('Confirmation link sent to your current email.');
      } else {
        toast.error(result.error || 'Failed to send confirmation email.');
      }
    } catch (err: any) {
      console.error('UserDashboard: resend-confirmation error', err);
      toast.error(err?.message || 'Failed to send confirmation email.');
    }
  };

  const handleUpdateEmail = async () => {
    if (!token) return;
    const newEmail = emailInput.trim();
    if (!newEmail || !newEmail.includes('@')) {
      toast.error('Please enter a valid email.');
      return;
    }

    setEmailUpdating(true);
    try {
      const res = await fetch('/auth/update-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ new_email: newEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        const message = data?.error || data?.message || 'Failed to update email';
        throw new Error(message);
      }

      toast.success('Confirmation link sent. Please check your new email inbox.');

      if (data?.pending_email) {
        onEmailUpdate(data.pending_email);
      }
    } catch (err: any) {
      console.error('UserDashboard: update-email error', err);
      toast.error(err?.message || 'Failed to update email');
    } finally {
      setEmailUpdating(false);
    }
  };

  const activeCount = cards.filter((c) => !c.claimed && !c.refunded).length;
  const fundedCount = cards.filter((c) => c.funded).length;
  const lockedCount = cards.filter((c) => c.locked).length;
  const claimedCount = cards.filter((c) => c.claimed).length;

  return (
    <section className="mt-6 glass-card rounded-xl p-3 shadow-card border border-primary/20 bg-background/90">
      {/* Header / identity row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md">
            <User2 className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">
              {t('dashboard.yourWallet') || 'Your CRYPTOCARDS Profile'}
            </span>
            <span className="text-[11px] font-semibold text-foreground truncate max-w-[160px]">
              {user?.username || user?.email || user?.id || 'Anonymous user'}
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-[9px] border-destructive/40 text-destructive hover:bg-destructive/10"
          onClick={handleLogout}
        >
          <LogOut className="w-3 h-3 mr-1" />
          {t('dashboard.logout') || 'Logout'}
        </Button>
      </div>

      {/* Email + settings bar */}
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-3 mb-3">
        {/* Email update */}
        <div className="bg-background/70 border border-border/60 rounded-lg p-2 flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Mail className="w-3 h-3 text-primary" />
              <span className="text-[9px] font-bold uppercase text-muted-foreground">
                {t('dashboard.notificationEmail') || 'Notification email'}
              </span>
            </div>
            <Button
              variant="outline"
              size="xs"
              className="h-6 px-2 text-[9px] border-primary/40 text-primary hover:bg-primary/10"
              onClick={handleResendEmailConfirmation}
              disabled={!user?.email || !token}
            >
              <RefreshCcw className="w-3 h-3 mr-1" />
              {t('dashboard.resend') || 'Resend confirm'}
            </Button>
          </div>

          <div className="flex items-center gap-2 mt-1">
            <Input
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="you@example.com"
              className="h-7 text-[10px]"
            />
            <Button
              size="xs"
              className="h-7 px-3 text-[9px] font-semibold"
              onClick={handleUpdateEmail}
              disabled={emailUpdating || !token}
            >
              {emailUpdating ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  {t('dashboard.saving') || 'Saving...'}
                </>
              ) : (
                <>
                  <Shield className="w-3 h-3 mr-1" />
                  {t('dashboard.updateEmail') || 'Update'}
                </>
              )}
            </Button>
          </div>

          <p className="text-[8px] text-muted-foreground mt-1">
            {t('dashboard.emailHint') ||
              'We only use this to send claim links and important security updates.'}
          </p>
        </div>

        {/* Summary stats */}
        <div className="bg-background/70 border border-primary/30 rounded-lg p-2 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[9px] font-bold uppercase text-muted-foreground">
              {t('dashboard.portfolioSummary') || 'Portfolio summary'}
            </span>
            <div className="inline-flex items-center gap-1 text-[9px] text-primary">
              <ArrowRight className="w-3 h-3" />
              {t('dashboard.liveView') || 'Live view'}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="flex flex-col">
              <span className="text-[9px] font-semibold text-foreground">
                {activeCount}
              </span>
              <span className="text-[8px] text-muted-foreground">
                {t('dashboard.active') || 'Active'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-semibold text-foreground">
                {fundedCount}
              </span>
              <span className="text-[8px] text-muted-foreground">
                {t('dashboard.funded') || 'Funded'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-semibold text-foreground">
                {lockedCount}
              </span>
              <span className="text-[8px] text-muted-foreground">
                {t('dashboard.locked') || 'Locked'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-semibold text-foreground">
                {claimedCount}
              </span>
              <span className="text-[8px] text-muted-foreground">
                {t('dashboard.claimed') || 'Claimed'}
              </span>
            </div>
          </div>

          <p className="text-[8px] text-muted-foreground mt-1">
            {t('dashboard.summaryHint') ||
              'Totals are approximate and based on the last updated on-chain snapshots.'}
          </p>
        </div>
      </div>

      {/* Filter/search bar */}
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="w-3 h-3 text-muted-foreground absolute left-2 top-1/2 -translate-y-1/2" />
          <Input
            placeholder={t('dashboard.searchPlaceholder') || 'Search by card ID or date...'}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-7 pl-7 text-[10px]"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2 text-[9px]"
          onClick={fetchCards}
          disabled={loading}
        >
          <RefreshCcw className="w-3 h-3 mr-1" />
          {t('dashboard.refresh') || 'Refresh'}
        </Button>
      </div>

      {/* Card list */}
      <div className="border border-border/50 rounded-lg overflow-hidden bg-background/80">
        <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)] gap-2 px-2 py-1 bg-muted/60 border-b border-border/50 text-[9px] font-semibold text-muted-foreground uppercase">
          <div>{t('dashboard.tableCard') || 'Card'}</div>
          <div>{t('dashboard.tableStatus') || 'Status'}</div>
          <div>{t('dashboard.tableValue') || 'Value'}</div>
          <div className="text-right">{t('dashboard.tableActions') || 'Actions'}</div>
        </div>

        <div className="max-h-[260px] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-[10px] text-muted-foreground">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t('dashboard.loading') || 'Loading your cards...'}
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-[10px] text-muted-foreground gap-1">
              <Shield className="w-5 h-5 text-primary mb-1" />
              <span>{t('dashboard.noCardsTitle') || 'No cards found in your dashboard yet.'}</span>
              <span className="text-[9px]">
                {t('dashboard.noCardsBody') ||
                  'Create a CRYPTOCARD and it will automatically appear here once linked to your wallet.'}
              </span>
            </div>
          ) : (
            enrichedCards.map((card) => {
              const rel = formatRelative(card.created_at);
              const created = formatDateTime(card.created_at);
              const solDisplay = formatAmount(card.sol, 6);
              const fiatDisplay = formatFiat(card.fiatValue, card.currency);
              const statusBadges: string[] = [];
              if (card.claimed) statusBadges.push(t('dashboard.badgeClaimed') || 'Claimed');
              else if (card.locked) statusBadges.push(t('dashboard.badgeLocked') || 'Locked');
              else if (card.funded) statusBadges.push(t('dashboard.badgeFunded') || 'Funded');
              else statusBadges.push(t('dashboard.badgeDraft') || 'Draft');

              const tokenSymbol = card.tokenSymbol || card.token_symbol || 'TOKEN';

              return (
                <div
                  key={card.public_id}
                  className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)_minmax(0,2fr)_minmax(0,1fr)] gap-2 px-2 py-2 border-b border-border/40 text-[10px] items-center hover:bg-muted/30"
                >
                  {/* Card ID + date */}
                  <div className="flex flex-col gap-0.5">
                    <div className="font-semibold text-foreground flex items-center gap-1">
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary/10 text-[9px] text-primary font-bold">
                        #
                      </span>
                      <span className="truncate max-w-[150px]">{card.public_id}</span>
                    </div>
                    <div className="text-[8px] text-muted-foreground flex items-center gap-1">
                      <span>{created}</span>
                      {rel && <span className="text-primary/80">• {rel}</span>}
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex flex-wrap gap-1">
                    {statusBadges.map((badge) => (
                      <span
                        key={badge}
                        className={cn(
                          'px-1.5 py-0.5 rounded-full text-[8px] font-semibold border',
                          badge === (t('dashboard.badgeClaimed') || 'Claimed')
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40'
                            : badge === (t('dashboard.badgeLocked') || 'Locked')
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/40'
                            : badge === (t('dashboard.badgeFunded') || 'Funded')
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/40'
                            : 'bg-muted/60 text-muted-foreground border-border/50'
                        )}
                      >
                        {badge}
                      </span>
                    ))}
                  </div>

                  {/* Value */}
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-1 text-[9px] text-foreground">
                      <span className="font-semibold">
                        {solDisplay} {tokenSymbol}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">
                        {formatAmount(card.sol, 6)} SOL
                      </span>
                    </div>
                    <div className="text-[8px] text-muted-foreground">
                      {fiatDisplay || '—'}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="outline"
                      size="xs"
                      className="h-6 px-2 text-[8px]"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(card.public_id);
                          toast.success('Card ID copied');
                        } catch {
                          toast.error('Failed to copy card ID');
                        }
                      }}
                    >
                      <ArrowRight className="w-3 h-3 mr-1" />
                      {t('dashboard.copyId') || 'Copy ID'}
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      className="h-6 px-2 text-[8px] border-destructive/40 text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteCardLocally(card.public_id)}
                    >
                      {t('dashboard.hide') || 'Hide'}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer helper */}
      <div className="mt-3 text-[8px] text-muted-foreground flex items-center justify-between gap-2">
        <span>
          {t('dashboard.footerNote') ||
            'Deleting a card here only removes it from your dashboard view. On-chain funds and claimability are not affected.'}
        </span>
        <span className="inline-flex items-center gap-1 text-[8px] font-semibold text-primary/80">
          <ArrowLeftRight className="w-3 h-3" />
          CRYPTOCARDS
        </span>
      </div>
    </section>
  );
}
