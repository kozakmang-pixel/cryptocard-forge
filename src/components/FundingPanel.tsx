// src/components/FundingPanel.tsx
import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/languageStore';
import {
  Copy,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCcw,
  Eye,
  EyeOff,
} from 'lucide-react';

interface FundingPanelProps {
  cardId: string;
  cvv: string;
  depositAddress: string;
  funded: boolean;
  locked: boolean;
  fundedAmount: string;
  tokenSymbol: string;
  onFundingStatusChange?: (isFunded: boolean, solAmount: number, tokenSymbolFromPanel?: string) => void;
}

interface CardStatusResponse {
  public_id: string;
  deposit_address: string | null;
  funded: boolean;
  locked: boolean;
  claimed: boolean;
  token_amount: number | null;
  amount_fiat: number | null;
  currency: string | null;
  sol?: number | null;
  total_value_sol?: number | null;
  token_portfolio?: {
    tokens?: Array<{
      mint?: string;
      amount_ui?: number;
      symbol?: string;
      name?: string;
    }>;
  };
}

export function FundingPanel({
  cardId,
  cvv,
  depositAddress,
  funded,
  locked,
  fundedAmount,
  tokenSymbol,
  onFundingStatusChange,
}: FundingPanelProps) {
  const { t } = useLanguage();

  const [isFunded, setIsFunded] = useState(funded);
  const [isLocked, setIsLocked] = useState(locked);
  const [displayDepositAddress, setDisplayDepositAddress] = useState(depositAddress);
  const [copiedDeposit, setCopiedDeposit] = useState(false);
  const [copiedCard, setCopiedCard] = useState(false);
  const [copiedCvv, setCopiedCvv] = useState(false);
  const [checking, setChecking] = useState(false);
  const [cvvVisible, setCvvVisible] = useState(false);

  // canonical funded amounts that should PERSIST even after claim
  // solAmount = value in SOL (native SOL + SPL token value in SOL)
  const [solAmount, setSolAmount] = useState<number | null>(null);
  const [usdAmount, setUsdAmount] = useState<number | null>(null);
  const [solPrice, setSolPrice] = useState<number | null>(null);

  // tokenAmount = actual SPL token amount on the card (e.g. CRYPTOCARDS),
  // falls back to SOL if we don't know token units.
  const [tokenAmount, setTokenAmount] = useState<number | null>(null);
  const [assetSymbolFromPortfolio, setAssetSymbolFromPortfolio] = useState<string | null>(null);

  const assetLabel = tokenSymbol || 'TOKEN';

  // helper: fetch SOL price from backend
  const fetchSolPrice = useCallback(async () => {
    try {
      const res = await fetch('/sol-price');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      if (typeof data.price_usd === 'number') {
        setSolPrice(data.price_usd);
        return data.price_usd as number;
      }
      return solPrice;
    } catch (err) {
      console.error('Error fetching SOL price:', err);
      return solPrice; // fallback to existing cached value (may be null)
    }
  }, [solPrice]);

  // helper: fetch token price in SOL directly from Jupiter on the client
  const fetchTokenPriceInSolFromJupiter = useCallback(
    async (mintAddress: string): Promise<number | null> => {
      try {
        const url = `https://price.jup.ag/v6/price?ids=${encodeURIComponent(
          mintAddress
        )}&vsToken=So11111111111111111111111111111111111111112`;
        const res = await fetch(url);
        if (!res.ok) {
          console.error('Jupiter price fetch error:', res.status);
          return null;
        }
        const body = await res.json();
        const entry = body?.data?.[mintAddress];
        const price = entry?.price;
        if (typeof price === 'number' && Number.isFinite(price) && price > 0) {
          return price;
        }
        return null;
      } catch (err) {
        console.error('Jupiter price fetch exception:', err);
        return null;
      }
    },
    []
  );

  // NEW: multi-source token->SOL price helper:
  // 1) Jupiter vs SOL
  // 2) Jupiter vs USDC (EPjF...) then divide by SOL/USD
  // 3) Pump.fun frontend API (best-effort)
  const fetchTokenPriceInSolWithFallbacks = useCallback(
    async (mintAddress: string): Promise<number | null> => {
      // 1) Primary path: direct SOL quote from Jupiter
      const jupDirect = await fetchTokenPriceInSolFromJupiter(mintAddress);
      if (jupDirect && jupDirect > 0) {
        return jupDirect;
      }

      // 2) Fallback: Jupiter USDC quote -> derive SOL using current SOL/USD
      try {
        const jupUsdcUrl = `https://price.jup.ag/v6/price?ids=${encodeURIComponent(
          mintAddress
        )}&vsToken=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`; // USDC on Solana
        const res = await fetch(jupUsdcUrl);
        if (res.ok) {
          const body = await res.json();
          const entry = body?.data?.[mintAddress];
          const priceUsd = entry?.price;
          if (typeof priceUsd === 'number' && Number.isFinite(priceUsd) && priceUsd > 0) {
            const solUsd = (await fetchSolPrice()) ?? solPrice;
            if (solUsd && solUsd > 0) {
              const priceInSol = priceUsd / solUsd;
              if (priceInSol > 0 && Number.isFinite(priceInSol)) {
                return priceInSol;
              }
            }
          }
        }
      } catch (err) {
        console.error('Jupiter USDC price fallback error:', err);
      }

      // 3) Fallback: Pump.fun frontend API – best-effort parse of price in SOL
      try {
        const pumpUrl = `https://frontend-api.pump.fun/coins/${mintAddress}`;
        const res = await fetch(pumpUrl);
        if (res.ok) {
          const body: any = await res.json();

          const candidates: number[] = [];
          if (typeof body?.price_in_sol === 'number') {
            candidates.push(body.price_in_sol);
          }
          if (typeof body?.price === 'number') {
            candidates.push(body.price);
          }
          if (typeof body?.market_data?.price_in_sol === 'number') {
            candidates.push(body.market_data.price_in_sol);
          }
          if (typeof body?.bonding_curve?.current_price_sol === 'number') {
            candidates.push(body.bonding_curve.current_price_sol);
          }

          const priceSol = candidates.find(
            (v) => typeof v === 'number' && Number.isFinite(v) && v > 0
          );
          if (typeof priceSol === 'number') {
            return priceSol;
          }
        }
      } catch (err) {
        console.error('Pump.fun price fallback error:', err);
      }

      return null;
    },
    [fetchSolPrice, fetchTokenPriceInSolFromJupiter, solPrice]
  );

  // initial load: pull any existing funded/claimed amounts from backend
  useEffect(() => {
    const loadInitial = async () => {
      try {
        const [statusRes, priceRes] = await Promise.all([
          fetch(`/card-status/${encodeURIComponent(cardId)}`),
          fetch('/sol-price'),
        ]);

        if (!statusRes.ok) {
          throw new Error(`card-status HTTP ${statusRes.status}`);
        }
        const status: CardStatusResponse = await statusRes.json();

        // update deposit address if backend changed it
        if (status.deposit_address) {
          setDisplayDepositAddress(status.deposit_address);
        }

        const isFundedFlag = !!status.funded;
        setIsFunded(isFundedFlag);
        setIsLocked(!!status.locked);

        // handle SOL price
        if (priceRes.ok) {
          const priceData = await priceRes.json();
          if (typeof priceData.price_usd === 'number') {
            setSolPrice(priceData.price_usd);
          }
        }

        // total SOL value (if backend had it when we fetched card-status)
        const backendSol =
          typeof status.total_value_sol === 'number' && status.total_value_sol > 0
            ? status.total_value_sol
            : typeof status.sol === 'number' && status.sol > 0
            ? status.sol
            : null;

        // status.token_amount here is our "SOL-equivalent" tracked in DB, not token units
        const solLike =
          typeof status.token_amount === 'number' && status.token_amount > 0
            ? status.token_amount
            : null;
        const fiatAmt =
          typeof status.amount_fiat === 'number' && status.amount_fiat > 0
            ? status.amount_fiat
            : null;

        if (backendSol !== null && backendSol > 0) {
          setSolAmount(backendSol);
        } else if (solLike !== null && solLike > 0) {
          setSolAmount(solLike);
        }

        if (fiatAmt !== null && fiatAmt > 0) {
          setUsdAmount(fiatAmt);
        }

        if (isFundedFlag && backendSol && backendSol > 0 && onFundingStatusChange) {
          onFundingStatusChange(true, backendSol, tokenSymbol);
        }
      } catch (err) {
        console.error('Error loading initial card status', err);
      }
    };

    loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  // formatted display values (persist even after claim)
  const displaySol = solAmount !== null ? solAmount : 0;
  const displayToken = tokenAmount !== null ? tokenAmount : displaySol;
  const displayUsd =
    usdAmount !== null
      ? usdAmount
      : solPrice
      ? displaySol * solPrice
      : 0;

  const formattedToken = displayToken.toFixed(6);
  const formattedSol = displaySol.toFixed(6);
  const formattedUsd = displayUsd.toFixed(2);

  // tax: 1.5% of SOL balance, with fiat
  const taxSol = displaySol * 0.015;
  const taxToken = taxSol; // mirror in token units for UI
  const taxUsd = displayUsd * 0.015;
  const formattedTaxToken = taxToken.toFixed(6);
  const formattedTaxSol = taxSol.toFixed(6);
  const formattedTaxUsd = taxUsd.toFixed(2);

  const handleCopy = async (value: string, type: 'deposit' | 'cvv' | 'card') => {
    try {
      await navigator.clipboard.writeText(value);
      if (type === 'deposit') {
        setCopiedDeposit(true);
        setTimeout(() => setCopiedDeposit(false), 1200);
      } else if (type === 'cvv') {
        setCopiedCvv(true);
        setTimeout(() => setCopiedCvv(false), 1200);
      } else {
        setCopiedCard(true);
        setTimeout(() => setCopiedCard(false), 1200);
      }
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleCheckFunding = async () => {
    if (!cardId) return;
    setChecking(true);
    try {
      const res = await fetch(`/sync-card-funding/${encodeURIComponent(cardId)}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error('sync-card-funding error:', res.status, text);
        throw new Error('Failed to sync card funding');
      }

      const data: any = await res.json();

      // total value in SOL (native SOL + priced SPL tokens) from backend
      const totalSolValueBackend =
        typeof data.total_value_sol === 'number' && data.total_value_sol > 0
          ? data.total_value_sol
          : typeof data.sol === 'number' && data.sol > 0
          ? data.sol
          : 0;

      const fundedFlag =
        data && typeof data.funded === 'boolean' ? data.funded : false;

      const tokenPortfolio = data?.token_portfolio;
      const hasTokenPortfolio =
        tokenPortfolio &&
        Array.isArray(tokenPortfolio.tokens) &&
        tokenPortfolio.tokens.length > 0;

      // Primary token (typical case: only one SPL on the card)
      let primaryTokenAmount: number | null = null;
      let primaryTokenMint: string | null = null;
      let primaryTokenSymbol: string | null = null;

      if (hasTokenPortfolio) {
        const first = tokenPortfolio.tokens[0];
        if (first) {
          if (typeof first.amount_ui === 'number' && first.amount_ui > 0) {
            primaryTokenAmount = first.amount_ui;
          }
          if (typeof first.mint === 'string') {
            primaryTokenMint = first.mint;
          }
          if (typeof first.symbol === 'string') {
            primaryTokenSymbol = first.symbol;
          }
        }
      }

      if (primaryTokenSymbol) {
        setAssetSymbolFromPortfolio(primaryTokenSymbol);
      }

      // If backend already has a non-zero SOL value (native + SPL), use it.
      if (totalSolValueBackend > 0) {
        const priceUsd = (await fetchSolPrice()) ?? solPrice;
        const usd = priceUsd ? totalSolValueBackend * priceUsd : displayUsd;

        setSolAmount(totalSolValueBackend);
        setUsdAmount(usd);

        if (primaryTokenAmount !== null) {
          setTokenAmount(primaryTokenAmount);
        }

        if (onFundingStatusChange) {
          onFundingStatusChange(true, totalSolValueBackend, primaryTokenSymbol || tokenSymbol);
        }

        toast.success('Deposit detected! Your CRYPTOCARD is now funded.');
        return;
      }

      // Backend says no SOL value, but we *do* see tokens on-chain.
      // Try client-side Jupiter price (with Pump.fun fallback) to recover SOL/USD values,
      // especially for fresh PumpFun / meme listings.
      if (fundedFlag && hasTokenPortfolio && primaryTokenAmount !== null && primaryTokenMint) {
        const priceInSol = await fetchTokenPriceInSolWithFallbacks(primaryTokenMint);

        if (priceInSol && priceInSol > 0) {
          const solVal = primaryTokenAmount * priceInSol;

          const priceUsd = (await fetchSolPrice()) ?? solPrice;
          const usdVal = priceUsd ? solVal * priceUsd : 0;

          setSolAmount(solVal);
          setUsdAmount(usdVal);
          setTokenAmount(primaryTokenAmount);

          if (onFundingStatusChange) {
            onFundingStatusChange(true, solVal, primaryTokenSymbol || tokenSymbol);
          }

          toast.success('Deposit detected! Your CRYPTOCARD is now funded.');
        } else {
          // We know tokens are there, but even Jupiter/Pump.fun won't price them yet.
          setTokenAmount(primaryTokenAmount);
          if (onFundingStatusChange) {
            onFundingStatusChange(true, 0, primaryTokenSymbol || tokenSymbol);
          }
          toast.success(
            'Deposit detected! Your CRYPTOCARD holds tokens, but price data is not available yet.'
          );
        }

        return;
      }

      if (fundedFlag) {
        // funded but no price & no portfolio => extremely edge-case
        setSolAmount(0);
        setUsdAmount(0);
        if (onFundingStatusChange) {
          onFundingStatusChange(true, 0, tokenSymbol);
        }
        toast.success(
          'Deposit detected, but could not determine SOL value. Tokens may be unpriced.'
        );
        return;
      }

      toast.info('No deposit detected yet. Try again in a few seconds.');
    } catch (err) {
      console.error('Error checking funding:', err);
      toast.error('Failed to check funding. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  const explorerUrl = displayDepositAddress
    ? `https://solscan.io/account/${encodeURIComponent(displayDepositAddress)}`
    : 'https://solscan.io';

  return (
    <div className="mt-3 space-y-3">
      {/* TITLE */}
      <div className="text-center mb-1">
        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/90">
          FUND YOUR CRYPTOCARD
        </h3>
        <p className="text-[9px] text-muted-foreground mt-1">
          Send {assetLabel} to the deposit wallet below. Once funded, lock and share your
          CRYPTOCARD.
        </p>
      </div>

      {/* STATUS SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="rounded-lg border border-border/40 bg-card/70 p-2.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase text-muted-foreground">
              Funded
            </span>
            <span
              className={
                locked
                  ? 'inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-warning/10 border border-warning/40 text-warning-foreground'
                  : funded || solAmount
                  ? 'inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-400/40 text-emerald-300'
                  : 'inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-muted/20 border border-muted/40 text-muted-foreground'
              }
            >
              <CheckCircle2 className="w-3 h-3" />
              {funded || solAmount ? 'FUNDED' : 'NOT FUNDED'}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] text-muted-foreground">
              {assetSymbolFromPortfolio || assetLabel} Balance
            </span>
            <span className="text-[11px] font-mono">
              {formattedToken} {assetSymbolFromPortfolio || assetLabel}
            </span>
          </div>
          <div className="flex items-baseline justify-between text-[10px] text-muted-foreground">
            <span>≈ {formattedSol} SOL</span>
            <span>≈ ${formattedUsd} USD</span>
          </div>
        </div>

        <div className="rounded-lg border border-border/40 bg-card/70 p-2.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase text-muted-foreground">
              Protocol Fee (1.5%)
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] text-muted-foreground">
              {assetSymbolFromPortfolio || assetLabel} Burn
            </span>
            <span className="text-[11px] font-mono">
              {formattedTaxToken} {assetSymbolFromPortfolio || assetLabel}
            </span>
          </div>
          <div className="flex items-baseline justify-between text-[10px] text-muted-foreground">
            <span>≈ {formattedTaxSol} SOL</span>
            <span>≈ ${formattedTaxUsd} USD</span>
          </div>
        </div>
      </div>

      {/* DEPOSIT ADDRESS + CVV */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-[9px] uppercase text-muted-foreground">
            Deposit Wallet Address
          </Label>
          <div className="flex items-center gap-1">
            <Input
              readOnly
              value={displayDepositAddress || ''}
              className="h-8 text-[10px] font-mono bg-background/70"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 text-[10px]"
              onClick={() => handleCopy(displayDepositAddress || '', 'deposit')}
              disabled={!displayDepositAddress}
            >
              {copiedDeposit ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </Button>
          </div>
          <p className="text-[9px] text-muted-foreground flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-amber-400" />
            Only send {assetLabel} or SOL from a wallet you control. CEX withdrawals are not
            recommended.
          </p>
        </div>

        <div className="space-y-1">
          <Label className="text-[9px] uppercase text-muted-foreground">Card CVV</Label>
          <div className="flex items-center gap-1">
            <div className="relative flex-1">
              <Input
                readOnly
                type={cvvVisible ? 'text' : 'password'}
                value={cvv}
                className="h-8 text-[10px] font-mono bg-background/70 pr-7"
              />
              <button
                type="button"
                onClick={() => setCvvVisible((v) => !v)}
                className="absolute right-1 top-1.5 inline-flex items-center justify-center h-5 w-5 text-muted-foreground hover:text-foreground"
              >
                {cvvVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-8 w-8 text-[10px]"
              onClick={() => handleCopy(cvv, 'cvv')}
            >
              {copiedCvv ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            </Button>
          </div>
          <p className="text-[9px] text-muted-foreground">
            The CVV, together with the card ID, is required to claim funds. Store it securely.
          </p>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1 h-8 text-[10px] font-semibold"
          onClick={handleCheckFunding}
          disabled={checking || !displayDepositAddress}
        >
          {checking ? (
            <>
              <RefreshCcw className="w-3 h-3 mr-1 animate-spin" />
              Checking on-chain balance...
            </>
          ) : (
            <>
              <RefreshCcw className="w-3 h-3 mr-1" />
              Check Balance / Refresh
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1 h-8 text-[10px] font-semibold"
          asChild
        >
          <a href={explorerUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="w-3 h-3 mr-1" />
            View Deposit Wallet on Solscan
          </a>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1 h-8 text-[10px] font-semibold"
          onClick={() => handleCopy(`${window.location.origin}/claim?card=${cardId}&cvv=${cvv}`, 'card')}
        >
          {copiedCard ? (
            <>
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Link Copied
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 mr-1" />
              Copy Claim Link
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
