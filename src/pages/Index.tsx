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
import { TermsModal } from '@/components/TermsModal';
import { ShareModal } from '@/components/ShareModal';
import { PrivacyModal } from '@/components/PrivacyModal';
import { DiscordModal } from '@/components/DiscordModal';
import { DocumentationModal } from '@/components/DocumentationModal';
import { DevPanel } from '@/components/DevPanel';
import { useLanguage } from '@/lib/languageStore';
import { translations } from '@/lib/translations';
import { useToast } from '@/components/ui/use-toast';
import {
  Shield,
  ArrowDownToLine,
  ExternalLink,
  Copy,
  FileText,
  RefreshCw,
  Bug,
} from 'lucide-react';

type CardTier = 'basic' | 'premium' | 'ultimate';

type LinkedCard = {
  id: string;
  txHash: string;
  amountSol: number;
  amountFiat: number;
  currencySymbol: string;
  status: 'pending' | 'confirmed' | 'claimed' | 'refunded';
  createdAt: string;
};

type PriceOption = {
  value: number;
  label: string;
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

type FontFamily =
  | 'Inter'
  | 'Space Grotesk'
  | 'DM Sans'
  | 'Sora'
  | 'Unbounded'
  | 'Chakra Petch'
  | 'Turret Road';

type CardData = {
  cardId: string;
  cvv: string;
  depositAddress: string;
  image: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenAmount: string;
  message: string;
  font: FontFamily;
  hasExpiry: boolean;
  expiryDate: string;
  created: string;
  locked: boolean;
  funded: boolean;
  fiatValue: string;
  solValue: number;
};

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
  fiatValue: string;
  solValue: number;
}

const DEBUG_API = false;
const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || 'https://crypto-cards-backend.onrender.com';

const decodeApiMessage = (message: string | string[] | undefined) => {
  if (!message) return undefined;
  if (Array.isArray(message)) return message.join(' ');
  try {
    return decodeURIComponent(message as string);
  } catch {
    return typeof message === 'string' ? message : undefined;
  }
};

const BUILDER_STATE_KEY = 'cryptocards_builder_state_v1';

