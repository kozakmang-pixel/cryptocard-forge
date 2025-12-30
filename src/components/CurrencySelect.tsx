// src/components/CurrencySelect.tsx
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { DollarSign } from 'lucide-react';

const CURRENCIES = [
  { code: 'USD', prefix: '$', flag: '🇺🇸' }, 
  { code: 'EUR', prefix: '€', flag: '🇪🇺' },
  { code: 'GBP', prefix: '£', flag: '🇬🇧' }, 
  { code: 'JPY', prefix: '¥', flag: '🇯🇵' },
  { code: 'AUD', prefix: '$', flag: '🇦🇺' },
  { code: 'CAD', prefix: '$', flag: '🇨🇦' },
  { code: 'CHF', prefix: 'Fr', flag: '🇨🇭' },
  { code: 'CNY', prefix: '¥', flag: '🇨🇳' },
  { code: 'INR', prefix: '₹', flag: '🇮🇳' },
  { code: 'KRW', prefix: '₩', flag: '🇰🇷' },
  { code: 'BRL', prefix: 'R$', flag: '🇧🇷' },
  { code: 'MXN', prefix: '$', flag: '🇲🇽' },
  { code: 'SGD', prefix: '$', flag: '🇸🇬' },
  { code: 'HKD', prefix: '$', flag: '🇭🇰' },
  { code: 'SEK', prefix: 'kr', flag: '🇸🇪' },
] as const;

export function CurrencySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const selected = CURRENCIES.find((c) => c.code === value) || CURRENCIES[0];

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-28 h-7 text-[9px] font-bold bg-gradient-to-r from-card/95 to-card/90 border-secondary/40 backdrop-blur-md rounded-full px-2">
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-3 h-3 text-secondary" />
          <span className="flex items-center gap-1">
            <span>{selected.flag}</span>
            <span className="text-secondary">{selected.code}</span>
          </span>
        </div>
      </SelectTrigger>
      <SelectContent className="bg-card/95 border-secondary/40 backdrop-blur-md z-[1000] max-h-[300px]">
        {CURRENCIES.map((c) => (
          <SelectItem key={c.code} value={c.code} className="text-[9px]">
            <div className="flex items-center gap-2">
              <span>{c.flag}</span>
              <span className="font-bold">{c.code}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
