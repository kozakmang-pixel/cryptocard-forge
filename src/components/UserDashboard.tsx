// src/components/UserDashboard.tsx
import { useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/lib/languageStore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowUpRight,
  CheckCircle2,
  Loader2,
  LogOut,
  Mail,
  RefreshCcw,
  Search,
  Wallet,
} from 'lucide-react';

interface DashboardCard {
  public_id: string;
  message: string | null;
  currency: string | null;
  amount_fiat: number | null;
  token_mint: string | null;
  deposit_address: string | null;
  funded: boolean;
  locked: boolean;
  claimed: boolean;
  refunded: boolean;
  created_at: string | null;
  updated_at: string | null;
  token_amount: number | null;
  sol_amount: number | null;
}

interface UserDashboardProps {
  token: string | null;
  user: { id: string; username: string; email?: string | null } | null;
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
  const [search, setSearch] = useState('');
  const [emailInput, setEmailInput] = useState(user?.email || '');
  const [updatingEmail, setUpdatingEmail] = useState(false);

  const [tokenSymbols, setTokenSymbols] = useState<Record<string, string>>({});
  const [solPrice, setSolPrice] = useState<number | null>(null);

  // Fetch user's cards
  useEffect(() => {
    const loadCards = async () => {
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

    loadCards();
  }, [token, refreshKey]);

  // Fetch SOL price once for approximate fiat calculations
  useEffect(() => {
    const fetchSolPrice = async () => {
      try {
        const res = await fetch('/sol-price');
        if (!res.ok) return;
        const data = await res.json();
        if (typeof data.sol_usd === 'number') {
          setSolPrice(data.sol_usd);
        } else if (typeof data.price_usd === 'number') {
          setSolPrice(data.price_usd);
        }
      } catch (err) {
        console.error('UserDashboard: failed to fetch SOL price', err);
      }
    };

    fetchSolPrice();
  }, []);

  // DexScreener symbol lookup based on token_mint
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
        const res = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${mint}`
        );
        if (!res.ok) {
          setTokenSymbols((prev) =>
            prev[mint] ? prev : { ...prev, [mint]: 'TOKEN' }
          );
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
        setTokenSymbols((prev) =>
          prev[mint] ? prev : { ...prev, [mint]: 'TOKEN' }
        );
      }
    });
  }, [cards, tokenSymbols]);

  const enrichedCards = useMemo(() => {
    return cards.map((card) => {
      const sol =
        typeof card.token_amount === 'number' ? card.token_amount : 0;
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
        fiatCurrency: currency,
        isFunded,
        tokenSymbol,
      };
    });
  }, [cards, solPrice, tokenSymbols]);

  const filteredCards = useMemo(() => {
    if (!search.trim()) return enrichedCards;
    const q = search.trim().toLowerCase();
    return enrichedCards.filter((card) => {
      const id = card.public_id?.toLowerCase() || '';
      const msg = card.message?.toLowerCase() || '';
      const tokenMint = (card as any).token_mint?.toLowerCase() || '';
      const tokenSymbol = (card as any).tokenSymbol?.toLowerCase() || '';
      return (
        id.includes(q) ||
        msg.includes(q) ||
        tokenMint.includes(q) ||
        tokenSymbol.includes(q)
      );
    });
  }, [search, enrichedCards]);

  const stats = useMemo(() => {
    const total = enrichedCards.length;
    const active = enrichedCards.filter((c) => !c.claimed && !c.refunded).length;
    const funded = enrichedCards.filter((c) => c.isFunded).length;
    const locked = enrichedCards.filter((c) => c.locked && !c.claimed).length;
    const claimed = enrichedCards.filter((c) => c.claimed).length;

    return {
      total,
      active,
      funded,
      locked,
      claimed,
    };
  }, [enrichedCards]);

  const totalValueFiat = useMemo(() => {
    return enrichedCards.reduce((sum, c) => sum + (c.fiat || 0), 0);
  }, [enrichedCards]);

  const handleUpdateEmail = async () => {
    if (!emailInput || !emailInput.includes('@')) {
      toast.error('Enter a valid email.');
      return;
    }

    setUpdatingEmail(true);
    try {
      const res = await fetch('/auth/update-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ new_email: emailInput }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('/auth/update-email error', res.status, text);
        throw new Error('Failed to update email');
      }

      const data = await res.json();
      if (data?.user?.email) {
        onEmailUpdate(data.user.email);
        toast.success('Email updated!');
      } else {
        toast.success('Email update requested.');
      }
    } catch (err: any) {
      console.error('update email error', err);
      toast.error(err?.message || 'Failed to update email');
    } finally {
      setUpdatingEmail(false);
    }
  };

  return (
    <section className="mt-6 space-y-3">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold flex items-center gap-2">
            <Wallet className="w-4 h-4 text-primary" />
            <span>{t('dashboard.yourWallet')}</span>
          </h2>
          <p className="text-[10px] text-muted-foreground">
            {user?.username || user?.email || 'Anonymous creator'}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[9px] flex items-center gap-1 px-2"
          onClick={onLogout}
        >
          <LogOut className="w-3 h-3" />
          {t('dashboard.logout')}
        </Button>
      </div>

      {/* Notification email + summary */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr,3fr] gap-3">
        {/* Email + actions */}
        <div className="glass-card rounded-xl p-3 border border-border/40 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[10px] uppercase font-bold flex items-center gap-1">
              <Mail className="w-3 h-3 text-primary" />
              <span>{t('dashboard.notificationEmail')}</span>
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => {
                if (!user?.email) {
                  toast.info('No primary email on file.');
                  return;
                }
                toast.success('Verification email resent (simulated).');
              }}
            >
              <RefreshCcw className="w-3 h-3" />
            </Button>
          </div>

          <div className="space-y-2">
            <Input
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder="you@example.com"
              className="h-7 text-[10px]"
            />
            <Button
              size="sm"
              className="h-7 text-[9px] font-semibold w-full"
              disabled={updatingEmail}
              onClick={handleUpdateEmail}
            >
              {updatingEmail ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  {t('dashboard.updatingEmail')}
                </>
              ) : (
                t('dashboard.updateEmail')
              )}
            </Button>
            <p className="text-[9px] text-muted-foreground">
              {t('dashboard.emailHint')}
            </p>
          </div>
        </div>

        {/* Portfolio summary */}
        <div className="glass-card rounded-xl p-3 border border-border/40 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-[10px] uppercase font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-primary" />
                <span>{t('dashboard.portfolioSummary')}</span>
              </h3>
              <p className="text-[9px] text-muted-foreground">
                {t('dashboard.liveView')}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold">
                {totalValueFiat.toFixed(2)} USD
              </div>
              <div className="text-[9px] text-muted-foreground">
                {stats.total} {t('dashboard.active')}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-1 mt-2">
            <div className="p-2 rounded-lg bg-primary/5 text-center">
              <div className="text-[9px] font-bold">{stats.total}</div>
              <div className="text-[8px] text-muted-foreground">
                {t('dashboard.active')}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-center">
              <div className="text-[9px] font-bold">{stats.funded}</div>
              <div className="text-[8px] text-muted-foreground">
                {t('dashboard.funded')}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-yellow-500/10 text-center">
              <div className="text-[9px] font-bold">{stats.locked}</div>
              <div className="text-[8px] text-muted-foreground">
                {t('dashboard.locked')}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-sky-500/10 text-center">
              <div className="text-[9px] font-bold">{stats.claimed}</div>
              <div className="text-[8px] text-muted-foreground">
                {t('dashboard.claimed')}
              </div>
            </div>
            <div className="p-2 rounded-lg bg-muted/40 text-center">
              <div className="text-[9px] font-bold">{stats.total - stats.claimed}</div>
              <div className="text-[8px] text-muted-foreground">
                {t('dashboard.summaryHint')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-3 h-3 absolute left-2 top-1.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('dashboard.searchPlaceholder')}
              className="pl-6 h-7 text-[9px]"
            />
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[9px] flex items-center gap-1 px-2"
          onClick={() => {
            setSearch('');
          }}
        >
          <RefreshCcw className="w-3 h-3" />
          {t('dashboard.refresh')}
        </Button>
      </div>

      {/* Cards table */}
      <div className="glass-card rounded-xl p-3 border border-border/40 overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="text-[9px] text-muted-foreground border-b border-border/30">
              <th className="text-left pb-2 pr-2 font-semibold">
                {t('dashboard.tableCard')}
              </th>
              <th className="text-left pb-2 px-2 font-semibold">
                {t('dashboard.tableStatus')}
              </th>
              <th className="text-left pb-2 px-2 font-semibold">
                {t('dashboard.tableValue')}
              </th>
              <th className="text-right pb-2 pl-2 font-semibold">
                {t('dashboard.tableActions')}
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={4}
                  className="py-6 text-center text-[10px] text-muted-foreground"
                >
                  <Loader2 className="w-3 h-3 inline-block mr-1 animate-spin" />
                  Loading your cards…
                </td>
              </tr>
            ) : filteredCards.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="py-6 text-center text-[10px] text-muted-foreground"
                >
                  <div className="font-semibold mb-1">
                    {t('dashboard.noCardsTitle')}
                  </div>
                  <div>{t('dashboard.noCardsBody')}</div>
                </td>
              </tr>
            ) : (
              filteredCards.map((card) => {
                const statusParts: string[] = [];
                if (card.claimed) statusParts.push('CLAIMED');
                else if (card.refunded) statusParts.push('REFUNDED');
                else if (card.locked) statusParts.push('LOCKED');
                else if (card.isFunded) statusParts.push('FUNDED');
                else statusParts.push('PENDING');

                const createdAt = card.created_at
                  ? new Date(card.created_at)
                  : null;
                const createdLabel = createdAt
                  ? createdAt.toLocaleDateString()
                  : 'N/A';

                const tokenSymbol = (card as any).tokenSymbol || 'TOKEN';
                const sol = card.sol ?? 0;
                const fiat = card.fiat ?? 0;

                return (
                  <tr
                    key={card.public_id}
                    className="text-[9px] border-t border-border/20"
                  >
                    {/* Card column */}
                    <td className="py-2 pr-2 align-top">
                      <div className="font-semibold text-foreground">
                        {card.public_id}
                      </div>
                      <div className="text-[8px] text-muted-foreground">
                        {card.message || 'No message set'}
                      </div>
                      <div className="text-[8px] text-muted-foreground mt-0.5">
                        {createdLabel}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-2 px-2 align-top">
                      <div className="flex flex-wrap gap-1">
                        {statusParts.map((s) => (
                          <span
                            key={s}
                            className="px-1.5 py-0.5 rounded-full bg-card text-[8px] border border-border/40"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Value */}
                    <td className="py-2 px-2 align-top">
                      <div className="text-[9px] font-semibold">
                        {sol.toFixed(6)} {tokenSymbol}
                      </div>
                      <div className="text-[8px] text-muted-foreground">
                        {sol.toFixed(6)} SOL
                      </div>
                      <div className="text-[8px] text-muted-foreground">
                        ${fiat.toFixed(2)} USD
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-2 pl-2 align-top text-right">
                      <a
                        href={`/claim/${card.public_id}`}
                        className="inline-flex items-center gap-1 text-[8px] font-semibold text-primary hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View / Share
                        <ArrowUpRight className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <p className="mt-2 text-[8px] text-muted-foreground text-center">
          {t('dashboard.footerNote')}
        </p>
      </div>
    </section>
  );
}
