export interface CardData {
  cardId: string;
  cvv: string;
  depositAddress: string;
  image: string;
  tokenAddress: string;
  tokenSymbol: string;
  tokenAmount: string;
  message: string;
  font: string;
  hasExpiry: boolean;
  expiryDate: string;
  created: string;
  locked: boolean;
  funded: boolean;
  fiatValue: string;
  solValue: string;
  step: number;
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  AUD: '$',
  CAD: '$',
  CHF: 'CHF',
  CNY: '¥',
  INR: '₹',
};

export type FontFamily = 
  | 'Inter'
  | 'Arial'
  | 'Courier New'
  | 'Georgia'
  | 'Times New Roman'
  | 'Verdana'
  | 'Roboto'
  | 'Open Sans'
  | 'Montserrat'
  | 'Poppins'
  | 'Lato'
  | 'Raleway'
  | 'Playfair Display'
  | 'Oswald'
  | 'Bebas Neue'
  | 'Orbitron'
  | 'Righteous'
  | 'Pacifico';

export const FONT_OPTIONS: { value: FontFamily; label: string }[] = [
  { value: 'Inter', label: 'Inter (Default)' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Courier New', label: 'Courier New' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Raleway', label: 'Raleway' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Oswald', label: 'Oswald' },
  { value: 'Bebas Neue', label: 'Bebas Neue' },
  { value: 'Orbitron', label: 'Orbitron (Crypto)' },
  { value: 'Righteous', label: 'Righteous' },
  { value: 'Pacifico', label: 'Pacifico (Script)' },
];
