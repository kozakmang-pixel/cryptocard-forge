// src/components/ImageGrid.tsx
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ImageIcon, Loader2, VideoIcon, Search } from 'lucide-react';

interface ImageGridProps {
  selectedImage: string;
  onSelectImage: (url: string) => void;
  onUpload: (file: File) => void;
}

// Base static pool (used when there's no search query)
const STATIC_IMAGE_URLS: string[] = Array.from({ length: 120 }, (_, i) => {
  const seed = i + 1;
  return `https://picsum.photos/seed/cc_bg_${seed}/600/380`;
});

// Helper to pick N unique random items from an array
function pickRandomUnique<T>(source: T[], count: number): T[] {
  if (count >= source.length) return [...source];
  const copy = [...source];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}

export function ImageGrid({ selectedImage, onSelectImage, onUpload }: ImageGridProps) {
  const [showGifs, setShowGifs] = useState(false);
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState(''); // last applied search term

  const giphyApiKey = import.meta.env.VITE_GIPHY_API_KEY as string | undefined;

  // Core loader for images/GIFs
  const loadItems = async (query?: string) => {
    const term = (query ?? activeQuery ?? '').trim();
    setLoading(true);

    try {
      if (showGifs && giphyApiKey) {
        // GIF MODE – GIPHY search with term or degen defaults
        const fallbackQueries = [
          'solana meme',
          'crypto degen',
          'pumpfun',
          'memecoin',
          'bitcoin laser eyes',
          'trading meme',
          'elon doge',
          'crypto casino'
        ];

        const searchTerm = term || fallbackQueries[Math.floor(Math.random() * fallbackQueries.length)];

        const res = await fetch(
          `https://api.giphy.com/v1/gifs/search?api_key=${giphyApiKey}&q=${encodeURIComponent(
            searchTerm
          )}&limit=24&rating=pg-13`
        );

        if (!res.ok) throw new Error('Giphy request failed');
        const data = await res.json();

        const urls: string[] =
          data?.data
            ?.map(
              (g: any) =>
                g.images?.downsized_medium?.url ||
                g.images?.fixed_width?.url ||
                g.images?.original?.url
            )
            .filter(Boolean) || [];

        if (!urls.length) {
          // Fallback to static images if Giphy returns nothing
          const base = term
            ? Array.from({ length: 120 }, (_, i) => {
                const seed = `${encodeURIComponent(term)}_${i + 1}`;
                return `https://picsum.photos/seed/cc_bg_${seed}/600/380`;
              })
            : STATIC_IMAGE_URLS;

          setItems(pickRandomUnique(base, 8));
        } else {
          setItems(pickRandomUnique(urls, 8));
        }
      } else {
        // IMAGE MODE – static pool, flavored by search term
        const base = term
          ? Array.from({ length: 120 }, (_, i) => {
              const seed = `${encodeURIComponent(term)}_${i + 1}`;
              return `https://picsum.photos/seed/cc_bg_${seed}/600/380`;
            })
          : STATIC_IMAGE_URLS;

        setItems(pickRandomUnique(base, 8));
      }
    } catch (err) {
      console.error('ImageGrid load error', err);
      // Absolute fallback – always show *something*
      setItems(pickRandomUnique(STATIC_IMAGE_URLS, 8));
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadItems('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when switching between Images / GIFs, keeping active query
  useEffect(() => {
    loadItems('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showGifs]);

  // Ensure uploaded/selected image remains in view
  const displayItems = useMemo(() => {
    if (!selectedImage) return items;
    if (!items.includes(selectedImage)) {
      return [selectedImage, ...items.slice(0, 7)];
    }
    return items;
  }, [items, selectedImage]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onUpload(file);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const term = searchQuery.trim();
    setActiveQuery(term);
    loadItems(term);
  };

  const handleRefresh = () => {
    loadItems('');
  };

  return (
    <div className="mt-2 space-y-2">
      {/* Top controls row: label + mode toggle + search + refresh + upload */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[8px] uppercase tracking-wide opacity-80">
              Artwork source
            </span>
            <div className="flex items-center gap-1">
              <span className="text-[8px] opacity-70 flex items-center gap-1">
                <ImageIcon className="w-3 h-3" /> Images
              </span>
              <Switch
                checked={showGifs}
                onCheckedChange={(val) => setShowGifs(val)}
                className="scale-75"
              />
              <span className="text-[8px] opacity-70 flex items-center gap-1">
                <VideoIcon className="w-3 h-3" /> GIFs
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-[8px]"
              onClick={handleRefresh}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Refresh
                </>
              ) : (
                'Refresh'
              )}
            </Button>

            <label className="relative inline-flex items-center">
              <input
                type="file"
                accept="image/*,image/gif"
                className="hidden"
                onChange={handleFileChange}
              />
              <span className="cursor-pointer text-[8px] px-2 py-1 border border-border/40 rounded-md bg-card/80 hover:bg-card/60 transition-colors">
                Upload
              </span>
            </label>
          </div>
        </div>

        {/* Search bar */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex items-center gap-1 bg-card/60 border border-border/40 rounded-md px-2 py-1"
        >
          <Search className="w-3 h-3 opacity-70 mr-1" />
          <input
            className="flex-1 bg-transparent outline-none text-[9px] placeholder:text-[8px] placeholder:opacity-60"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              showGifs
                ? 'Search GIFs (e.g. solana, degen, pump)…'
                : 'Search artwork vibe (e.g. cyberpunk, neon, galaxy)…'
            }
          />
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[8px]"
            disabled={loading}
          >
            Go
          </Button>
        </form>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-4 gap-2">
        {displayItems.map((url, idx) => (
          <button
            key={`${url}-${idx}`}
            type="button"
            onClick={() => onSelectImage(url)}
            className={cn(
              'relative rounded-lg overflow-hidden border aspect-[3/2] group',
              selectedImage === url
                ? 'border-accent ring-1 ring-accent/70'
                : 'border-border/30 hover:border-accent/60 hover:shadow-md'
            )}
          >
            <img
              src={url}
              alt="Background option"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between">
              <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-black/60 text-white/90 uppercase tracking-wide">
                Background option
              </span>
              {selectedImage === url && (
                <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-accent text-black font-bold uppercase">
                  Selected
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {/* Hint */}
      <p className="text-[8px] text-muted-foreground mt-1">
        Toggle between images and GIFs, search for a specific vibe, or upload your own artwork.
      </p>
    </div>
  );
}
