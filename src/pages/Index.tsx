import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { SecurityBanner } from '@/components/SecurityBanner';
import { PriceBanner } from '@/components/PriceBanner';
import { CurrencySelect } from '@/components/CurrencySelect';
import { LanguageSelect } from '@/components/LanguageSelect';
import { Header } from '@/components/Header';
import { ProgressBar } from '@/components/ProgressBar';
import { CardDesigner } from '@/components/CardDesigner';
import { CryptoCard } from '@/components/CryptoCard';
import { FundingPanel } from '@/components/FundingPanel';
import { LoginPanel } from '@/components/LoginPanel';
import { UserDashboard } from '@/components/UserDashboard';
import { AuditSection } from '@/components/AuditSection';
import { PublicDashboard } from '@/components/PublicDashboard';
import { ClaimModal } from '@/components/ClaimModal';
import { ShareModal } from '@/components/ShareModal';
import { DocumentationModal } from '@/components/DocumentationModal';
import { TermsModal } from '@/components/TermsModal';
import { PrivacyModal } from '@/components/PrivacyModal';
import { DiscordModal } from '@/components/DiscordModal';
import { DevPanel } from '@/components/DevPanel';
import { CardData, FontFamily } from '@/types/card';
import { apiService } from '@/services/api';
import { toast } from 'sonner';
import {
  Palette,
  Gift,
  Lock,
  Share2,
  FileText,
  Shield,
  ExternalLink,
} from 'lucide-react';
import { useLanguage } from '@/lib/languageStore';

const BUILDER_STORAGE_KEY = 'cc_builder_state_v1';

interface StoredBuilderState {
  cardData: CardData | null;
  cardCreated: boolean;
  funded: boolean;
  locked: boolean;
  currentStep: number;
  tokenAddress: string;
  tokenSymbol: string;
  tokenName: string;
  tokenAmount: string;
  message: string;
  font: FontFamily;
  hasExpiry: boolean;
  expiryDate: string;
  selectedImage: string;
  currency: string;
}

