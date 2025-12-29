import { useMemo, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Upload, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/lib/languageStore';

interface ImageGridProps { selectedImage: string; onSelectImage: (url: string) => void; onUpload: (file: File) => void; }

const CRYPTO_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1621416894569-0f39ed31d247?w=300&h=190&fit=crop', tag: 'bitcoin' },
  { url: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=300&h=190&fit=crop', tag: 'crypto' },
  { url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=300&h=190&fit=crop', tag: 'nft' },
  { url: 'https://images.unsplash.com/photo-1642104704074-907c0698cbd9?w=300&h=190&fit=crop', tag: 'ethereum' },
  { url: 'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=300&h=190&fit=crop', tag: 'blockchain' },
  { url: 'https://images.unsplash.com/photo-1516245834210-c4c142787335?w=300&h=190&fit=crop', tag: 'mining' },
  { url: 'https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=300&h=190&fit=crop', tag: 'defi' },
  { url: 'https://images.unsplash.com/photo-1634704784915-aacf363b021f?w=300&h=190&fit=crop', tag: 'solana' },
];

const CRYPTO_GIFS = [
  { url: 'https://media.giphy.com/media/trN9ber5sRVNS/giphy.gif', tag: 'crypto' },
  { url: 'https://media.giphy.com/media/JTzPN5kkobFv7X0zPJ/giphy.gif', tag: 'bitcoin' },
  { url: 'https://media.giphy.com/media/xT0xezQGU5xCDJuCPe/giphy.gif', tag: 'money' },
  { url: 'https://media.giphy.com/media/3oKIPdGYRGEby6jQwE/giphy.gif', tag: 'gold' },
  { url: 'https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif', tag: 'celebration' },
  { url: 'https://media.giphy.com/media/67ThRZlYBvibtdF9JH/giphy.gif', tag: 'rocket' },
  { url: 'https://media.giphy.com/media/xT9DPofgEkyu9t4wPm/giphy.gif', tag: 'gift' },
  { url: 'https://media.giphy.com/media/26tPplGWjN0xLybiU/giphy.gif', tag: 'party' },
];

export function ImageGrid({ selectedImage, onSelectImage, onUpload }: ImageGridProps) {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [useGifs, setUseGifs] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const visibleImages = useMemo(() => useGifs ? CRYPTO_GIFS : CRYPTO_IMAGES, [useGifs]);
  const filteredImages = useMemo(() => !searchQuery ? visibleImages : visibleImages.filter((img) => img.tag.toLowerCase().includes(searchQuery.toLowerCase())), [visibleImages, searchQuery]);
  const handleRefresh = useCallback(() => setRefreshKey(prev => prev + 1), []);
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) onUpload(file); };

  return (
    <div className="space-y-2">
      <div>
        <Label className="text-[8px] uppercase tracking-wide opacity-80">{t('designer.imageSearch')}</Label>
        <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t('designer.searchPlaceholder')} className="mt-1 h-7 text-[9px] bg-card/60 border-border/30" />
      </div>
      <div className="flex items-center justify-between bg-card p-1.5 rounded-lg border border-border/30">
        <span className="text-[8px] font-semibold">{t('designer.useGifs')}</span>
        <div className="flex items-center gap-2">
          <Button onClick={handleRefresh} variant="ghost" size="sm" className="h-6 px-2 text-[8px] font-semibold hover:bg-primary/10">
            <RefreshCw className="w-3 h-3 mr-1" />{t('designer.refreshImages')}
          </Button>
          <Switch checked={useGifs} onCheckedChange={setUseGifs} className="scale-75" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {filteredImages.map((img, i) => (
          <img 
            key={`${img.url}-${i}-${refreshKey}`} 
            src={img.url} 
            alt={img.tag} 
            loading="lazy" 
            onClick={() => onSelectImage(img.url)} 
            className={cn(
              'w-full aspect-[1.6/1] object-cover rounded-lg cursor-pointer border transition-all hover:scale-[1.03] hover:shadow-glow-cyan', 
              selectedImage === img.url ? 'border-primary scale-[1.01] shadow-glow-cyan' : 'border-transparent'
            )} 
          />
        ))}
      </div>
      <div>
        <input type="file" id="imageUpload" accept="image/*,.gif" onChange={handleFileChange} className="hidden" />
        <Button onClick={() => document.getElementById('imageUpload')?.click()} variant="outline" size="sm" className="w-full h-6 text-[8px] font-semibold border-border/50 hover:bg-primary/10">
          <Upload className="w-3 h-3 mr-1" />{t('designer.uploadImage')}
        </Button>
      </div>
    </div>
  );
}
