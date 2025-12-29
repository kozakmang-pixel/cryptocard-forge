import { useMemo, useState } from 'react';
import { ImageIcon, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageGridProps {
  selectedImage: string;
  onSelectImage: (url: string) => void;
  onUpload: (file: File) => void;
}

/**
 * 7 preset background tiles + 1 upload tile.
 * Has a toggle between "Images" and "GIF-vibe" (more degen / meme queries).
 * Still only shows 8 tiles total at any time.
 */
export function ImageGrid({ selectedImage, onSelectImage, onUpload }: ImageGridProps) {
  const [mode, setMode] = useState<'images' | 'gifs'>('images');
  const [refreshKey, setRefreshKey] = useState(0);

  // Build Unsplash "random" sources. These are *not* actual GIFs,
  // but GIF mode uses more degen / meme-focused queries.
  const items = useMemo(() => {
    const baseImages =
      'https://source.unsplash.com/600x400/?solana,crypto,neon,blockchain';
    const baseGifs =
      'https://source.unsplash.com/600x400/?crypto,meme,solana,degen,neon';

    const base = mode === 'images' ? baseImages : baseGifs;

    return Array.from({ length: 7 }).map((_, index) => {
      const url = `${base}&sig=${index}&v=${refreshKey}`;
      return {
        url,
        label: mode === 'images' ? 'Card artwork' : 'Animated-style artwork',
      };
    });
  }, [mode, refreshKey]);

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

      <div className="grid grid-cols-4 gap-1.5">
        {/* 7 preset tiles */}
        {items.map((item, index) => {
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
              {isSelected && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
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
    </div>
  );
}
