// src/components/ImageGrid.tsx
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ImageIcon, Loader2, VideoIcon, Search } from 'lucide-react';

interface ImageGridProps {
  selectedImage: string;
  onSelectImage: (url: string) => void;
  onUpload: (file: File) => void;
}

// Base static pool (used when there's no search query or GIPHY key)
const STATIC_IMAGE_URLS: string[] = Array.from({ length: 80 }, (_, i) => {
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
  // Only 4 tiles now instead of 8
  const TILE_COUNT = 4;

  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [showGifs, setShowGifs] = useState(false);

  const giphyApiKey = import.meta.env.VITE_GIPHY_API_KEY as string | undefined;

  const loadItems = async (overrideQuery?: string, overrideShowGifs?: boolean) => {
    const term = (overrideQuery ?? activeQuery ?? '').trim();
    const useGifs = overrideShowGifs ?? showGifs;

    setLoading(true);
    try {
      // GIF mode with GIPHY
      if (useGifs && giphyApiKey) {
        const fallbackQueries = [
          'solana meme',
          'crypto degen',
          'pumpfun',
          'memecoin',
          'bitcoin laser eyes',
          'trading meme',
          'elon doge',
          'crypto casino',
        ];

        const searchTerm =
          term || fallbackQueries[Math.floor(Math.random() * fallbackQueries.length)];

        const res = await fetch(
          `https://api.giphy.com/v1/gifs/search?api_key=${giphyApiKey}&q=${encodeURIComponent(
            searchTerm,
          )}&limit=24&rating=pg-13`,
        );

        if (!res.ok) {
          throw new Error('Failed to fetch GIFs');
        }

        const json = await res.json();
        const urls: string[] =
          json?.data
            ?.map(
              (item: any) =>
                item?.images?.downsized_medium?.url ||
                item?.images?.downsized?.url ||
                item?.images?.original?.url,
            )
            .filter(Boolean) ?? [];

        if (!urls.length) {
          setItems(pickRandomUnique(STATIC_IMAGE_URLS, TILE_COUNT));
        } else {
          setItems(urls.slice(0, TILE_COUNT));
        }
      } else {
        // Static image mode (picsum placeholder pool)
        setItems(pickRandomUnique(STATIC_IMAGE_URLS, TILE_COUNT));
      }
    } catch (err) {
      console.error('ImageGrid load error', err);
      setItems(pickRandomUnique(STATIC_IMAGE_URLS, TILE_COUNT));
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadItems('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveQuery(searchQuery);
    loadItems(searchQuery);
  };

  const handleToggleSource = (useGifs: boolean) => {
    setShowGifs(useGifs);
    loadItems(searchQuery, useGifs);
  };

  const handleRefreshClick = () => {
    loadItems(activeQuery);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onUpload(file);
    // Reset input so the same file can be selected again later
    e.target.value = '';
  };

  return (
    <div className="mt-2">
      {/* Header with toggle + upload */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[8px] uppercase tracking-wide opacity-80">Artwork</span>

        <div className="flex items-center gap-1">
          <div className="flex items-center bg-card/70 border border-border/40 rounded-full p-0.5">
            <button
              type="button"
              onClick={() => handleToggleSource(false)}
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] transition-colors',
                !showGifs
                  ? 'bg-primary/90 text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <ImageIcon className="w-3 h-3" />
              IMAGES
            </button>
            <button
              type="button"
              onClick={() => handleToggleSource(true)}
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] transition-colors',
                showGifs
                  ? 'bg-primary/90 text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <VideoIcon className="w-3 h-3" />
              GIFS
            </button>
          </div>

          <div>
            <label className="cursor-pointer text-[8px] px-2 py-1 border border-border/40 rounded-md bg-card/80 hover:bg-card/60 transition-colors">
              Upload
              <input
                type="file"
                accept="image/*,video/gif"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>
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
          placeholder={showGifs ? 'Search crypto GIFs…' : 'Search backgrounds…'}
        />
        <Button
          type="submit"
          size="sm"
          className="h-6 px-2 text-[8px] font-bold"
        >
          SEARCH
        </Button>
      </form>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-1 py-4 text-[9px] text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Loading {showGifs ? 'GIFs' : 'images'}…</span>
        </div>
      )}

      {/* Grid */}
      {!loading && (
        <div className="mt-2">
          <div className="grid grid-cols-2 gap-1.5">
            {items.map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => onSelectImage(url)}
                className={cn(
                  'relative group rounded-md overflow-hidden border transition-all',
                  selectedImage === url
                    ? 'border-primary ring-2 ring-primary/60'
                    : 'border-border/40 hover:border-primary/60',
                )}
              >
                <img
                  src={url}
                  alt="Template"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </button>
            ))}
          </div>

          <div className="flex justify-between items-center mt-2">
            <p className="text-[8px] text-muted-foreground">
              Toggle between images and GIFs, search for a specific vibe, or upload your own artwork.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefreshClick}
              className="h-6 px-2 text-[8px]"
            >
              REFRESH
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
