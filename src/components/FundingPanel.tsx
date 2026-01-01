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

  // tokenAmount = actual token units (e.g. 193.962058 CRYPTOCARDS)
  const [tokenAmount, setTokenAmount] = useState<number | null>(() => {
    const parsed = parseFloat(fundedAmount);
    return Number.isFinite(parsed) ? parsed : null;
  });

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
      // First try direct SOL quote from Jupiter
      const jupDirect = await fetchTokenPriceInSolFromJupiter(mintAddress);
      if (jupDirect && jupDirect > 0) {
        return jupDirect;
      }

      // Fallback: Jupiter USDC quote -> convert using SOL/USD
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

      // Fallback: Pump.fun API
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
   


::contentReference[oaicite:0]{index=0}
