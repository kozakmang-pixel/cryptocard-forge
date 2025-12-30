import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe } from 'lucide-react';
import { useEffect } from 'react';
import type { Language } from '@/lib/languageStore';

const LANGUAGES: { value: Language; label: string; flag: string }[] = [
  { value: 'en', label: 'English', flag: '🇺🇸' },
  { value: 'es', label: 'Español', flag: '🇪🇸' },
  { value: 'fr', label: 'Français', flag: '🇫🇷' },
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'pt', label: 'Português', flag: '🇧🇷' },
  { value: 'zh', label: '中文', flag: '🇨🇳' },
  { value: 'ja', label: '日本語', flag: '🇯🇵' },
  { value: 'ko', label: '한국어', flag: '🇰🇷' },
  { value: 'ru', label: 'Русский', flag: '🇷🇺' },
  { value: 'ar', label: 'العربية', flag: '🇸🇦' },
];

export function LanguageSelect({
  value,
  onChange,
}: {
  value: Language;
  onChange: (v: Language) => void;
}) {
  const selected =
    LANGUAGES.find((l) => l.value === value) || LANGUAGES[0];

  useEffect(() => {
    document.documentElement.lang = value;
    document.documentElement.dir = value === 'ar' ? 'rtl' : 'ltr';
  }, [value]);

  const placeholder = `${selected.flag} ${selected.label}`;

  return (
    <Select value={value} onValueChange={(v) => onChange(v as Language)}>
      <SelectTrigger className="w-28 h-7 text-[9px] font-bold bg-gradient-to-r from-card/95 to-card/90 border-secondary/40 backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          <Globe className="w-3 h-3 text-secondary" />
          <SelectValue placeholder={placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent className="bg-card/95 border-secondary/40 backdrop-blur-md z-[1000] max-h-[300px]">
        {LANGUAGES.map((l) => (
          <SelectItem
            key={l.value}
            value={l.value}
            className="text-[9px]"
          >
            <div className="flex items-center gap-2">
              <span>{l.flag}</span>
              <span>{l.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
