import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ImageGridProps {
  selectedImage: string;
  onSelectImage: (url: string) => void;
  onUpload: (file: File) => void;
}

type GridItem = {
  url: string;
};

// Degen Sol / meme / crypto-flavoured queries
const UNSPLASH_QUERIES = [
  'solana,crypto,neon',
  'solana,memecoin,poster',
  'crypto,meme,neon',
  'degen,crypto,trading',
  'pumpfun,chart,green candles',
  'blockchain,futuristic,grid',
  'crypto,laser eyes,memes',
  'neon,cyberpunk,finance',
];

function buildRandomUnsplashUrl() {
  const q = UNSPLASH_QUERIES[Math.floor(Math.random() * UNSPLASH_QUERIES.length)];
  const sig = Math.floor(Math.random() * 1_000_000_000);
  // 400x260 keeps close to your card aspect and is light enough
  return `https://source.unsplash.com/featured/400x260/?${encodeURIComponent(q)}&sig=${sig}`;
}

function generateGridItems(count: number): GridItem[] {
  const items: GridItem[] = [];
  for (let i = 0; i < count; i++) {
    items.push({ url: buildRandomUnsplashUrl() });
  }
  return items;
}

export function ImageGrid({ selectedImage, onSelectImage, onUpload }: ImageGridProps) {
  // 7 random tiles + 1 upload tile
  const [items, setItems] = useState<GridItem[]>(() => generateGridItems(7));
  const [refreshing, setRefreshing] = useState(false);

  // If selectedImage is something custom (e.g. upload), ensure it shows visually
  useEffect(() => {
    if (!selectedImage) return;
    const exists = items.some((i) => i.url === selectedImage);
    if (!exists) {
      setItems((prev) => {
        const clone = [...prev];
        // Put the selected image in the first slot
        clone[0] = { url: selectedImage };
        return clone;
      });
    }
  }, [selectedImage, items]);

  const handleRefresh = () => {
    setRefreshing(true);
    setItems(generateGridItems(7));
    setTimeout(() => setRefreshing(false), 250);
  };

  const handleUploadClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      onUpload(file);
      const localUrl = URL.createObjectURL(file);
      onSelectImage(localUrl);
    };

    input.click();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[8px] uppercase tracking-wide opacity-80">
          Card artwork
        </span>
        <Button
          type="button"
          variant="outline"
          size="xs"
          onClick={handleRefresh}
          disabled={refreshing}
          className="h-6 px-2 text-[9px] rounded-full border-border/40"
        >
          {refreshing ? 'Refreshing…' : 'Refresh images'}
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {items.map((item) => (
          <button
            key={item.url}
            type="button"
            onClick={() => onSelectImage(item.url)}
            className={cn(
              'relative aspect-[3/2] rounded-md overflow-hidden border transition-all',
              'bg-card/60 hover:bg-card/80 hover:shadow-sm',
              selectedImage === item.url
                ? 'border-accent ring-1 ring-accent/60'
                : 'border-border/40'
            )}
          >
            <img
              src={item.url}
              alt="Background option"
              className="w-full h-full object-cover"
              loading="lazy"
            />
            {selectedImage === item.url && (
              <div className="absolute inset-0 ring-2 ring-accent/70 pointer-events-none" />
            )}
          </button>
        ))}

        {/* Upload tile (the 8th tile) */}
        <button
          type="button"
          onClick={handleUploadClick}
          className="flex flex-col items-center justify-center aspect-[3/2] rounded-md border border-dashed border-border/50 bg-card/40 hover:bg-card/70 hover:border-accent/60 transition-all text-[9px] text-muted-foreground"
        >
          <span className="text-lg mb-0.5">＋</span>
          <span>Upload</span>
        </button>
      </div>
    </div>
  );
}
