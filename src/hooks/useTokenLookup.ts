import { useState, useEffect } from 'react';

interface TokenInfo { name: string; symbol: string; image?: string; }

export function useTokenLookup(tokenAddress: string) {
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tokenAddress || tokenAddress.length < 32) { setTokenInfo(null); setError(null); return; }

    const fetchTokenInfo = async () => {
      setLoading(true); setError(null);
      try {
        const dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`);
        if (dexResponse.ok) {
          const dexData = await dexResponse.json();
          if (dexData.pairs && dexData.pairs.length > 0) {
            const pair = dexData.pairs[0];
            setTokenInfo({ name: pair.baseToken.name, symbol: pair.baseToken.symbol, image: pair.info?.imageUrl });
            setLoading(false); return;
          }
        }
        setError('Token not found'); setTokenInfo(null);
      } catch { setError('Failed to lookup token'); setTokenInfo(null); } finally { setLoading(false); }
    };

    const timeoutId = setTimeout(fetchTokenInfo, 500);
    return () => clearTimeout(timeoutId);
  }, [tokenAddress]);

  return { tokenInfo, loading, error };
}
