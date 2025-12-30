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
  if (!iso) return '—';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleString();
}

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
      const price = typeof data.price_usd === 'number' ? data.price_usd : data.sol_price_usd;
      if (typeof price === 'number') {
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
      const res = await fetch('/my-cards', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('UserDashboard /my-cards error:', res.status, text);
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

  // Resolve human-readable token symbols for any token mints on the user's cards
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

  const handleRefreshClick = () => {
    fetchCards();
    fetchSolPrice();
  };

  useEffect(() => {
    if (!token) return;
    fetchCards();
    fetchSolPrice();
  }, [token, refreshKey]);

  useEffect(() => {
    setEmailInput(user?.email ?? '');
  }, [user?.email]);

  const handleEmailSave = async () => {
    if (!token) return;
    if (!emailInput.trim()) {
      toast.error('Please enter a valid email address');
      return;
    }

    setEmailUpdating(true);
    try {
      const res = await fetch('/update-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ new_email: emailInput.trim() }),
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

      // "Funded" from a creator perspective:
      // - explicitly funded, or
      // - locked, or
      // - claimed, or
      // - any positive token_amount recorded.
      const isFunded =
        card.funded ||
        card.locked ||
        card.claimed ||
        (typeof card.token_amount === 'number' && card.token_amount > 0);

      const tokenMint = (card as any).token_mint as string | null;
      const tokenSymbol =
        (tokenMint && tokenSymbols[tokenMint]) ||
        (card as any).token_symbol ||
        'TOKEN';

      return {
        ...card,
        sol,
        fiat,
        currency,
        isFunded,
        tokenMint,
        tokenSymbol,
      };
    });
  }, [cards, solPrice, tokenSymbols]);

  const visibleCards = enrichedCards;

  const totalCreated = enrichedCards.length;
  const totalFunded = enrichedCards.filter((c) => c.isFunded).length;
  const totalClaimed = enrichedCards.filter((c) => c.claimed).length;

  const totalSol = enrichedCards.reduce((sum, c) => sum + (c.sol ?? 0), 0);
  const totalFiat = enrichedCards.reduce((sum, c) => sum + (c.fiat ?? 0), 0);

  const handleDeleteCard = async (publicId: string) => {
    if (!token) return;
    const confirmed = window.confirm(
      'Are you sure you want to delete this card from your dashboard? This does not affect on-chain funds.'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/delete-card/${encodeURIComponent(publicId)}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = data?.error || data?.message || 'Failed to delete card';
        throw new Error(message);
      }

      toast.success('Card removed from your dashboard view.');
      setCards((prev) => prev.filter((c) => c.public_id !== publicId));
    } catch (err: any) {
      console.error('UserDashboard: delete-card error', err);
      toast.error(err?.message || 'Failed to delete card');
    }
  };

  const handleSyncCardFunding = async (publicId: string) => {
    try {
      const result = await apiService.syncCardFunding(publicId);
      toast.success(
        `Funding synced. On-chain: ${result.sol.toFixed(6)} SOL, funded: ${
          result.funded ? 'yes' : 'no'
        }`
      );
      fetchCards();
    } catch (err: any) {
      console.error('UserDashboard: syncCardFunding error', err);
      toast.error(err?.message || 'Failed to sync funding');
    }
  };

  return (
    <section className="glass-card rounded-xl p-3 mt-5 shadow-card hover:shadow-card-hover transition-all">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-black gradient-text tracking-[0.22em] uppercase">
              {t('dashboard.title')}
            </h2>
          </div>
          <p className="text-[9px] text-muted-foreground max-w-md">
            {t('dashboard.description') ||
              'Manage your CRYPTOCARDS, monitor funding, and track claim status.'}
          </p>
        </div>

        {/* User info + logout */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <User2 className="w-3 h-3 text-primary" />
            <span className="font-semibold text-foreground">
              {user?.username || t('dashboard.unknownUser') || 'Unknown user'}
            </span>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={onLogout}
            className="h-7 w-7 border-border/50 hover:border-destructive/80 hover:text-destructive"
          >
            <LogOut className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Email management */}
      <div className="bg-card/60 border border-border/40 rounded-lg p-3 mb-3">
        <div className="flex items-center gap-2 mb-2">
          <Mail className="w-3 h-3 text-primary" />
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground">
            {t('dashboard.emailTitle') || 'Account Email & Notifications'}
          </h3>
        </div>

        <p className="text-[9px] text-muted-foreground mb-2">
          {t('dashboard.emailDescription') ||
            'Update the email for notifications and claim confirmations. Changes require confirmation from the new address.'}
        </p>

        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          <Input
            type="email"
            placeholder={t('dashboard.emailPlaceholder') || 'Enter your email'}
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            className="h-8 text-[10px]"
          />
          <Button
            onClick={handleEmailSave}
            disabled={emailUpdating}
            className="h-8 text-[10px] font-semibold px-3 gradient-primary"
          >
            {emailUpdating ? (
              <>
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                {t('dashboard.emailSaving') || 'Sending link...'}
              </>
            ) : (
              t('dashboard.emailSave') || 'Update email'
            )}
          </Button>
        </div>

        {user?.email && (
          <div className="mt-2 text-[9px] text-muted-foreground">
            {t('dashboard.currentEmail') || 'Current confirmed email:'}{' '}
            <span className="font-semibold text-foreground">{user.email}</span>
          </div>
        )}
      </div>

      {/* Stats + filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
        {/* Totals */}
        <div className="col-span-2 grid grid-cols-3 gap-2">
          <div className="bg-card/60 border border-border/40 rounded-lg p-2">
            <div className="text-[8px] uppercase tracking-wide text-muted-foreground">
              {t('dashboard.statCreated') || 'Created'}
            </div>
            <div className="text-[14px] font-black text-primary">
              {totalCreated.toLocaleString()}
            </div>
          </div>

          <div className="bg-card/60 border border-border/40 rounded-lg p-2">
            <div className="text-[8px] uppercase tracking-wide text-muted-foreground">
              {t('dashboard.statFunded') || 'Funded'}
            </div>
            <div className="text-[14px] font-black text-emerald-400">
              {totalFunded.toLocaleString()}
            </div>
          </div>

          <div className="bg-card/60 border border-border/40 rounded-lg p-2">
            <div className="text-[8px] uppercase tracking-wide text-muted-foreground">
              {t('dashboard.statClaimed') || 'Claimed'}
            </div>
            <div className="text-[14px] font-black text-cyan-300">
              {totalClaimed.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Volume */}
        <div className="bg-card/60 border border-border/40 rounded-lg p-2">
          <div className="text-[8px] uppercase tracking-wide text-muted-foreground">
            {t('dashboard.totalVolume') || 'Total funding volume'}
          </div>
          <div className="text-[11px] font-semibold">
            <span className="text-primary">
              {totalSol.toFixed(6)} SOL
            </span>
          </div>
          <div className="text-[9px] text-muted-foreground mt-1">
            {solPrice && totalSol > 0 ? (
              <>
                ≈{' '}
                <span className="font-semibold text-foreground">
                  {(totalSol * solPrice).toFixed(2)} USD
                </span>
              </>
            ) : (
              t('dashboard.volumeHint') || 'Fund cards to see fiat volume.'
            )}
          </div>
        </div>

        {/* Search + refresh */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1 bg-card/60 border border-border/40 rounded-lg px-2 h-8">
            <Search className="w-3 h-3 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder={t('dashboard.searchPlaceholder') || 'Search by card ID or date'}
              className="h-7 text-[9px] border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshClick}
            disabled={loading}
            className="h-8 text-[9px] font-semibold flex items-center justify-center gap-1"
          >
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                {t('dashboard.refreshing') || 'Refreshing...'}
              </>
            ) : (
              <>
                <RefreshCcw className="w-3 h-3" />
                {t('dashboard.refresh') || 'Refresh cards'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Cards list */}
      <div className="border border-border/40 rounded-lg overflow-hidden">
        <div className="bg-card/70 border-b border-border/40 px-2 py-2 text-[8px] uppercase tracking-[0.16em] text-muted-foreground flex items-center justify-between gap-2">
          <span className="w-[26%]">{t('dashboard.colCard') || 'Card'}</span>
          <span className="w-[18%]">{t('dashboard.colCreated') || 'Created'}</span>
          <span className="w-[20%] text-center">
            {t('dashboard.colFunding') || 'Funding status'}
          </span>
          <span className="w-[18%] text-right">
            {t('dashboard.colVolume') || 'Volume'}
          </span>
          <span className="w-[18%] text-right">
            {t('dashboard.colActions') || 'Actions'}
          </span>
        </div>

        <div className="max-h-72 overflow-y-auto custom-scrollbar">
          {visibleCards.length === 0 ? (
            <div className="py-6 text-center text-[9px] text-muted-foreground">
              {loading
                ? t('dashboard.loading') || 'Loading your cards...'
                : t('dashboard.empty') || 'No cards yet. Create your first CRYPTOCARD above.'}
            </div>
          ) : (
            visibleCards.map((card) => {
              const tokenSymbol = (card as any).tokenSymbol || 'TOKEN';
              const solDisplay = card.sol ?? 0;
              const fiatDisplay = card.fiat ?? 0;
              const currency = card.currency || 'USD';

              const statusLabel = card.claimed
                ? t('dashboard.statusClaimed') || 'CLAIMED'
                : card.locked
                ? t('dashboard.statusLocked') || 'LOCKED'
                : card.funded
                ? t('dashboard.statusFunded') || 'FUNDED'
                : solDisplay > 0
                ? t('dashboard.statusDeposited') || 'DEPOSIT DETECTED'
                : t('dashboard.statusPending') || 'PENDING';

              const statusClass = cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-semibold border',
                card.claimed &&
                  'border-emerald-400/70 text-emerald-300 bg-emerald-500/10',
                !card.claimed &&
                  card.locked &&
                  'border-cyan-400/70 text-cyan-300 bg-cyan-500/10',
                !card.claimed &&
                  !card.locked &&
                  (card.funded || solDisplay > 0) &&
                  'border-amber-400/70 text-amber-300 bg-amber-500/10',
                !card.claimed &&
                  !card.locked &&
                  !card.funded &&
                  solDisplay === 0 &&
                  'border-border/60 text-muted-foreground bg-card/60'
              );

              return (
                <div
                  key={card.public_id}
                  className="px-2 py-1.5 text-[9px] border-b border-border/20 last:border-b-0 flex items-center gap-2 hover:bg-card/40 transition-colors"
                >
                  {/* Card ID */}
                  <div className="w-[26%] flex flex-col gap-0.5">
                    <div className="font-semibold text-foreground truncate">
                      {card.public_id}
                    </div>
                    <div className="text-[8px] text-muted-foreground flex items-center gap-1">
                      <Shield className="w-3 h-3 text-primary" />
                      <span>
                        {card.claimed
                          ? t('dashboard.rowClaimed') || 'Claimed gift card'
                          : t('dashboard.rowCreated') || 'Gift card created'}
                      </span>
                    </div>
                  </div>

                  {/* Created at */}
                  <div className="w-[18%] text-[8px] text-muted-foreground">
                    {formatDateTime(card.created_at)}
                  </div>

                  {/* Funding status */}
                  <div className="w-[20%] flex flex-col items-center gap-0.5">
                    <span className={statusClass}>
                      {statusLabel}
                      {(card.funded || solDisplay > 0) && (
                        <ArrowLeftRight className="w-2 h-2" />
                      )}
                    </span>
                    {solDisplay > 0 && (
                      <span className="text-[8px] text-muted-foreground">
                        {t('dashboard.rowOnChain') || 'On-chain:'}{' '}
                        <span className="font-semibold text-primary">
                          {solDisplay.toFixed(6)} {tokenSymbol}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Volume */}
                  <div className="w-[18%] text-right">
                    <div className="text-[9px] font-semibold text-primary">
                      {solDisplay.toFixed(6)} {tokenSymbol}
                    </div>
                    <div className="text-[8px] text-muted-foreground">
                      {currency} {fiatDisplay.toFixed(2)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="w-[18%] flex items-center justify-end gap-1.5">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6 border-border/50"
                      onClick={() => {
                        window.open(`/claim/${encodeURIComponent(card.public_id)}`, '_blank');
                      }}
                      title={t('dashboard.viewClaim') || 'View claim page'}
                    >
                      <ArrowRight className="w-3 h-3" />
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6 border-border/50"
                      onClick={() => handleSyncCardFunding(card.public_id)}
                      title={t('dashboard.syncFunding') || 'Sync on-chain funding'}
                    >
                      <RefreshCcw className="w-3 h-3" />
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-6 w-6 border-destructive/60 text-destructive"
                      onClick={() => handleDeleteCard(card.public_id)}
                      title={t('dashboard.deleteCard') || 'Remove from dashboard'}
                    >
                      <Lock className="w-3 h-3" />
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
