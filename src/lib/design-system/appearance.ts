export const fonts = {
  bricolage: { label: 'Bricolage Grotesque · playful', family: '"Lab Bricolage", sans-serif' },
  fraunces: { label: 'Fraunces · soft vintage', family: '"Lab Fraunces", Georgia, serif' },
  space: { label: 'Space Grotesk · modernist', family: '"Lab Space", sans-serif' },
  system: { label: 'System sans · neutral', family: 'system-ui, sans-serif' }
};
export type FontKey = keyof typeof fonts;
export const palettes = {
  service: { name: 'Service station', description: 'Burgundy signage, porcelain cream, and turquoise enamel.', light: ['#f4efe2','#fffdf5','#38232c','#715d64','#cbbcb9','#812e4b','#ffffff','#246c69'], dark: ['#291e25','#392831','#fff4df','#d2b9c0','#75555f','#f0a5be','#321622','#91d6cc'] },
  studio: { name: 'Modernist office', description: 'Ink blue, cool drafting paper, and a signal-yellow accent.', light: ['#e9edf2','#f9fafc','#172b4d','#53627a','#bec9d8','#264eb0','#ffffff','#f2d34f'], dark: ['#151e30','#202e45','#f1f4fb','#b8c5db','#526581','#abc5ff','#172b4d','#f2d34f'] },
  soft: { name: 'Soft vintage', description: 'Butter yellow, cocoa, and generous rounded lettering.', light: ['#f4edda','#fff9e9','#382c28','#71604e','#d9c7a6','#75442b','#ffffff','#96402f'], dark: ['#2b2422','#3b302a','#fff0cd','#d1bca8','#75604d','#efc181','#302318','#efa68b'] }
};
export type PaletteKey = keyof typeof palettes;
export const presetFonts: Record<PaletteKey, FontKey> = { service: 'bricolage', studio: 'space', soft: 'fraunces' };
export const tokenNames = ['canvas','surface','ink','muted','line','accent','on-accent','secondary'];
