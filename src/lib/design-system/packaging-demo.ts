export type DemoProduct = { id: number; name: string; grams: number; qty: number; packaging: string };
export const demoBags = [
  { id: 'trade', label: '10.9oz TRADE' },
  { id: 'retail', label: '12oz Retail' },
  { id: 'pound', label: '1lb Retail' }
];
export const workspaceProducts = (): DemoProduct[] => [
  { id: 1, name: 'House blend · 12 oz', grams: .75 * 453.59237, qty: 24, packaging: 'retail' },
  { id: 2, name: 'Seasonal single origin · 1 lb', grams: 453.59237, qty: 12, packaging: 'pound' },
  { id: 3, name: 'Evening decaf · 12 oz', grams: .75 * 453.59237, qty: 8, packaging: 'retail' }
];
