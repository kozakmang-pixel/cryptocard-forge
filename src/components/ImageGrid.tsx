// src/components/ImageGrid.tsx
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ImageIcon, Loader2, VideoIcon, Search } from 'lucide-react';
import { CARD_IMAGE_URLS } from '@/config/cardImages';
import { apiService } from '@/services/api';

interface ImageGridProps {
  selectedImage: string;
  onSelectImage: (url: string) => void;
  onUpload: (file: File) => void;
}

// Base static pool (used as fallback)
// If CARD_IMAGE_URLS is empty, we fall back to generic picsum placeholders.
const FALLBACK_STATIC_IMAGE_URLS: string[] = Array.from({ length: 120 }, (_, i) => {
  const seed = i + 1;
  return `https://picsum.photos/seed/cc_bg_${seed}/600/380`;
});

const STATIC_IMAGE_URLS: string[] =
  CARD_IMAGE_URLS.length > 0 ? CARD_IMAGE_URLS : FALLBACK_STATIC_IMAGE_URLS;

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

function isGifUrl(url: string): boolean {
  return /\.gif(\?|$)/i.test(String(url || ''));
}


export function ImageGrid({ selectedImage, onSelectImage, onUpload }: ImageGridProps) {
  const [items, setItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGifs, setShowGifs] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const giphyApiKey = import.meta.env.VITE_GIPHY_API_KEY as string | undefined;
  const pexelsApiKey = import.meta.env.VITE_PEXELS_API_KEY as string | undefined;

  const loadItems = async (term: string) => {
    setLoading(true);
    let uploadedFiltered: string[] = [];
    try {
      // Always include user-uploaded templates (Supabase Storage) alongside stock images.
      // If this request fails, we simply continue with the stock/3rd-party sources.
      try {
        const uploadedRes = await apiService.listTemplates({ type: 'all', limit: 400 });
        const uploadedAll = Array.isArray(uploadedRes?.urls) ? uploadedRes.urls : [];
        uploadedFiltered = showGifs
          ? uploadedAll.filter((u) => isGifUrl(u))
          : uploadedAll.filter((u) => !isGifUrl(u));
      } catch {
        uploadedFiltered = [];
      }

      if (showGifs) {
        // GIF MODE – Giphy search
        const searchTerm = term.trim() || 'solana degen meme';

        if (!giphyApiKey) {
          console.warn('Missing VITE_GIPHY_API_KEY, falling back to static images');
          {
            const pool = [...uploadedFiltered, ...STATIC_IMAGE_URLS];
            setItems(pickRandomUnique(pool, 8));
          }
          return;
        }

        const res = await fetch(
          `https://api.giphy.com/v1/gifs/search?api_key=${giphyApiKey}&q=${encodeURIComponent(
            searchTerm
          )}&limit=36&rating=pg-13`
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
          {
            const pool = [...uploadedFiltered, ...STATIC_IMAGE_URLS];
            setItems(pickRandomUnique(pool, 8));
          }
        } else {
          {
            const pool = [...uploadedFiltered, ...urls];
            setItems(pickRandomUnique(pool, 8));
          }
        }
      } else {
        // IMAGE MODE – Pexels search
        const searchTerm = term.trim() || 'crypto meme solana neon';

        if (!pexelsApiKey) {
          console.warn('Missing VITE_PEXELS_API_KEY, falling back to static images');
          {
            const pool = [...uploadedFiltered, ...STATIC_IMAGE_URLS];
            setItems(pickRandomUnique(pool, 8));
          }
          return;
        }

        const res = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(
            searchTerm
          )}&per_page=40`,
          {
            headers: {
              Authorization: pexelsApiKey,
            },
          }
        );

        if (!res.ok) throw new Error('Pexels request failed');
        const data = await res.json();

        const urls: string[] =
          data?.photos
            ?.map(
              (p: any) =>
                p.src?.landscape || p.src?.large || p.src?.medium || p.src?.original
            )
            .filter(Boolean) || [];

        if (!urls.length) {
          {
            const pool = [...uploadedFiltered, ...STATIC_IMAGE_URLS];
            setItems(pickRandomUnique(pool, 8));
          }
        } else {
          {
            const pool = [...uploadedFiltered, ...urls];
            setItems(pickRandomUnique(pool, 8));
          }
        }
      }
    } catch (err) {
      console.error('ImageGrid load error', err);
      // Absolute fallback – always show *something*
      {
        const pool = [...uploadedFiltered, ...STATIC_IMAGE_URLS];
        setItems(pickRandomUnique(pool, 8));
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadItems('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload when toggling between Images / GIFs
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
    loadItems(searchQuery.trim());
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
              className="h-6 px-2 text-[8px]"
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
              <span className="cursor-pointer text-[8px] px-2 py-1 rounded-md bg-card/80 border border-border/40 hover:bg-card/60 transition-colors">
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
          <Search className="w-3 h-3 opacity-60" />
          <input
            className="flex-1 bg-transparent outline-none text-[9px] placeholder:text-[8px] placeholder:opacity-60"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              showGifs
                ? 'Search GIFs (e.g. solana, degen, pump)…'
                : 'Search images (e.g. crypto, solana, degen)…'
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

      {/* Grid – 8 tiles, same layout */}
      <div className="grid grid-cols-4 gap-2">
        {displayItems.map((url, idx) => (
          <button
            key={`${url}-${idx}`}
            type="button"
            onClick={() => onSelectImage(url)}
            className={cn(
              'relative group rounded-lg overflow-hidden border transition-all duration-300',
              'bg-card/60 border-border/40 hover:border-primary/70 hover:shadow-lg hover:shadow-primary/30',
              selectedImage === url
                ? 'ring-2 ring-primary/80 border-primary shadow-lg shadow-primary/40'
                : 'opacity-80 hover:opacity-100'
            )}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
            <img
              src={url}
              alt="Card artwork"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
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
