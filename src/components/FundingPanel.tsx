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
  onFundingStatusChange?: (isFunded: boolean, solAmount: number) => void;
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

  const [checking, setChecking] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [copiedCvv, setCopiedCvv] = useState(false);
  const [copiedCard, setCopiedCard] = useState(false);
  const [cvvVisible, setCvvVisible] = useState(false);

  // canonical funded amounts that should PERSIST even after claim
  // solAmount = value in SOL (native SOL + SPL token value in SOL)
  const [solAmount, setSolAmount] = useState<number | null>(null);
  const [usdAmount, setUsdAmount] = useState<number | null>(null);
  const [solPrice, setSolPrice] = useState<number | null>(null);

  // tokenAmount = actual token units (e.g. 193.962058 CRYPTOCARDS / WHITEWHALE)
  const [tokenAmount, setTokenAmount] = useState<number | null>(() => {
    const parsed = parseFloat(fundedAmount);
    return Number.isFinite(parsed) ? parsed : null;
  });

  const assetLabel = tokenSymbol || 'TOKEN';

  // helper: fetch SOL price from backend
  const fetchSolPrice = useCallback(async (): Promise<number | null> => {
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
    } catch (err) {
      console.error('FundingPanel: failed to fetch SOL price', err);
    }
    return solPrice; // fallback to existing cached value (may be null)
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

  // helper: multi-source token->SOL price
  // 1) Jupiter vs SOL
  // 2) Jupiter vs USDC -> derive SOL using SOL/USD
  // 3) Pump.fun API (best-effort)
  const fetchTokenPriceInSolWithFallbacks = useCallback(
    async (mintAddress: string): Promise<number | null> => {
      // 1) direct SOL quote from Jupiter
      const jupDirect = await fetchTokenPriceInSolFromJupiter(mintAddress);
      if (jupDirect && jupDirect > 0) {
        return jupDirect;
      }

      // 2) Jupiter USDC quote -> convert using SOL/USD
      try {
        const usdcMint = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
        const url = `https://price.jup.ag/v6/price?ids=${encodeURIComponent(
          mintAddress
        )}&vsToken=${usdcMint}`;
        const res = await fetch(url);
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

      // 3) Pump.fun API
      try {
        const url = `https://frontend-api.pump.fun/coins/${mintAddress}`;
        const res = await fetch(url);
        if (res.ok) {
          const body: any = await res.json();

          const candidates: number[] = [];
          if (typeof body?.price_in_sol === 'number') {
            candidates.push(body.price_in_sol);
          }
          if (typeof body?.priceSol === 'number') {
            candidates.push(body.priceSol);
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
          if (priceSol !== undefined) {
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
          fetch('/sol-price').catch(() => null),
        ]);

        let solLikeFromStatus: number | null = null;
        let fiatFromStatus: number | null = null;

        if (statusRes.ok) {
          const status = (await statusRes.json()) as CardStatusResponse;

          // status.token_amount here is our "SOL-equivalent" tracked in DB, not token units
          const solLike =
            typeof status.token_amount === 'number' && status.token_amount > 0
              ? status.token_amount
              : null;
          const fiatAmt =
            typeof status.amount_fiat === 'number' && status.amount_fiat > 0
              ? status.amount_fiat
              : null;

          solLikeFromStatus = solLike;
          fiatFromStatus = fiatAmt;

          if (solLike !== null) {
            setSolAmount(solLike);

            if (onFundingStatusChange) {
              onFundingStatusChange(true, solLike);
            }
          }

          if (fiatAmt !== null) {
            setUsdAmount(fiatAmt);
          }
        }

        if (priceRes && priceRes.ok) {
          const pd = await priceRes.json();
          if (typeof pd.price_usd === 'number') {
            setSolPrice(pd.price_usd);
            // backfill a missing fiat value if we know SOL but usdAmount wasn't set
            if (usdAmount == null && solLikeFromStatus !== null) {
              setUsdAmount(solLikeFromStatus * pd.price_usd);
            }
          }
        }
      } catch (err) {
        console.error('FundingPanel: failed to load initial card status', err);
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
      : solPrice !== null
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

  const handleCopy = async (value: string, type: 'addr' | 'cvv' | 'card') => {
    try {
      await navigator.clipboard.writeText(value);
      if (type === 'addr') {
        setCopiedAddr(true);
        setTimeout(() => setCopiedAddr(false), 1200);
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

      if (hasTokenPortfolio) {
        const first = tokenPortfolio.tokens[0];
        if (first) {
          if (typeof first.amount_ui === 'number' && first.amount_ui > 0) {
            primaryTokenAmount = first.amount_ui;
          }
          if (typeof first.mint === 'string') {
            primaryTokenMint = first.mint;
          }
        }
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
          onFundingStatusChange(true, totalSolValueBackend);
        }

        toast.success('Deposit detected! Your CRYPTOCARD is now funded.');
        return;
      }

      // Backend says no SOL value, but we *do* see tokens on-chain.
      // Try client-side pricing (Jupiter + Pump.fun) to recover SOL/USD values.
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
            onFundingStatusChange(true, solVal);
          }

          toast.success('Deposit detected! Your CRYPTOCARD is now funded.');
        } else {
          // We know tokens are there, but even pricing APIs won't value them yet.
          setTokenAmount(primaryTokenAmount);
          if (onFundingStatusChange) {
            onFundingStatusChange(true, 0);
          }
          toast.success(
            'Deposit detected! Your CRYPTOCARD holds tokens, but SOL value is not yet available.'
          );
        }

        return;
      }

      // No SOL and no SPL tokens detected.
      toast.info('No funds detected yet. Try again after your transaction confirms.');
    } catch (err: any) {
      console.error('FundingPanel checkFunding failed', err);
      toast.error(err?.message || 'Failed to check funding status');
    } finally {
      setChecking(false);
    }
  };

  const solscanUrl = depositAddress
    ? `https://solscan.io/account/${depositAddress}`
    : undefined;

  return (
    <div className="mt-3 space-y-3">
      {/* TITLE */}
      <div className="text-center mb-1">
        <h3 className="text-xs font-black uppercase tracking-[0.18em] bg-gradient-to-r from-cyan-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">
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
          <div className="mt-1 text-[10px] font-mono text-emerald-300">
            <span className="block">
              {formattedToken} {assetLabel}
            </span>
            <span className="block">{formattedSol} SOL</span>
            <span className="block">${formattedUsd} USD</span>
          </div>
        </div>

        <div className="rounded-lg border border-border/40 bg-card/70 p-2.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase text-muted-foreground">
              1.5% Protocol Tax on Funded &amp; Locked CRYPTOCARDS
            </span>
          </div>
          <p className="text-[9px] text-muted-foreground mt-1 leading-snug">
            A 1.5% protocol tax is applied to the SOL balance on each funded and locked
            CRYPTOCARD. Tax proceeds automatically swap to $CRYPTOCARDS and are sent to our
            public burn wallet, which triggers a burn whenever its balance reaches 0.02 SOL
            or more.
          </p>
          <p className="text-[10px] font-mono mt-1 text-orange-300">
            Estimated tax on this CRYPTOCARD: {formattedTaxToken} {assetLabel} •{' '}
            {formattedTaxSol} SOL • ~${formattedTaxUsd} USD
          </p>
        </div>
      </div>

      {/* DEPOSIT DETAILS */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[9px] font-semibold uppercase text-primary tracking-wide">
            Deposit wallet ({assetLabel})
          </span>
          {solscanUrl && (
            <a
              href={solscanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[9px] text-primary hover:text-accent transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              View on Solscan
            </a>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={depositAddress}
            readOnly
            className="h-8 text-[9px] font-mono bg-background/80 border-border/50"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handleCopy(depositAddress, 'addr')}
          >
            {copiedAddr ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <Label className="text-[8px] uppercase tracking-wide opacity-80">
              Card ID
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={cardId}
                readOnly
                className="h-7 text-[9px] font-mono bg-background/60 border-border/40"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleCopy(cardId, 'card')}
              >
                {copiedCard ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
            </div>
          </div>
          <div>
            <Label className="text-[8px] uppercase tracking-wide opacity-80">
              CVV
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                value={cvvVisible ? cvv : '•••••'}
                readOnly
                className="h-7 text-[9px] font-mono bg-background/60 border-border/40"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setCvvVisible((v) => !v)}
              >
                {cvvVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => handleCopy(cvv, 'cvv')}
              >
                {copiedCvv ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 mt-3">
          <Button
            type="button"
            onClick={handleCheckFunding}
            disabled={checking}
            className="w-full sm:w-auto h-8 text-[10px] font-black gradient-success text-primary-foreground disabled:opacity-60"
          >
            {checking ? (
              <span className="inline-flex items-center gap-2">
                <RefreshCcw className="w-3 h-3 animate-spin" />
                Checking funding…
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <RefreshCcw className="w-3 h-3" />
                Check on-chain funding
              </span>
            )}
          </Button>

          <div className="flex items-center gap-1 text-[8px] text-muted-foreground">
            <AlertCircle className="w-3 h-3 text-warning" />
            <span>
              Use a Solana wallet (Phantom, Backpack, etc.). Wait for finality before locking.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
