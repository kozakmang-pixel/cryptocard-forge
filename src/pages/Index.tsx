// src/pages/Index.tsx
import { useEffect, useMemo, useState } from 'react';
import { CardDesigner } from '@/components/CardDesigner';
import { ProgressBar } from '@/components/ProgressBar';
import { CryptoCard } from '@/components/CryptoCard';
import { ImageGrid } from '@/components/ImageGrid';
import { UserDashboard } from '@/components/UserDashboard';
import { AuditSection } from '@/components/AuditSection';
import { PublicDashboard } from '@/components/PublicDashboard';
import { PriceBanner } from '@/components/PriceBanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/lib/languageStore';
import { useSession } from '@/hooks/useSession';
import { apiService } from '@/services/api';
import { toast } from 'sonner';
import {
  Gift,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Loader2,
  LogIn,
  UserPlus,
  Languages,
  Mail,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Twitter,
  ExternalLink,
  Copy,
} from 'lucide-react';
import type { FontFamily } from '@/types/card';

interface CardTemplate {
  id: string;
  tokenAddress: string;
  message: string;
  font: FontFamily;
  hasExpiry: boolean;
  expiryDate: string;
  imageUrl: string;
  tokenName: string;
}

export default function IndexPage() {
  const { t, language, setLanguage } = useLanguage();
  const { session, loading: sessionLoading, refreshSession, setSession } = useSession();

  const [tokenAddress, setTokenAddress] = useState('');
  const [message, setMessage] = useState('');
  const [font, setFont] = useState<FontFamily>('Space Grotesk');
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedImage, setSelectedImage] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [locked, setLocked] = useState(false);
  const [cardCreated, setCardCreated] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [authLoading, setAuthLoading] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<'success' | 'error' | null>(null);

  const [solPrice, setSolPrice] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const [templates] = useState<CardTemplate[]>([
    {
      id: '1',
      tokenAddress: '',
      message: 'gm anon, enjoy this CRYPTOCARD 🚀',
      font: 'Space Grotesk',
      hasExpiry: false,
      expiryDate: '',
      imageUrl: '',
      tokenName: '',
    },
  ]);

  // Parse confirmation message from URL hash
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (!hash.startsWith('#')) return;

    const params = new URLSearchParams(hash.slice(1));
    const message = params.get('message');
    const status = params.get('status') as 'success' | 'error' | null;

    if (message) {
      setConfirmMsg(decodeURIComponent(message));
      setConfirmStatus(status || 'success');

      // Clean the hash from the URL
      const url = new URL(window.location.href);
      url.hash = '';
      window.history.replaceState(null, '', url.toString());
    }
  }, []);

  // Fetch SOL price for banner and dashboards
  const fetchSolPrice = async () => {
    try {
      const res = await fetch('/sol-price');
      if (!res.ok) {
        throw new Error('Failed to fetch SOL price');
      }
      const data = await res.json();
      const price =
        typeof data.price_usd === 'number' ? data.price_usd : data.sol_price_usd;
      if (typeof price === 'number') {
        setSolPrice(price);
      }
    } catch (err) {
      console.error('IndexPage: failed to fetch SOL price', err);
    }
  };

  useEffect(() => {
    fetchSolPrice();
  }, []);

  const handlePriceRefresh = () => {
    fetchSolPrice();
    setRefreshKey((prev) => prev + 1);
  };

  const handleTemplateSelect = (template: CardTemplate) => {
    if (locked) return;
    setTokenAddress(template.tokenAddress);
    setMessage(template.message);
    setFont(template.font);
    setHasExpiry(template.hasExpiry);
    setExpiryDate(template.expiryDate);
    setSelectedImage(template.imageUrl);
    setTokenName(template.tokenName);
  };

  const handleImageUpload = (_file: File) => {
    toast.info('Custom image upload is not yet wired to storage, using preview only.');
  };

  const handleTokenInfoChange = (info: { symbol: string; name: string } | null) => {
    if (info?.name) {
      setTokenName(info.name);
    } else if (info?.symbol) {
      setTokenName(info.symbol);
    } else {
      setTokenName('');
    }
  };

  const handleCreateCard = async () => {
    if (locked || cardCreated) return;

    if (!tokenAddress.trim()) {
      toast.error('Please enter a token mint address for your CRYPTOCARD.');
      return;
    }

    if (!message.trim()) {
      toast.error('Please add a short message to your CRYPTOCARD.');
      return;
    }

    if (!selectedImage) {
      toast.error('Please select artwork for your CRYPTOCARD.');
      return;
    }

    setIsCreating(true);

    try {
      const payload = {
        tokenAddress: tokenAddress.trim(),
        message: message.trim(),
        font,
        hasExpiry,
        expiryDate: hasExpiry ? expiryDate : null,
        imageUrl: selectedImage,
        tokenName,
      };

      const res = await apiService.createCardTemplate(payload);
      if (!res || !res.public_id) {
        throw new Error('Failed to create card template');
      }

      setLocked(true);
      setCardCreated(true);
      setRefreshKey((prev) => prev + 1);

      toast.success('Design saved. Scroll down to fund and lock your CRYPTOCARD.');
    } catch (err: any) {
      console.error('Create card error:', err);
      toast.error(err?.message || 'Failed to create CRYPTOCARD design.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
      setSession(null);
      setUsernameInput('');
      setPasswordInput('');
      toast.success('Logged out.');
    } catch (err) {
      console.error('Logout failed:', err);
      toast.error('Failed to log out.');
    }
  };

  const handleAuthSubmit = async () => {
    const username = usernameInput.trim();
    const password = passwordInput.trim();
    const email = emailInput.trim();

    if (!username || !password) {
      toast.error('Please enter a username and password.');
      return;
    }

    setAuthLoading(true);

    try {
      if (authMode === 'signup') {
        const result = await apiService.signup({
          username,
          password,
          email: email || undefined,
        });

        if (!result?.token) {
          throw new Error('Signup failed.');
        }

        setSession(result);
        toast.success('Account created. You are now signed in.');
      } else {
        const result = await apiService.login({ username, password });
        if (!result?.token) {
          throw new Error('Login failed.');
        }

        setSession(result);
        toast.success('Logged in successfully.');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      toast.error(err?.message || 'Authentication failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailUpdateOnDashboard = (email: string) => {
    setEmailInput(email);
  };

  const isDesignReady = useMemo(() => {
    return Boolean(tokenAddress && message && selectedImage && !locked);
  }, [tokenAddress, message, selectedImage, locked]);

  const solPriceDisplay = solPrice ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background text-foreground relative overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-br from-cyan-500/20 via-emerald-400/10 to-transparent blur-3xl" />
        <div className="absolute top-0 right-[-100px] w-[420px] h-[420px] rounded-full bg-[radial-gradient(circle_at_top,_rgba(126,34,206,0.2),_transparent_60%)] blur-3xl" />
        <div className="absolute bottom-[-180px] left-[-120px] w-[380px] h-[380px] rounded-full bg-[radial-gradient(circle_at_bottom,_rgba(56,189,248,0.22),_transparent_60%)] blur-3xl" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-3 sm:px-4 lg:px-6 py-4">
        <header className="sticky top-0 z-30 mb-4">
          <div className="glass-card border border-border/40 backdrop-blur-xl rounded-2xl px-3 py-2 md:px-4 md:py-3 flex items-center justify-between gap-3 shadow-card">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <div className="relative flex-shrink-0">
                <img
                  src="/cryptocards-logo.png"
                  alt="CRYPTOCARDS logo"
                  className="relative w-8 h-8 md:w-9 md:h-9 rounded-full"
                />
              </div>

              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs md:text-sm font-black tracking-[0.25em] uppercase bg-gradient-to-r from-emerald-300 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                    CRYPTOCARDS
                  </span>
                  <span className="hidden md:inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-[2px] text-[10px] font-semibold text-emerald-300 tracking-wide">
                    Live on&nbsp;Solana
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] md:text-[11px] text-muted-foreground">
                  <Sparkles className="w-3 h-3 text-cyan-300 flex-shrink-0" />
                  <span className="truncate">
                    On-chain, non-custodial crypto gift cards.
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="hidden md:flex items-center gap-1 text-[10px] text-muted-foreground pr-2 border-r border-border/40">
                <ShieldCheck className="w-3 h-3 text-emerald-300" />
                <span className="uppercase tracking-wide font-semibold">
                  Non-custodial • Audited
                </span>
              </div>
              <Button
                onClick={() => {
                  const el = document.getElementById('claim-section');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                size="sm"
                className="h-7 md:h-8 px-3 md:px-4 text-[10px] md:text-[11px] font-black gradient-success text-primary-foreground flex items-center gap-1 shadow-[0_0_25px_rgba(56,189,248,0.9)] ring-2 ring-cyan-400/60 animate-pulse"
              >
                <Gift className="w-3 h-3 md:w-4 md:h-4" />
                <span>CLAIM A CARD</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="space-y-4">
          {solPrice !== null && (
            <PriceBanner
              solPrice={solPriceDisplay}
              cryptocardsPrice={0.00042}
              onRefresh={handlePriceRefresh}
            />
          )}

          {confirmMsg && (
            <div
              className={`glass-card rounded-xl p-2.5 border flex items-start gap-2 text-[10px] ${
                confirmStatus === 'success'
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-100'
                  : 'border-rose-500/50 bg-rose-500/10 text-rose-100'
              }`}
            >
              <div className="mt-[2px]">
                {confirmStatus === 'success' ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <XCircle className="w-3 h-3" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-semibold mb-0.5">
                  {confirmStatus === 'success' ? 'Success' : 'Notice'}
                </div>
                <div>{confirmMsg}</div>
              </div>
            </div>
          )}

          <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-4 items-start">
            <div className="space-y-3">
              <div className="glass-card rounded-xl p-3 shadow-card hover:shadow-card-hover transition-all hover:-translate-y-0.5 border border-border/50">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div>
                    <h1 className="text-xs md:text-sm font-black gradient-text tracking-[0.25em] uppercase">
                      CRYPTOCARDS ON-CHAIN GIFT CARDS
                    </h1>
                    <p className="mt-1 text-[9px] md:text-[10px] text-muted-foreground max-w-xl">
                      Create fully on-chain crypto gift cards on Solana with{' '}
                      <span className="font-semibold text-primary">no wallet
                        connection required</span> for the recipient. Perfect for
                      streams, giveaways, and IRL gifting.
                    </p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-[9px] text-muted-foreground">
                    <Languages className="w-3 h-3" />
                    <select
                      className="bg-transparent border border-border/50 rounded px-1.5 py-[2px] text-[9px] focus:outline-none"
                      value={language}
                      onChange={(e) =>
                        setLanguage(e.target.value as typeof language)
                      }
                    >
                      <option value="en">EN</option>
                      <option value="es">ES</option>
                      <option value="fr">FR</option>
                      <option value="de">DE</option>
                      <option value="pt">PT</option>
                      <option value="it">IT</option>
                      <option value="pl">PL</option>
                      <option value="ru">RU</option>
                      <option value="zh">中文</option>
                      <option value="ja">日本語</option>
                    </select>
                  </div>
                </div>

                <ProgressBar
                  tokenAddress={tokenAddress}
                  message={message}
                  selectedImage={selectedImage}
                  hasExpiry={hasExpiry}
                  locked={locked}
                  cardCreated={cardCreated}
                  isDesignReady={isDesignReady}
                />

                <div className="mt-3 grid grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-3 items-start">
                  <CardDesigner
                    tokenAddress={tokenAddress}
                    message={message}
                    font={font}
                    hasExpiry={hasExpiry}
                    expiryDate={expiryDate}
                    selectedImage={selectedImage}
                    tokenName={tokenName}
                    onTokenAddressChange={setTokenAddress}
                    onMessageChange={setMessage}
                    onFontChange={setFont}
                    onExpiryToggle={setHasExpiry}
                    onExpiryDateChange={setExpiryDate}
                    onImageSelect={setSelectedImage}
                    onImageUpload={handleImageUpload}
                    onCreateCard={handleCreateCard}
                    onTokenInfoChange={handleTokenInfoChange}
                    isCreating={isCreating}
                    cardCreated={cardCreated}
                    locked={locked}
                  />

                  <CryptoCard
                    tokenAddress={tokenAddress}
                    message={message}
                    imageUrl={selectedImage}
                    fontFamily={font}
                    tokenName={tokenName}
                    hasExpiry={hasExpiry}
                    expiryDate={expiryDate}
                    locked={locked}
                    cardCreated={cardCreated}
                  />
                </div>
              </div>

              <div className="glass-card rounded-xl p-3 shadow-card hover:shadow-card-hover transition-all border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Gift className="w-3 h-3 text-primary" />
                    <h2 className="text-[11px] font-semibold uppercase tracking-wide">
                      One-click templates
                    </h2>
                  </div>
                  <p className="text-[8px] text-muted-foreground">
                    Start from a preset and customize your design.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleTemplateSelect(tpl)}
                      className="group rounded-lg border border-border/40 bg-background/60 p-2 text-left hover:border-primary/60 hover:bg-primary/5 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[9px] font-semibold uppercase tracking-wide">
                          Starter template
                        </span>
                        <ArrowRight className="w-3 h-3 text-primary group-hover:translate-x-0.5 transition-transform" />
                      </div>
                      <p className="text-[9px] text-muted-foreground">
                        {tpl.message}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="glass-card rounded-xl p-3 shadow-card hover:shadow-card-hover transition-all border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3 h-3 text-primary" />
                    <h2 className="text-[11px] font-semibold uppercase tracking-wide">
                      Creator account
                    </h2>
                  </div>
                  <span className="text-[8px] text-muted-foreground">
                    Track every CRYPTOCARD you create.
                  </span>
                </div>

                {sessionLoading ? (
                  <div className="flex items-center justify-center py-4 text-[9px] text-muted-foreground">
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                    Restoring session…
                  </div>
                ) : session ? (
                  <UserDashboard
                    token={session.token}
                    user={{
                      id: session.user_id,
                      username: session.username,
                      email: session.email,
                    }}
                    onLogout={handleLogout}
                    onEmailUpdate={handleEmailUpdateOnDashboard}
                    refreshKey={refreshKey}
                  />
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant={authMode === 'signup' ? 'default' : 'outline'}
                        className="h-7 text-[9px] flex items-center justify-center gap-1"
                        onClick={() => setAuthMode('signup')}
                      >
                        <UserPlus className="w-3 h-3" />
                        Sign up
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={authMode === 'login' ? 'default' : 'outline'}
                        className="h-7 text-[9px] flex items-center justify-center gap-1"
                        onClick={() => setAuthMode('login')}
                      >
                        <LogIn className="w-3 h-3" />
                        Log in
                      </Button>
                    </div>

                    <div className="space-y-1.5">
                      <Input
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        placeholder="Username"
                        className="h-7 text-[10px] bg-card/60 border-border/40"
                      />
                      <Input
                        type="password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="Password"
                        className="h-7 text-[10px] bg-card/60 border-border/40"
                      />
                      <Input
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="Optional notification email"
                        className="h-7 text-[10px] bg-card/60 border-border/40"
                      />
                      <Button
                        type="button"
                        className="w-full h-7 text-[10px] font-semibold mt-1"
                        onClick={handleAuthSubmit}
                        disabled={authLoading}
                      >
                        {authLoading ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            {authMode === 'signup' ? 'Creating account…' : 'Logging in…'}
                          </>
                        ) : authMode === 'signup' ? (
                          'Create account'
                        ) : (
                          'Log in'
                        )}
                      </Button>
                      <p className="text-[8px] text-muted-foreground">
                        Your account tracks all CRYPTOCARDS you create. Email is used only
                        for claim notifications and security alerts.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <AuditSection />
            </div>
          </section>

          <PublicDashboard />

          <section
            id="claim-section"
            className="glass-card rounded-xl p-3 mt-4 shadow-card hover:shadow-card-hover transition-all border border-border/50"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Gift className="w-3 h-3 text-primary" />
                <h2 className="text-[11px] font-semibold uppercase tracking-wide">
                  Claiming a CRYPTOCARD
                </h2>
              </div>
              <span className="text-[8px] text-muted-foreground">
                No wallet connection required to receive a card.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">
                    1
                  </span>
                  Recipient receives Card ID
                </div>
                <p className="text-[9px] text-muted-foreground">
                  The creator shares a unique{' '}
                  <span className="font-semibold text-primary">Card ID</span> with you (via
                  DM, stream overlay, QR, or IRL printout). You&apos;ll use this to claim
                  the funds locked on-chain for your wallet.
                </p>

                <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground mt-2">
                  <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">
                    2
                  </span>
                  Claim to your Solana wallet
                </div>
                <p className="text-[9px] text-muted-foreground">
                  Visit the claim page, paste your Card ID, and choose the wallet address
                  you want to receive funds to. The claim transaction executes on-chain,
                  moving the balance from the deposit wallet{' '}
                  <span className="font-semibold text-primary">directly into your wallet</span>.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">
                    3
                  </span>
                  Non-custodial by design
                </div>
                <p className="text-[9px] text-muted-foreground">
                  <span className="font-semibold text-primary">CRYPTOCARDS never hold
                    private keys or recipient funds.</span> The protocol only controls the
                  deposit wallet until it sends value to the final recipient address you
                  provide during claim.
                </p>

                <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground mt-2">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  Safety tips
                </div>
                <p className="text-[9px] text-muted-foreground">
                  Always verify you are on the official{' '}
                  <span className="font-semibold text-primary">
                    cryptocards.fun
                  </span>{' '}
                  domain before claiming. Never share your seed phrase or private key with
                  anyone — the protocol will never ask for it.
                </p>
              </div>
            </div>
          </section>

          <footer className="mt-6 pb-6 border-t border-border/40 pt-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-[9px] text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0">
                  <img
                    src="/cryptocards-logo.png"
                    alt="CRYPTOCARDS logo"
                    className="w-14 h-14 md:w-16 md:h-16 rounded-full"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-black tracking-[0.25em] uppercase bg-gradient-to-r from-emerald-300 via-cyan-300 to-blue-400 bg-clip-text text-transparent">
                      CRYPTOCARDS
                    </span>
                    <span className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-1.5 py-[1px] text-[8px] font-semibold text-emerald-300 tracking-wide">
                      On-chain gift cards
                    </span>
                  </div>
                  <p className="mt-1 text-[9px] max-w-xs">
                    On-chain, non-custodial crypto gift cards. The future of digital gifting
                    on Solana.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href="https://x.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[9px] text-muted-foreground hover:text-primary"
                >
                  <Twitter className="w-3 h-3" />
                  <span>@cryptocards</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-[8px] text-muted-foreground hover:text-primary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText('https://cryptocards.fun');
                      toast.success('Site URL copied to clipboard');
                    } catch {
                      toast.error('Failed to copy URL');
                    }
                  }}
                >
                  <Copy className="w-3 h-3" />
                  Copy site URL
                </button>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