export default function Index() {
  const { language, setLanguage, t } = useLanguage();

  const [cardData, setCardData] = useState<CardData | null>(null);
  const [cardCreated, setCardCreated] = useState(false);
  const [funded, setFunded] = useState(false);
  const [locked, setLocked] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const [tokenAddress, setTokenAddress] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('TOKEN');
  const [tokenName, setTokenName] = useState('');
  const [tokenAmount, setTokenAmount] = useState('');

  const [message, setMessage] = useState('');
  const [font, setFont] = useState<FontFamily>('Inter');
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedImage, setSelectedImage] = useState(
    'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=300&h=190&fit=crop'
  );

  const [currency, setCurrency] = useState('USD');
  const [solPrice, setSolPrice] = useState(150);

  const [isCreating, setIsCreating] = useState(false);

  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [docsModalOpen, setDocsModalOpen] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [discordModalOpen, setDiscordModalOpen] = useState(false);

  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<{
    id: string;
    username: string;
    email?: string;
  } | null>(null);

  const [cardsRefreshKey, setCardsRefreshKey] = useState(0);

  // Hydrate auth from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    if (storedToken && storedUser) {
      setAuthToken(storedToken);
      try {
        setAuthUser(JSON.parse(storedUser));
      } catch {
        // ignore bad json
      }
    }
  }, []);

  // Simple SOL price fetch for the top banner (client-side).
  // Backend handles pricing for funding/audit/claim.
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.solana?.usd) {
          setSolPrice(data.solana.usd);
        }
      } catch {
        // silent – backend still has its own pricing
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Hydrate builder from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(BUILDER_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<StoredBuilderState>;

      if (saved.currency) setCurrency(saved.currency);
      if (saved.tokenAddress) setTokenAddress(saved.tokenAddress);
      if (saved.tokenSymbol) setTokenSymbol(saved.tokenSymbol);
      if (saved.tokenName) setTokenName(saved.tokenName);
      if (saved.tokenAmount) setTokenAmount(saved.tokenAmount);
      if (saved.message) setMessage(saved.message);
      if (saved.font) setFont(saved.font);
      if (typeof saved.hasExpiry === 'boolean') setHasExpiry(saved.hasExpiry);
      if (saved.expiryDate) setExpiryDate(saved.expiryDate);
      if (saved.selectedImage) setSelectedImage(saved.selectedImage);
      if (typeof saved.cardCreated === 'boolean') setCardCreated(saved.cardCreated);
      if (typeof saved.funded === 'boolean') setFunded(saved.funded);
      if (typeof saved.locked === 'boolean') setLocked(saved.locked);
      if (typeof saved.currentStep === 'number') setCurrentStep(saved.currentStep);
      if (saved.cardData) setCardData(saved.cardData as CardData);
    } catch (err) {
      console.error('Failed to hydrate builder state', err);
    }
  }, []);

  // Persist builder to localStorage whenever it changes
  useEffect(() => {
    const stateToSave: StoredBuilderState = {
      cardData,
      cardCreated,
      funded,
      locked,
      currentStep,
      tokenAddress,
      tokenSymbol,
      tokenName,
      tokenAmount,
      message,
      font,
      hasExpiry,
      expiryDate,
      selectedImage,
      currency,
    };
    try {
      localStorage.setItem(BUILDER_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (err) {
      console.error('Failed to persist builder state', err);
    }
  }, [
    cardData,
    cardCreated,
    funded,
    locked,
    currentStep,
    tokenAddress,
    tokenSymbol,
    tokenName,
    tokenAmount,
    message,
    font,
    hasExpiry,
    expiryDate,
    selectedImage,
    currency,
  ]);

  const handleTokenInfoChange = (
    info: { symbol: string; name: string } | null
  ) => {
    if (info) {
      setTokenSymbol(info.symbol);
      setTokenName(info.name);
    } else {
      setTokenSymbol('TOKEN');
      setTokenName('');
    }
  };

  const handleImageUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setSelectedImage(url);
    toast.success('Image uploaded!');
  };

  // Manual refresh for SOL price banner
  const handleRefreshPrices = async () => {
    try {
      const res = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd'
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.solana?.usd) {
        setSolPrice(data.solana.usd);
      }
    } catch {
      // ignore – banner will keep last known price
    }
  };

  // Funding callback from FundingPanel → keep card preview in sync
  const handleFundingStatusChange = useCallback(
    (isFunded: boolean, solAmount: number, tokenSymbolFromPanel?: string) => {
      setFunded(isFunded);
      setCardData((prev) =>
        prev
          ? {
              ...prev,
              funded: isFunded,
              tokenSymbol: tokenSymbolFromPanel || prev.tokenSymbol,
              tokenAmount: solAmount.toString(),
              solValue: solAmount.toFixed(6),
              fiatValue:
                solAmount > 0 && solPrice
                  ? (solAmount * solPrice).toFixed(2)
                  : prev.fiatValue,
            }
          : null
      );
    },
    [solPrice]
  );

  const handleCreateCard = async () => {
    setIsCreating(true);
    try {
      const result = await apiService.createCard(
        {
          message: message || 'Gift',
          currency,
          amount_fiat: 0,
          token_mint: tokenAddress || undefined,
          expires_at:
            hasExpiry && expiryDate
              ? new Date(expiryDate).toISOString()
              : undefined,
          template_url: selectedImage,
        },
        authToken || undefined
      );

      const newCard: CardData = {
        cardId: result.public_id,
        cvv: result.cvv,
        depositAddress: result.deposit_address,
        image: selectedImage,
        tokenAddress,
        tokenSymbol: tokenSymbol || 'TOKEN',
        tokenAmount: '0',
        message: message || 'Gift',
        font,
        hasExpiry,
        expiryDate,
        created: new Date().toISOString(),
        locked: false,
        funded: false,
        fiatValue: '0.00',
        solValue: '0.000000',
        step: 2,
      };

      setCardData(newCard);
      setCardCreated(true);
      setCurrentStep(2);
      setFunded(false);
      setCardsRefreshKey((prev) => prev + 1);

      toast.success(`Card created! ID: ${newCard.cardId}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create card');
    } finally {
      setIsCreating(false);
    }
  };

  const handleLockAndShare = useCallback(async () => {
    if (!funded || !cardData) return;
    try {
      await apiService.lockCard(cardData.cardId);
      setLocked(true);
      setCurrentStep(3);
      setCardData((prev) => (prev ? { ...prev, locked: true } : null));
      toast.success('Card locked!');
      setTimeout(() => {
        setShareModalOpen(true);
      }, 100);
    } catch (error: any) {
      toast.error(error.message || 'Failed to lock card');
    }
  }, [funded, cardData]);

  const handleReset = () => {
    setCardData(null);
    setCardCreated(false);
    setFunded(false);
    setLocked(false);
    setCurrentStep(1);

    setTokenAddress('');
    setTokenSymbol('TOKEN');
    setTokenName('');
    setTokenAmount('');
    setMessage('');
    setFont('Inter');
    setHasExpiry(false);
    setExpiryDate('');

    try {
      localStorage.removeItem(BUILDER_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const handleEmailUpdate = (email: string) => {
    setAuthUser((prev) => (prev ? { ...prev, email } : null));
  };

  return (
    <div className="min-h-screen pb-12 relative">
      <AnimatedBackground />
      <SecurityBanner />
      <PriceBanner solPrice={solPrice} onRefresh={handleRefreshPrices} />

      <div className="pt-[60px] px-3 max-w-5xl mx-auto relative z-10">
        {/* Top controls */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <CurrencySelect value={currency} onChange={setCurrency} />
          <LanguageSelect value={language} onChange={setLanguage} />
        </div>

        <Header onClaimClick={() => setClaimModalOpen(true)} />
        <ProgressBar currentStep={currentStep} locked={locked} funded={funded} />

        {/* Main grid: Designer + Preview/Funding */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
          {/* Designer */}
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

          {/* Preview + Funding */}
          <div className="glass-card rounded-xl p-3 shadow-card">
            <CryptoCard
              data={cardData}
              locked={locked}
              message={message || 'Your message here'}
              image={selectedImage}
              font={font}
              tokenSymbol={cardData?.tokenSymbol || tokenSymbol}
              tokenAmount={cardData?.tokenAmount || '0'}
              solValue={cardData?.solValue || '0.000000'}
              fiatValue={cardData?.fiatValue || '0.00'}
              fiatCurrency={currency}
              hasExpiry={hasExpiry}
              expiryDate={expiryDate}
              isClaimMode={false}
            />

            {/* Instructions pill under preview */}
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-center">
              <div className="text-[10px] text-primary uppercase font-bold mb-2">
                {t('instructions.title')}
              </div>
              <div className="text-[8px] space-y-1.5">
                <p className="flex items-center justify-center gap-2">
                  <Palette className="w-3 h-3 flex-shrink-0 text-primary" />
                  <span>
                    <strong>{t('instructions.design')}</strong>{' '}
                    {t('instructions.designDesc')}
                  </span>
                </p>
                <p className="flex items-center justify-center gap-2">
                  <Gift className="w-3 h-3 flex-shrink-0 text-accent" />
                  <span>
                    <strong>{t('instructions.fund')}</strong>{' '}
                    {t('instructions.fundDesc')}
                  </span>
                </p>
                <p className="flex items-center justify-center gap-2">
                  <Lock className="w-3 h-3 flex-shrink-0 text-warning" />
                  <span>
                    <strong>{t('instructions.lock')}</strong>{' '}
                    {t('instructions.lockDesc')}
                  </span>
                </p>
                <p className="flex items-center justify-center gap-2">
                  <Share2 className="w-3 h-3 flex-shrink-0 text-secondary" />
                  <span>
                    <strong>{t('instructions.share')}</strong>{' '}
                    {t('instructions.shareDesc')}
                  </span>
                </p>
              </div>
            </div>

            {/* Funding */}
            {cardCreated && cardData && (
              <FundingPanel
                cardId={cardData.cardId}
                cvv={cardData.cvv}
                depositAddress={cardData.depositAddress}
                funded={funded}
                locked={locked}
                fundedAmount={funded ? `${cardData.solValue} SOL` : '0 SOL'}
                tokenSymbol={cardData.tokenSymbol || tokenSymbol}
                onFundingStatusChange={handleFundingStatusChange}
              />
            )}

            <Button
              onClick={handleLockAndShare}
              disabled={!funded || locked}
              className="w-full mt-2 h-8 text-[10px] font-black gradient-success text-primary-foreground disabled:opacity-50"
            >
              {locked ? t('button.cardLocked') : t('button.lockAndShare')}
            </Button>

            <div className="text-sm font-bold text-destructive text-center mt-3 p-3 bg-destructive/10 border-2 border-destructive/40 rounded-lg">
              {t('button.lockWarning')}
            </div>

            <Button
              onClick={handleReset}
              variant="destructive"
              className="w-full mt-2 h-7 text-[9px] font-bold"
            >
              {t('button.reset')}
            </Button>
          </div>
        </div>

        {/* Auth + dashboards */}
        {!authUser ? (
          <LoginPanel
            onLoginSuccess={(token, user) => {
              setAuthToken(token);
              setAuthUser(user);
            }}
          />
        ) : (
          <UserDashboard
            onLogout={() => {
              setAuthToken(null);
              setAuthUser(null);
              localStorage.removeItem('auth_token');
              localStorage.removeItem('auth_user');
            }}
            token={authToken}
            user={authUser}
            onEmailUpdate={handleEmailUpdate}
            refreshKey={cardsRefreshKey}
          />
        )}

        <AuditSection />
        <PublicDashboard />

        {/* Footer */}
        <footer className="mt-8 pt-8 border-t border-border/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Brand Section */}
            <div className="flex flex-col md:flex-row items-center md:items-start gap-3 text-center md:text-left">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 blur-[12px] bg-[radial-gradient(circle_at_center,_rgba(96,165,250,0.9),_transparent_60%)] opacity-80" />
                <img
                  src="/cryptocards-logo.png"
                  alt="CRYPTOCARDS logo"
                  className="relative w-14 h-14 md:w-16 md:h-16 rounded-full shadow-[0_0_30px_rgba(56,189,248,0.9)] ring-2 ring-[#3b82f6]/70"
                />
              </div>
              <div>
                <h4 className="text-lg font-black tracking-[0.2em] uppercase bg-gradient-to-r from-emerald-300 via-cyan-300 to-blue-400 bg-clip-text text-transparent mb-1">
                  CRYPTOCARDS
                </h4>
                <p className="text-[9px] text-muted-foreground max-w-xs">
                  On-chain, non-custodial crypto gift cards. The future of
                  digital gifting on Solana.
                </p>
              </div>
            </div>

            {/* Quick Links */}
            <div className="text-center">
              <h5 className="text-[10px] font-bold uppercase text-foreground mb-3">
                Quick Links
              </h5>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setDocsModalOpen(true)}
                  className="text-[9px] text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1"
                >
                  <FileText className="w-3 h-3" /> Documentation
                </button>
                <button
                  onClick={() => setTermsModalOpen(true)}
                  className="text-[9px] text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1"
                >
                  <Shield className="w-3 h-3" /> Terms of Service
                </button>
                <button
                  onClick={() => setPrivacyModalOpen(true)}
                  className="text-[9px] text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> Privacy Policy
                </button>
              </div>
            </div>

            {/* Social Links */}
            <div className="text-center md:text-right">
              <h5 className="text-[10px] font-bold uppercase text-foreground mb-3">
                Community
              </h5>
              <div className="flex items-center justify-center md:justify-end gap-4">
                <a
                  href="https://x.com/i/communities/2004719020248105452"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:scale-110 transition-transform p-2 rounded-lg bg-card/60 border border-border/30 hover:border-primary/50"
                >
                  <img
                    src="https://cdn.simpleicons.org/x/00CFFF"
                    alt="Twitter/X"
                    className="w-5 h-5"
                  />
                </a>
                <a
                  href="https://t.me/+7aL_9pVutjE4ZmZh"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:scale-110 transition-transform p-2 rounded-lg bg-card/60 border border-border/30 hover:border-primary/50"
                >
                  <img
                    src="https://cdn.simpleicons.org/telegram/00CFFF"
                    alt="Telegram"
                    className="w-5 h-5"
                  />
                </a>
                <button
                  onClick={() => setDiscordModalOpen(true)}
                  className="hover:scale-110 transition-transform p-2 rounded-lg bg-card/60 border border-border/30 hover:border-primary/50"
                >
                  <img
                    src="https://cdn.simpleicons.org/discord/00CFFF"
                    alt="Discord"
                    className="w-5 h-5"
                  />
                </button>
                <a
                  href="mailto:cryptocards@linuxmail.org"
                  className="hover:scale-110 transition-transform p-2 rounded-lg bg-card/60 border border-border/30 hover:border-primary/50"
                >
                  <img
                    src="https://cdn.simpleicons.org/gmail/00CFFF"
                    alt="Contact"
                    className="w-5 h-5"
                  />
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Bar – aligned grid so © line is under QUICK LINKS */}
          <div className="pt-4 border-t border-border/20 grid grid-cols-1 md:grid-cols-3 items-center gap-3">
            {/* Left: Solana badge */}
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <img
                src="https://cryptologos.cc/logos/solana-sol-logo.svg"
                alt="Solana"
                className="w-4 h-4"
              />
              <span className="text-[10px] font-bold text-primary">
                {t('footer.poweredBy')}
              </span>
            </div>

            {/* Center: copyright under QUICK LINKS */}
            <div className="flex justify-center">
              <p className="text-[9px] text-primary font-bold">
                {t('footer.copyright')}
              </p>
            </div>

            {/* Right: creator credit */}
            <div className="flex justify-center md:justify-end">
              <p className="text-[8px] text-muted-foreground">
                {t('footer.creator')}
              </p>
            </div>
          </div>
        </footer>
      </div>

      {/* Modals */}
      <ClaimModal open={claimModalOpen} onOpenChange={setClaimModalOpen} />
      {cardData && (
        <ShareModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          cardId={cardData.cardId}
        />
      )}
      <DocumentationModal
        open={docsModalOpen}
        onOpenChange={setDocsModalOpen}
      />
      <TermsModal open={termsModalOpen} onOpenChange={setTermsModalOpen} />
      <PrivacyModal
        open={privacyModalOpen}
        onOpenChange={setPrivacyModalOpen}
      />
      <DiscordModal
        open={discordModalOpen}
        onOpenChange={setDiscordModalOpen}
      />

      {/* Dev panel (unchanged) */}
      <DevPanel
        onSimulateCardCreated={(id, amount, symbol) => {
          setCardData({
            cardId: id,
            cvv: '12345',
            depositAddress: 'Demo123...xyz',
            image: selectedImage,
            tokenAddress,
            tokenSymbol: symbol,
            tokenAmount: amount,
            message,
            font,
            hasExpiry,
            expiryDate,
            created: new Date().toISOString(),
            locked: false,
            funded: false,
            fiatValue: '50.00',
            solValue: '0.333300',
            step: 2,
          });
          setCardCreated(true);
          setCurrentStep(2);
          setTokenSymbol(symbol);
          setTokenAmount(amount);
        }}
        onSimulateFunded={() => {
          setFunded(true);
          setCardData((prev) =>
            prev
              ? {
                  ...prev,
                  funded: true,
                  tokenAmount: '1000',
                  fiatValue: '50.00',
                  solValue: '0.333300',
                }
              : null
          );
        }}
        onSimulateLocked={() => {
          setLocked(true);
          setCurrentStep(3);
          setCardData((prev) =>
            prev ? { ...prev, locked: true } : null
          );
        }}
        onResetAll={handleReset}
      />
    </div>
  );
}