export default function Index() {
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();

  const [selectedTier, setSelectedTier] = useState<CardTier>('basic');
  const [selectedPrice, setSelectedPrice] = useState<number>(5);
  const [customPriceEnabled, setCustomPriceEnabled] = useState(false);
  const [customPrice, setCustomPrice] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [fundingAmount, setFundingAmount] = useState(0);
  const [fundingProgress, setFundingProgress] = useState(0);
  const [giftMessage, setGiftMessage] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('USD');
  const [isFiatMode, setIsFiatMode] = useState(true);
  const [linkedCards, setLinkedCards] = useState<LinkedCard[]>([]);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [termsStep, setTermsStep] = useState<'wallet' | 'terms'>('wallet');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareTxHash, setShareTxHash] = useState('');
  const [shareAmountDetails, setShareAmountDetails] = useState<{
    amountSol: number;
    amountFiat: number;
    currencySymbol: string;
  } | null>(null);
  const [isLoadingLinkedCards, setIsLoadingLinkedCards] = useState(false);
  const [linkedCardsError, setLinkedCardsError] = useState<string | null>(null);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [discordModalOpen, setDiscordModalOpen] = useState(false);
  const [docsModalOpen, setDocsModalOpen] = useState(false);
  const [claimModalOpen, setClaimModalOpen] = useState(false);

  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<{ id: string; username: string; email?: string } | null>(
    null
  );

  const [cardsRefreshKey, setCardsRefreshKey] = useState(0);

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
  const [fiatValue, setFiatValue] = useState('50.00');
  const [solValue, setSolValue] = useState(0.5);

  const [devPanelOpen, setDevPanelOpen] = useState(false);

  // Hydrate auth from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    if (storedToken && storedUser) {
      setAuthToken(storedToken);
      try {
        setAuthUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }
  }, []);

  // Restore builder state from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(BUILDER_STATE_KEY);
      if (!stored) return;

      const parsed: StoredBuilderState = JSON.parse(stored);

      setCardData(parsed.cardData);
      setCardCreated(parsed.cardCreated);
      setFunded(parsed.funded);
      setLocked(parsed.locked);
      setCurrentStep(parsed.currentStep);
      setTokenAddress(parsed.tokenAddress);
      setTokenSymbol(parsed.tokenSymbol);
      setTokenName(parsed.tokenName);
      setTokenAmount(parsed.tokenAmount);
      setMessage(parsed.message);
      setFont(parsed.font);
      setHasExpiry(parsed.hasExpiry);
      setExpiryDate(parsed.expiryDate);
      setSelectedImage(parsed.selectedImage);
      setFiatValue(parsed.fiatValue);
      setSolValue(parsed.solValue);
    } catch (error) {
      console.error('Failed to restore builder state:', error);
    }
  }, []);

  // Persist builder state
  useEffect(() => {
    const state: StoredBuilderState = {
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
      fiatValue,
      solValue,
    };

    try {
      localStorage.setItem(BUILDER_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to persist builder state:', error);
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
    fiatValue,
    solValue,
  ]);

  // Update language based on URL hash
  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace('#', ''));

    const langParam = params.get('lang');
    if (langParam && langParam in translations) {
      setLanguage(langParam as keyof typeof translations);
    }
  }, [setLanguage]);

  // Handle URL messages (from backend / Supabase redirects)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const messageParam = params.get('message');
    const errorParam = params.get('error');

    if (messageParam) {
      const decoded = decodeApiMessage(messageParam);
      if (decoded) {
        toast({
          title: t('toasts.successTitle'),
          description: decoded,
        });
      }
    }

    if (errorParam) {
      const decoded = decodeApiMessage(errorParam);
      if (decoded) {
        toast({
          variant: 'destructive',
          title: t('toasts.errorTitle'),
          description: decoded,
        });
      }
    }
  }, [language, t, toast]);

  const tierPriceOptions: Record<CardTier, PriceOption[]> = {
    basic: [
      { value: 5, label: '5' },
      { value: 10, label: '10' },
      { value: 25, label: '25' },
      { value: 50, label: '50' },
    ],
    premium: [
      { value: 50, label: '50' },
      { value: 100, label: '100' },
      { value: 250, label: '250' },
      { value: 500, label: '500' },
    ],
    ultimate: [
      { value: 500, label: '500' },
      { value: 1000, label: '1K' },
      { value: 2500, label: '2.5K' },
      { value: 5000, label: '5K' },
    ],
  };

  const handleTierChange = (tier: CardTier) => {
    setSelectedTier(tier);
    setCustomPriceEnabled(false);
    setCustomPrice('');
    const defaultPrice = tierPriceOptions[tier][0]?.value ?? 5;
    setSelectedPrice(defaultPrice);
  };

  const handlePriceSelect = (price: number) => {
    setSelectedPrice(price);
    setCustomPriceEnabled(false);
    setCustomPrice('');
  };

  const handleCustomPriceToggle = () => {
    setCustomPriceEnabled(!customPriceEnabled);
    if (!customPriceEnabled) {
      setCustomPrice('');
    } else {
      const defaultPrice = tierPriceOptions[selectedTier][0]?.value ?? 5;
      setSelectedPrice(defaultPrice);
    }
  };

  const handleCustomPriceChange = (value: string) => {
    const sanitized = value.replace(',', '.').replace(/[^0-9.]/g, '');
    setCustomPrice(sanitized);

    const parsed = parseFloat(sanitized);
    if (!isNaN(parsed) && parsed > 0) {
      setSelectedPrice(parsed);
    }
  };

  const handleFundingChange = (solAmount: number, fiatAmount: number, currencySymbol: string) => {
    setFundingAmount(solAmount);

    const targetAmountSol = 1;
    const progress = Math.min((solAmount / targetAmountSol) * 100, 100);
    setFundingProgress(progress);

    setShareAmountDetails({
      amountSol: solAmount,
      amountFiat: fiatAmount,
      currencySymbol,
    });
  };

  const handleGiftMessageChange = (message: string) => {
    setGiftMessage(message);
  };

  const handleError = (error: Error, context: string) => {
    console.error(`Error in ${context}:`, error);
    toast({
      variant: 'destructive',
      title: t('toasts.errorTitle'),
      description: t('toasts.genericError'),
    });
  };

  const fetchLinkedCards = useCallback(
    async (description?: string) => {
      if (!authToken) return;

      setIsLoadingLinkedCards(true);
      setLinkedCardsError(null);

      try {
        const params = description ? `?description=${encodeURIComponent(description)}` : '';
        const response = await fetch(`${BACKEND_URL}/api/cards/linked${params}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          let errorMessage = t('toasts.failedFetchCards');

          try {
            const data = await response.json();
            const backendError = decodeApiMessage(
              data.error || data.message || data.details || data.description
            );
            if (backendError) {
              errorMessage = backendError;
            }
          } catch (jsonError) {
            console.error('Error parsing linked cards error response:', jsonError);
          }

          throw new Error(errorMessage);
        }

        const data: ApiResponse<LinkedCard[]> = await response.json();

        if (!data.success || !data.data) {
          const backendError = decodeApiMessage(data.error || data.data);
          if (backendError) {
            throw new Error(backendError);
          } else {
            throw new Error(t('toasts.failedFetchCards'));
          }
        }

        setLinkedCards(data.data);
      } catch (error) {
        console.error('Error fetching linked cards:', error);
        const errorMessage =
          error instanceof Error ? error.message : t('toasts.failedFetchCards');
        setLinkedCardsError(errorMessage);
        toast({
          variant: 'destructive',
          title: t('toasts.errorTitle'),
          description: errorMessage,
        });
      } finally {
        setIsLoadingLinkedCards(false);
      }
    },
    [authToken, t, toast]
  );

  useEffect(() => {
    if (!authToken) return;
    fetchLinkedCards();
  }, [authToken, fetchLinkedCards]);

  useEffect(() => {
    if (!authToken || !authUser) return;

    const interval = setInterval(() => {
      fetchLinkedCards();
    }, 5000);

    return () => clearInterval(interval);
  }, [authToken, authUser, fetchLinkedCards]);

  const handleShareCard = useCallback(
    async (formData: {
      claimCode: string;
      txHash: string;
      amountSol: number;
      amountFiat: number;
      currencySymbol: string;
    }) => {
      try {
        const shareLink = `${window.location.origin}/claim/${encodeURIComponent(
          formData.claimCode
        )}`;
        setShareUrl(shareLink);
        setShareTxHash(formData.txHash);
        setShareAmountDetails({
          amountSol: formData.amountSol,
          amountFiat: formData.amountFiat,
          currencySymbol: formData.currencySymbol,
        });
        setShareModalOpen(true);
      } catch (error) {
        handleError(error as Error, 'handleShareCard');
      }
    },
    []
  );

  const handleAuthSuccess = useCallback(
    (data: { token: string; user: { id: string; username: string; email?: string } }) => {
      setAuthToken(data.token);
      setAuthUser(data.user);
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));

      toast({
        title: t('toasts.loginSuccessTitle'),
        description: t('toasts.loginSuccessDescription'),
      });

      setCardsRefreshKey((prev) => prev + 1);
      fetchLinkedCards();
    },
    [fetchLinkedCards, t, toast]
  );

  const handleLogout = useCallback(() => {
    setAuthToken(null);
    setAuthUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');

    toast({
      title: t('toasts.logoutSuccessTitle'),
      description: t('toasts.logoutSuccessDescription'),
    });

    setLinkedCards([]);
  }, [t, toast]);

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);

      toast({
        title: t('toasts.linkCopiedTitle'),
        description: t('toasts.linkCopiedDescription'),
      });
    } catch (error) {
      handleError(error as Error, 'handleCopyShareLink');
    }
  };

  const handleViewTerms = () => {
    setTermsStep('wallet');
    setTermsModalOpen(true);
  };

  const handleViewPrivacy = () => {
    setPrivacyModalOpen(true);
  };

  const handleOpenDiscord = () => {
    setDiscordModalOpen(true);
  };

  const handleViewAudit = () => {
    const auditSection = document.getElementById('audit-section');
    if (auditSection) {
      auditSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleToggleMode = () => {
    setIsFiatMode((prev) => !prev);
  };

  const handleCardSent = () => {
    setIsSending(true);
  };

  const handleCardSentCompleted = () => {
    setIsSending(false);
  };

  const getTierLabel = (tier: CardTier) => {
    switch (tier) {
      case 'basic':
        return t('tiers.basic');
      case 'premium':
        return t('tiers.premium');
      case 'ultimate':
        return t('tiers.ultimate');
      default:
        return tier;
    }
  };

  const renderTierBadge = (tier: CardTier) => {
    const isSelected = tier === selectedTier;

    const baseClasses =
      'inline-flex items-center gap-2 rounded-full border px-3 py-1 transition-all text-xs font-medium cursor-pointer';

    const variantClasses = isSelected
      ? 'bg-gradient-to-r from-[#22c55e]/20 via-[#0ea5e9]/20 to-[#6366f1]/20 border-[#22c55e]/60 text-foreground shadow-[0_0_12px_rgba(34,197,94,0.5)]'
      : 'bg-card/60 border-border/50 text-muted-foreground hover:border-primary/60 hover:text-foreground';

    const iconBg = isSelected
      ? 'bg-[#22c55e]/10 border-[#22c55e]/60 shadow-[0_0_10px_rgba(34,197,94,0.6)]'
      : 'bg-background/60 border-border/50';

    const iconColor = isSelected ? 'text-[#22c55e]' : 'text-muted-foreground';

    return (
      <button
        key={tier}
        onClick={() => handleTierChange(tier)}
        className={`${baseClasses} ${variantClasses}`}
      >
        <span
          className={`inline-flex items-center justify-center rounded-full border w-5 h-5 text-[10px] ${iconBg} ${iconColor}`}
        >
          {tier === 'basic' ? 'B' : tier === 'premium' ? 'P' : 'U'}
        </span>
        <span>{getTierLabel(tier)}</span>
      </button>
    );
  };

  const renderPriceButton = (option: PriceOption) => {
    const isSelected = !customPriceEnabled && selectedPrice === option.value;

    const baseClasses =
      'relative inline-flex items-center justify-center px-3 py-2 rounded-full text-xs font-semibold border cursor-pointer transition-all';

    const variantClasses = isSelected
      ? 'bg-gradient-to-r from-[#22c55e]/10 via-[#0ea5e9]/10 to-[#6366f1]/10 border-[#22c55e]/60 text-foreground shadow-[0_0_10px_rgba(34,197,94,0.6)]'
      : 'bg-card/60 border-border/50 text-muted-foreground hover:border-primary/60 hover:text-foreground';

    const glowClass = isSelected
      ? 'absolute inset-0 -z-10 rounded-full bg-[radial-gradient(circle_at_center,_rgba(34,197,94,0.35),_transparent_70%)] blur-md opacity-80'
      : '';

    return (
      <button
        key={option.value}
        onClick={() => handlePriceSelect(option.value)}
        className={`${baseClasses} ${variantClasses}`}
      >
        {glowClass && <div className={glowClass} />}
        <span>
          {isFiatMode ? `${selectedCurrency} ${option.label}` : `${option.label} ${t('sol')}`}
        </span>
      </button>
    );
  };

  const renderCustomPriceInput = () => {
    const isActive = customPriceEnabled;
    const baseClasses =
      'relative flex items-center gap-2 px-3 py-2 rounded-full border text-xs font-semibold transition-all';
    const variantClasses = isActive
      ? 'bg-gradient-to-r from-[#22c55e]/10 via-[#0ea5e9]/10 to-[#6366f1]/10 border-[#22c55e]/60 text-foreground shadow-[0_0_10px_rgba(34,197,94,0.6)]'
      : 'bg-card/60 border-border/50 text-muted-foreground hover:border-primary/60 hover:text-foreground';

    const glowClass = isActive
      ? 'absolute inset-0 -z-10 rounded-full bg-[radial-gradient(circle_at_center,_rgba(34,197,94,0.35),_transparent_70%)] blur-md opacity-80'
      : '';

    return (
      <button
        type="button"
        onClick={handleCustomPriceToggle}
        className={`${baseClasses} ${variantClasses}`}
      >
        {glowClass && <div className={glowClass} />}
        <span className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center rounded-full border w-5 h-5 text-[10px] bg-background/60 border-border/50">
            +
          </span>
          <span>{t('customAmount')}</span>
        </span>
        {isActive && (
          <input
            type="number"
            inputMode="decimal"
            placeholder="0.00"
            value={customPrice}
            onChange={(e) => handleCustomPriceChange(e.target.value)}
            className="bg-transparent border-none text-xs w-16 focus:outline-none focus:ring-0"
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </button>
    );
  };

  const renderTierDescription = () => {
    const label = getTierLabel(selectedTier);
    const relativeValue =
      selectedTier === 'basic'
        ? t('tiers.relative.basic')
        : selectedTier === 'premium'
        ? t('tiers.relative.premium')
        : t('tiers.relative.ultimate');

    const description = t('tiers.description')
      .replace('{tier}', label as any)
      .replace('{relativeValue}', relativeValue as any);

    return description;
  };

  const handleCardDesignerError = (error: Error) => {
    handleError(error, 'CardDesigner');
  };

  const handleFundingPanelError = (error: Error) => {
    handleError(error, 'FundingPanel');
  };

  const handleAuditError = (error: Error) => {
    handleError(error, 'AuditSection');
  };

  const handleUserDashboardError = (error: Error) => {
    handleError(error, 'UserDashboard');
  };

  const handlePublicDashboardError = (error: Error) => {
    handleError(error, 'PublicDashboard');
  };

  const handleToggleLanguageFromHeader = () => {
    const languages = Object.keys(translations) as (keyof typeof translations)[];
    const currentIndex = languages.indexOf(language);
    const nextIndex = (currentIndex + 1) % languages.length;
    setLanguage(languages[nextIndex]);
  };

  const handleCopyAddress = (address: string) => {
    navigator.clipboard
      .writeText(address)
      .then(() => {
        toast({
          title: t('toasts.addressCopiedTitle'),
          description: t('toasts.addressCopiedDescription'),
        });
      })
      .catch(() => {
        toast({
          variant: 'destructive',
          title: t('toasts.errorTitle'),
          description: t('toasts.addressCopyFailed'),
        });
      });
  };

  const handleToggleAccountPanel = () => {
    const panel = document.getElementById('account-section');
    if (panel) {
      panel.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleFiatModeChange = (mode: boolean) => {
    setIsFiatMode(mode);
  };

  const handleCurrencyChange = (currency: string) => {
    setSelectedCurrency(currency);
  };

  const handleResetDesigner = () => {
    setGiftMessage('');
    setFundingAmount(0);
    setFundingProgress(0);
    setShareAmountDetails(null);
  };

  const handleToggleFundingMode = () => {
    setIsFiatMode((prev) => !prev);
  };

  const handleCardLinkUpdated = () => {
    fetchLinkedCards();
  };

  const handleReset = () => {
    setSelectedTier('basic');
    setSelectedPrice(5);
    setCustomPriceEnabled(false);
    setCustomPrice('');
    setIsSending(false);
    setFundingAmount(0);
    setFundingProgress(0);
    setGiftMessage('');
    setSelectedCurrency('USD');
    setIsFiatMode(true);
    setLinkedCards([]);
    setTermsModalOpen(false);
    setTermsStep('wallet');
    setShareModalOpen(false);
    setShareUrl('');
    setShareTxHash('');
    setShareAmountDetails(null);
    setIsLoadingLinkedCards(false);
    setLinkedCardsError(null);
    setPrivacyModalOpen(false);
    setDiscordModalOpen(false);
    setDocsModalOpen(false);
    setClaimModalOpen(false);
    setAuthToken(null);
    setAuthUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setCardsRefreshKey((prev) => prev + 1);

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
    setSelectedImage(
      'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=300&h=190&fit=crop'
    );
    setFiatValue('50.00');
    setSolValue(0.5);
  };

  const heroGradient =
    'bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.22),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.2),_transparent_60%)]';

  const handleDevPanelToggle = () => setDevPanelOpen((prev) => !prev);

  const handleSimulateCardCreated = (
    id: string,
    amount: string,
    symbol: string,
    imageUrl: string
  ) => {
    setCardCreated(true);
    setCurrentStep(2);
    setCardData({
      cardId: id,
      cvv: '12345',
      depositAddress: 'Demo123...xyz',
      image: imageUrl,
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
      fiatValue,
      solValue,
    });
  };

  const handleSimulateFunding = (
    isFunded: boolean,
    fiat: string,
    sol: number,
    tokenSymbolF: string
  ) => {
    setFunded(isFunded);
    setCardData((prev) =>
      prev
        ? {
            ...prev,
            funded: isFunded,
            tokenSymbol: tokenSymbolF,
            fiatValue: fiat,
            solValue: sol,
          }
        : null
    );
  };

  const handleSimulateLocked = () => {
    setLocked(true);
    setCurrentStep(3);
    setCardData((prev) => (prev ? { ...prev, locked: true } : null));
  };

  const handleOpenClaimModal = () => {
    setClaimModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <AnimatedBackground />

      <SecurityBanner onViewAudit={handleViewAudit} onViewTerms={handleViewTerms} />

      <PriceBanner
        selectedCurrency={selectedCurrency}
        isFiatMode={isFiatMode}
        onCurrencyChange={handleCurrencyChange}
        onModeChange={handleFiatModeChange}
        onCopyAddress={handleCopyAddress}
        onViewTerms={handleViewTerms}
      />

      <Header
        language={language}
        onToggleLanguage={handleToggleLanguageFromHeader}
        onToggleAccountPanel={handleToggleAccountPanel}
        onViewAudit={handleViewAudit}
        onViewTerms={handleViewTerms}
        onViewPrivacy={handleViewPrivacy}
        onOpenDiscord={handleOpenDiscord}
      />

      <main className="relative z-10">
        {/* Hero + Builder */}
        <section
          className={`pt-10 pb-10 md:py-14 lg:py-16 px-4 md:px-8 max-w-6xl mx-auto ${heroGradient}`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-8 lg:gap-10 items-center">
            <div className="space-y-6 md:space-y-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-card/60 px-3 py-1 text-[10px] md:text-xs font-medium text-muted-foreground shadow-[0_0_15px_rgba(56,189,248,0.25)] backdrop-blur-sm">
                <span className="inline-flex h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                <span className="uppercase tracking-[0.14em] text-[9px] md:text-[10px] text-emerald-100">
                  {t('hero.liveOnSolana')}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 border border-border/60 text-[9px] md:text-[10px] text-muted-foreground">
                  <Shield className="w-2.5 h-2.5 text-emerald-300" />
                  {t('hero.nonCustodial')}
                </span>
              </div>

              <div className="space-y-3 md:space-y-4">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.2rem] font-black tracking-tight leading-[1.1]">
                  <span className="block text-foreground mb-1 md:mb-2">
                    {t('hero.titleLine1')}
                  </span>
                  <span className="block bg-gradient-to-r from-emerald-300 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                    {t('hero.titleLine2')}
                  </span>
                </h1>

                <p className="text-xs sm:text-sm md:text-base text-muted-foreground max-w-xl">
                  {t('hero.subtitle')}
                </p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-2xl border border-primary/40 bg-card/80 px-3 py-2 shadow-[0_0_35px_rgba(56,189,248,0.45)] backdrop-blur-sm">
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.45),_transparent_75%)] blur-lg opacity-80" />
                  <div className="relative flex items-center gap-1 rounded-xl bg-background/80 px-2 py-1 border border-border/60 shadow-[0_0_18px_rgba(56,189,248,0.6)]">
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)]" />
                    <span className="text-[10px] font-semibold text-foreground uppercase tracking-[0.16em]">
                      {t('badge.onChain')}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-1 text-[10px] text-muted-foreground">
                  <span>{t('badge.noKyc')}</span>
                  <span className="hidden sm:inline text-primary/50">•</span>
                  <span>{t('badge.instantClaim')}</span>
                  <span className="hidden sm:inline text-primary/50">•</span>
                  <span>{t('badge.gasOptimized')}</span>
                </div>
              </div>

              <div className="space-y-3 md:space-y-4">
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <Button
                    size="lg"
                    className="inline-flex items-center justify-center gap-2 rounded-full px-5 md:px-7 py-2.5 md:py-3 text-xs md:text-sm font-semibold bg-gradient-to-r from-emerald-400 via-sky-400 to-indigo-400 text-slate-900 shadow-[0_18px_35px_rgba(15,23,42,0.75)] hover:shadow-[0_22px_45px_rgba(15,23,42,0.9)] hover:from-emerald-300 hover:via-sky-300 hover:to-indigo-300 border border-emerald-300/70"
                    onClick={handleToggleAccountPanel}
                  >
                    <span>{t('hero.primaryCta')}</span>
                    <ArrowDownToLine className="w-4 h-4" />
                  </Button>

                  <Button
                    size="lg"
                    variant="outline"
                    className="inline-flex items-center justify-center gap-2 rounded-full px-5 md:px-7 py-2.5 md:py-3 text-xs md:text-sm font-semibold border-primary/40 bg-background/60 text-primary shadow-[0_10px_25px_rgba(15,23,42,0.8)] hover:bg-background/80"
                    onClick={handleViewAudit}
                  >
                    <Shield className="w-4 h-4" />
                    <span>{t('hero.secondaryCta')}</span>
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-3 md:gap-4 text-[10px] md:text-xs text-muted-foreground">
                  <div className="inline-flex items-center gap-1.5">
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.85)]" />
                    <span>{t('hero.feature1')}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5">
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.85)]" />
                    <span>{t('hero.feature2')}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5">
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.85)]" />
                    <span>{t('hero.feature3')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Builder preview */}
            <div className="relative">
              <div className="absolute -inset-4 bg-[radial-gradient(circle_at_top,_rgba(34,197,94,0.22),_transparent_60%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.2),_transparent_60%)] opacity-80 blur-xl" />

              <div className="relative flex flex-col gap-4">
                <CardDesigner
                  selectedTier={selectedTier}
                  selectedPrice={selectedPrice}
                  isFiatMode={isFiatMode}
                  selectedCurrency={selectedCurrency}
                  giftMessage={giftMessage}
                  onGiftMessageChange={handleGiftMessageChange}
                  onError={handleCardDesignerError}
                  onReset={handleResetDesigner}
                  onToggleMode={handleToggleFundingMode}
                  cardCreated={cardCreated}
                  funded={funded}
                  locked={locked}
                  currentStep={currentStep}
                  tokenAddress={tokenAddress}
                  tokenSymbol={tokenSymbol}
                  tokenName={tokenName}
                  tokenAmount={tokenAmount}
                  message={message}
                  font={font}
                  hasExpiry={hasExpiry}
                  expiryDate={expiryDate}
                  selectedImage={selectedImage}
                  fiatValue={fiatValue}
                  solValue={solValue}
                  setTokenAddress={setTokenAddress}
                  setTokenSymbol={setTokenSymbol}
                  setTokenName={setTokenName}
                  setTokenAmount={setTokenAmount}
                  setMessage={setMessage}
                  setFont={setFont}
                  setHasExpiry={setHasExpiry}
                  setExpiryDate={setExpiryDate}
                  setSelectedImage={setSelectedImage}
                  setFiatValue={setFiatValue}
                  setSolValue={setSolValue}
                  onOpenClaimModal={handleOpenClaimModal}
                />

                <CryptoCard
                  selectedTier={selectedTier}
                  selectedPrice={selectedPrice}
                  isFiatMode={isFiatMode}
                  selectedCurrency={selectedCurrency}
                  giftMessage={giftMessage}
                  onError={handleCardDesignerError}
                  cardData={cardData}
                  cardCreated={cardCreated}
                  funded={funded}
                  locked={locked}
                  currentStep={currentStep}
                  tokenAddress={tokenAddress}
                  tokenSymbol={tokenSymbol}
                  tokenName={tokenName}
                  tokenAmount={tokenAmount}
                  message={message}
                  font={font}
                  hasExpiry={hasExpiry}
                  expiryDate={expiryDate}
                  selectedImage={selectedImage}
                  fiatValue={fiatValue}
                  solValue={solValue}
                />
              </div>
            </div>
          </div>

          <ProgressBar progress={fundingProgress} />
        </section>

        {/* Tiers & Funding */}
        <section className="py-8 md:py-10 lg:py-12 px-4 md:px-8 max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-8 lg:gap-10">
            <div className="space-y-4 md:space-y-5">
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <span className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200 bg-emerald-500/10 border border-emerald-400/40 rounded-full px-2.5 py-1 inline-flex items-center gap-1">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                  {t('tiers.badge')}
                </span>
                <span className="hidden sm:inline text-[10px] md:text-xs text-muted-foreground">
                  {t('tiers.subheading')}
                </span>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl md:text-[1.6rem] font-bold tracking-tight text-foreground">
                  {t('tiers.title')}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
                  {t('tiers.descriptionLead')}
                </p>
              </div>

              <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-md p-3 md:p-4 shadow-[0_18px_55px_rgba(15,23,42,0.85)]">
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-border/40">
                  <div className="flex flex-wrap items-center gap-2">
                    {renderTierBadge('basic')}
                    {renderTierBadge('premium')}
                    {renderTierBadge('ultimate')}
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[10px] text-muted-foreground">
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {t('tiers.nonCustodialTag')}
                  </div>
                </div>

                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {tierPriceOptions[selectedTier].map(renderPriceButton)}
                    {renderCustomPriceInput()}
                  </div>
                  <div className="text-[10px] text-muted-foreground max-w-[180px] md:max-w-[220px]">
                    {renderTierDescription()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 text-[10px] md:text-xs">
                <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md p-3 shadow-[0_16px_40px_rgba(15,23,42,0.9)]">
                  <h3 className="font-semibold text-foreground mb-1.5">
                    {t('benefits.onChainTitle')}
                  </h3>
                  <p className="text-muted-foreground mb-2">{t('benefits.onChainDescription')}</p>
                  <div className="inline-flex items-center gap-1 text-[9px] text-emerald-300">
                    <Shield className="w-3 h-3" />
                    {t('benefits.onChainDetail')}
                  </div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md p-3 shadow-[0_16px_40px_rgba(15,23,42,0.9)]">
                  <h3 className="font-semibold text-foreground mb-1.5">
                    {t('benefits.giftTitle')}
                  </h3>
                  <p className="text-muted-foreground mb-2">{t('benefits.giftDescription')}</p>
                  <div className="inline-flex items-center gap-1 text-[9px] text-sky-300">
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-sky-400" />
                    {t('benefits.giftDetail')}
                  </div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md p-3 shadow-[0_16px_40px_rgba(15,23,42,0.9)]">
                  <h3 className="font-semibold text-foreground mb-1.5">
                    {t('benefits.controlTitle')}
                  </h3>
                  <p className="text-muted-foreground mb-2">{t('benefits.controlDescription')}</p>
                  <div className="inline-flex items-center gap-1 text-[9px] text-indigo-300">
                    <span className="inline-flex h-1.5 w-1.5 rounded-full bg-indigo-400" />
                    {t('benefits.controlDetail')}
                  </div>
                </div>
              </div>
            </div>

            {/* Funding + How it works */}
            <div className="space-y-4 md:space-y-5">
              <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md shadow-[0_20px_60px_rgba(15,23,42,0.95)] overflow-hidden">
                <FundingPanel
                  selectedTier={selectedTier}
                  selectedPrice={selectedPrice}
                  isFiatMode={isFiatMode}
                  selectedCurrency={selectedCurrency}
                  fundingAmount={fundingAmount}
                  onFundingChange={handleFundingChange}
                  onCardSent={handleCardSent}
                  onCardSentCompleted={handleCardSentCompleted}
                  onShareCard={handleShareCard}
                  onError={handleFundingPanelError}
                  isSending={isSending}
                  cardCreated={cardCreated}
                  funded={funded}
                  locked={locked}
                  currentStep={currentStep}
                  tokenAddress={tokenAddress}
                  tokenSymbol={tokenSymbol}
                  tokenName={tokenName}
                  tokenAmount={tokenAmount}
                  message={message}
                  font={font}
                  hasExpiry={hasExpiry}
                  expiryDate={expiryDate}
                  selectedImage={selectedImage}
                  fiatValue={fiatValue}
                  solValue={solValue}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-[10px] md:text-xs">
                <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md p-3 shadow-[0_18px_45px_rgba(15,23,42,0.9)]">
                  <h3 className="font-semibold text-foreground mb-1.5">
                    {t('howItWorks.title')}
                  </h3>
                  <ul className="space-y-1.5 text-muted-foreground">
                    <li>{t('howItWorks.step1')}</li>
                    <li>{t('howItWorks.step2')}</li>
                    <li>{t('howItWorks.step3')}</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md p-3 shadow-[0_18px_45px_rgba(15,23,42,0.9)]">
                  <h3 className="font-semibold text-foreground mb-1.5">
                    {t('disclaimer.title')}
                  </h3>
                  <p className="text-muted-foreground mb-1.5">{t('disclaimer.text')}</p>
                  <Button
                    variant="link"
                    className="px-0 h-auto text-[10px] text-emerald-300 hover:text-emerald-200"
                    onClick={handleViewTerms}
                  >
                    {t('disclaimer.cta')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Account + dashboards */}
        <section
          id="account-section"
          className="py-8 md:py-10 lg:py-12 px-4 md:px-8 max-w-6xl mx-auto"
        >
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-8 lg:gap-10 items-start">
            <div className="space-y-4 md:space-y-5">
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <span className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.18em] text-sky-200 bg-sky-500/10 border border-sky-400/40 rounded-full px-2.5 py-1 inline-flex items-center gap-1">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
                  {t('account.badge')}
                </span>
                <span className="hidden sm:inline text-[10px] md:text-xs text-muted-foreground">
                  {t('account.subheading')}
                </span>
              </div>

              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl md:text-[1.6rem] font-bold tracking-tight text-foreground">
                  {t('account.title')}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
                  {t('account.description')}
                </p>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md shadow-[0_22px_65px_rgba(15,23,42,0.95)] p-3 md:p-4">
                <LoginPanel onAuthSuccess={handleAuthSuccess} onError={handleError} />
              </div>

              {authUser && (
                <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md shadow-[0_18px_55px_rgba(15,23,42,0.9)] p-3 md:p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-semibold text-foreground">
                        {t('account.loggedInAs')}{' '}
                        <span className="text-sky-300">@{authUser.username}</span>
                      </p>
                      {authUser.email && (
                        <p className="text-[10px] text-muted-foreground break-all">
                          {t('account.email')}: {authUser.email}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 text-[11px] rounded-full border-border/70 bg-background/60"
                      onClick={handleLogout}
                    >
                      {t('account.logout')}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {t('account.linkedCardsHint')}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-6 h-6 rounded-full border border-border/50 bg-card/50"
                  onClick={handleDevPanelToggle}
                >
                  <Bug className="w-3 h-3" />
                </Button>
                <span>{t('devPanel.hint')}</span>
              </div>
            </div>

            <div className="space-y-4 md:space-y-5 w-full">
              <UserDashboard
                key={cardsRefreshKey}
                authToken={authToken}
                onError={handleUserDashboardError}
                onShareCard={handleShareCard}
                onCardLinkUpdated={handleCardLinkUpdated}
              />

              <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md shadow-[0_18px_55px_rgba(15,23,42,0.9)] p-3 md:p-4">
                <PublicDashboard onError={handlePublicDashboardError} />
              </div>
            </div>
          </div>
        </section>

        {/* Audit */}
        <section
          id="audit-section"
          className="py-8 md:py-10 lg:py-12 px-4 md:px-8 max-w-6xl mx-auto"
        >
          <AuditSection onError={handleAuditError} />
        </section>

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
                  className="relative w-14 h-14 md:w-16 md:h-16 rounded-2xl shadow-[0_0_30px_rgba(56,189,248,0.9)] ring-2 ring-[#3b82f6]/70"
                />
              </div>
              {/* text nudged right with md:ml-2 */}
              <div className="md:ml-2">
                <h4 className="text-lg font-black tracking-[0.2em] bg-gradient-to-r from-emerald-300 via-cyan-300 to-blue-400 bg-clip-text text-transparent mb-1">
                  CRYPTOCARDS
                </h4>
                <p className="text-[9px] text-muted-foreground max-w-xs">
                  On-chain, non-custodial crypto gift cards. The future of digital gifting on
                  Solana.
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
                  onClick={handleViewAudit}
                  className="text-[9px] text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1"
                >
                  <Shield className="w-3 h-3" /> {t('footer.viewAudit')}
                </button>
                <button
                  onClick={handleViewTerms}
                  className="text-[9px] text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> {t('footer.termsOfUse')}
                </button>
                <button
                  onClick={handleViewPrivacy}
                  className="text-[9px] text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" /> Privacy Policy
                </button>
              </div>
            </div>

            {/* Social Links */}
            <div className="text-center md:text-right">
              <h5 className="text-[10px] font-bold uppercase text-foreground mb-3">Community</h5>
              <div className="flex items-center justify-center md:justify-end gap-4">
                <a
                  href="https://x.com/i/communities/2004719020248105452"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:scale-110 transition-transform inline-flex items-center justify-center w-8 h-8 rounded-lg bg-card/60 border border-border/30 hover:border-primary/50"
                >
                  <span className="text-[11px] font-semibold">X</span>
                </a>
                <button
                  onClick={handleOpenDiscord}
                  className="hover:scale-110 transition-transform inline-flex items-center justify-center w-8 h-8 rounded-lg bg-card/60 border border-border/30 hover:border-primary/50"
                >
                  <img
                    src="https://cdn.simpleicons.org/discord/00CFFF"
                    alt="Discord"
                    className="w-5 h-5"
                  />
                </button>
                <a
                  href="mailto:cryptocards@linuxmail.org"
                  className="hover:scale-110 transition-transform inline-flex items-center justify-center w-8 h-8 rounded-lg bg-card/60 border border-border/30 hover:border-primary/50"
                >
                  <img
                    src="https://cdn.simpleicons.org/gmail/00CFFF"
                    alt="Email"
                    className="w-5 h-5"
                  />
                </a>
                <button
                  onClick={handleCopyShareLink}
                  disabled={!shareUrl}
                  className="hover:scale-110 transition-transform inline-flex items-center justify-center w-8 h-8 rounded-lg bg-card/60 border border-border/30 hover:border-primary/50 disabled:opacity-40 disabled:hover:scale-100"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/20 grid grid-cols-1 md:grid-cols-3 items-center gap-3">
            {/* Left: Solana badge */}
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <img
                src="https://cryptologos.cc/logos/solana-sol-logo.svg"
                alt="Solana"
                className="w-4 h-4"
              />
              <span className="text-[10px] font-bold text-primary">{t('footer.poweredBy')}</span>
            </div>

            {/* Center: copyright */}
            <div className="flex justify-center">
              <p className="text-[9px] text-primary font-bold">
                {t('footer.creatorRights') || t('footer.copyright')}
              </p>
            </div>

            {/* Right: creator credit */}
            <div className="flex justify-center md:justify-end">
              <p className="text-[8px] text-muted-foreground">{t('footer.creator')}</p>
            </div>
          </div>
        </footer>
      </main>

      {/* Modals */}
      <ClaimModal open={claimModalOpen} onOpenChange={setClaimModalOpen} />
      {cardData && (
        <ShareModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          cardId={cardData.cardId}
        />
      )}
      <DocumentationModal open={docsModalOpen} onOpenChange={setDocsModalOpen} />
      <TermsModal open={termsModalOpen} onOpenChange={setTermsModalOpen} />
      <PrivacyModal open={privacyModalOpen} onOpenChange={setPrivacyModalOpen} />
      <DiscordModal open={discordModalOpen} onOpenChange={setDiscordModalOpen} />

      {/* Dev Panel */}
      <DevPanel
        open={devPanelOpen}
        onOpenChange={setDevPanelOpen}
        onSimulateCardCreated={handleSimulateCardCreated}
        onSimulateFunding={handleSimulateFunding}
        onSimulateLocked={handleSimulateLocked}
        onResetAll={handleReset}
      />
    </div>
  );
}
