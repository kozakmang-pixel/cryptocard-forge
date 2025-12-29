import { useEffect, useMemo, useState } from 'react';
import { ImageIcon, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageGridProps {
  selectedImage: string;
  onSelectImage: (url: string) => void;
  onUpload: (file: File) => void;
}

type GridItem = {
  url: string;
  label: string;
  isGif?: boolean;
};

/**
 * 7 preset tiles + 1 upload tile.
 * - "Images" mode: Unsplash crypto / Solana / neon art.
 * - "GIF mode": Real GIFs from Giphy with degen/crypto queries.
 */
export function ImageGrid({ selectedImage, onSelectImage, onUpload }: ImageGridProps) {
  const [mode, setMode] = useState<'images' | 'gifs'>('images');
  const [refreshKey, setRefreshKey] = useState(0);
  const [gifItems, setGifItems] = useState<GridItem[]>([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifError, setGifError] = useState<string | null>(null);

  const giphyApiKey = import.meta.env.VITE_GIPHY_API_KEY as string | undefined;

  // Static-ish Unsplash images for "Images" mode
  const imageItems: GridItem[] = useMemo(() => {
    const baseQueries = [
      'solana,crypto,neon',
      'blockchain,grid,futuristic',
      'defi,neon,abstract',
      'meme,crypto,solana',
      'digital,cyberpunk,neon',
      'trading,charts,crypto',
      'network,glow,particles',
    ];

    return baseQueries.map((q, index) => {
      const url = `https://source.unsplash.com/600x400/?${encodeURIComponent(
        q
      )}&sig=${index}&v=${refreshKey}`;
      return {
        url,
        label: 'Card artwork',
        isGif: false,
      };
    });
  }, [refreshKey]);

  // Fetch real GIFs from Giphy for GIF mode
  useEffect(() => {
    if (mode !== 'gifs') return;
    if (!giphyApiKey) {
      setGifError('Missing GIPHY API key');
      setGifItems([]);
      return;
    }

    const fetchGifs = async () => {
      setGifLoading(true);
      setGifError(null);

      try {
        const queries = [
          'solana meme',
          'crypto degen',
          'pumpfun meme',
          'solana shitcoin',
          'crypto casino',
          'memecoin trading',
        ];

        // Pick one random query each refresh for variety
        const q = queries[Math.floor(Math.random() * queries.length)];

        const params = new URLSearchParams({
          api_key: giphyApiKey,
          q,
          limit: '25',
          rating: 'pg-13',
          lang: 'en',
        });

        const res = await fetch(`https://api.giphy.com/v1/gifs/search?${params.toString()}`);
        if (!res.ok) {
          throw new Error(`Giphy HTTP ${res.status}`);
        }

        const json = await res.json();
        const data = Array.isArray(json.data) ? json.data : [];

        if (!data.length) {
          setGifItems([]);
          setGifError('No GIFs returned');
          setGifLoading(false);
          return;
        }

        // Pick up to 7 GIFs
        const picked = data.slice(0, 7).map((gif: any, idx: number) => {
          const img =
            gif.images?.downsized_medium?.url ||
            gif.images?.downsized?.url ||
            gif.images?.original?.url;

          return {
            url: img,
            label: gif.title || 'Crypto meme GIF',
            isGif: true,
          } as GridItem;
        });

        setGifItems(picked);
      } catch (err: any) {
        console.error('Failed to load GIFs from Giphy', err);
        setGifError(err?.message || 'Failed to load GIFs');
        setGifItems([]);
      } finally {
        setGifLoading(false);
      }
    };

    fetchGifs();
  }, [mode, refreshKey, giphyApiKey]);

  const itemsToShow: GridItem[] = mode === 'images' ? imageItems : gifItems;

  const handleUploadChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    onUpload(file);
  };

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <ImageIcon className="w-3 h-3 text-accent" />
          <span className="text-[9px] font-semibold uppercase tracking-wide opacity-80">
            Card artwork
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Images / GIF toggle */}
          <div className="inline-flex rounded-full bg-card/70 border border-border/40 p-0.5">
            <button
              type="button"
              className={cn(
                'px-2 h-5 text-[8px] rounded-full transition-all',
                mode === 'images'
                  ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setMode('images')}
            >
              Images
            </button>
            <button
              type="button"
              className={cn(
                'px-2 h-5 text-[8px] rounded-full transition-all',
                mode === 'gifs'
                  ? 'bg-secondary text-secondary-foreground font-semibold shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setMode('gifs')}
            >
              GIF mode
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-6 w-6 border-border/40"
            onClick={() => setRefreshKey((k) => k + 1)}
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {mode === 'gifs' && gifError && (
        <div className="mb-1 text-[8px] text-warning">
          GIFs unavailable: {gifError}. Falling back to images.
        </div>
      )}

      <div className="grid grid-cols-4 gap-1.5">
        {/* 7 remote tiles (images or gifs) */}
        {(itemsToShow.length ? itemsToShow : imageItems).slice(0, 7).map((item, index) => {
          const isSelected = selectedImage === item.url;
          return (
            <button
              key={`${mode}-${index}`}
              type="button"
              onClick={() => onSelectImage(item.url)}
              className={cn(
                'relative rounded-lg overflow-hidden border transition-all aspect-[3/2]',
                isSelected
                  ? 'border-accent ring-2 ring-accent/60'
                  : 'border-border/40 hover:border-accent/60 hover:shadow-md'
              )}
            >
              <img
                src={item.url}
                alt={item.label}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute left-1 bottom-1 px-1.5 py-0.5 rounded-full bg-black/55">
                <span className="text-[7px] text-white/90 font-medium">
                  {item.isGif ? 'GIF' : 'Art'}
                </span>
              </div>
              {isSelected && (
                <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                  <span className="text-[8px] font-bold uppercase tracking-wide text-accent-foreground">
                    Selected
                  </span>
                </div>
              )}
            </button>
          );
        })}

        {/* Upload tile */}
        <label
          className={cn(
            'relative rounded-lg border border-dashed border-border/50 flex flex-col items-center justify-center text-center aspect-[3/2] cursor-pointer hover:border-accent/80 hover:bg-card/40 transition-all'
          )}
        >
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUploadChange}
          />
          <ImageIcon className="w-4 h-4 mb-1 text-muted-foreground" />
          <span className="text-[8px] font-semibold uppercase text-muted-foreground">
            Upload
          </span>
          <span className="text-[7px] text-muted-foreground/80 mt-0.5 max-w-[90%]">
            PNG / JPG / GIF
          </span>
        </label>
      </div>

      {mode === 'gifs' && gifLoading && (
        <div className="mt-1 text-[8px] text-muted-foreground">Loading crypto GIFs…</div>
      )}
    </div>
  );
}
