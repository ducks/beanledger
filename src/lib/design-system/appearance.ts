export const fonts = {
  bricolage: { label: 'Bricolage Grotesque · playful', family: '"Lab Bricolage", sans-serif' },
  fraunces: { label: 'Fraunces · soft vintage', family: '"Lab Fraunces", Georgia, serif' },
  space: { label: 'Space Grotesk · modernist', family: '"Lab Space", sans-serif' },
  system: { label: 'System sans · neutral', family: 'system-ui, sans-serif' }
};
export type FontKey = keyof typeof fonts;
export const palettes = {
  service: { name: 'Service station', description: 'Petrol blue, enamel cream, and a red sign above the door.', light: ['#f3efe5','#fffdf7','#172e35','#52646a','#c1ccc9','#a73326','#ffffff','#174f59'], dark: ['#13272e','#203840','#f6f0e3','#bac9cb','#4b656b','#f5a18c','#2e1813','#9bd2d7'] },
  studio: { name: 'Modernist office', description: 'A precise grid, geometric lettering, and vermilion against warm white.', light: ['#eeeee8','#fafaf5','#282b28','#5d625b','#c8cdc2','#a83621','#ffffff','#365846'], dark: ['#202622','#2d3530','#f3f2e7','#bdc9bc','#56685a','#f8ad83','#2c1b12','#c5d5a7'] },
  soft: { name: 'Soft vintage', description: 'Butter yellow, cocoa, and generous rounded lettering.', light: ['#f4edda','#fff9e9','#382c28','#71604e','#d9c7a6','#75442b','#ffffff','#96402f'], dark: ['#2b2422','#3b302a','#fff0cd','#d1bca8','#75604d','#efc181','#302318','#efa68b'] }
};
export type PaletteKey = keyof typeof palettes;
export const presetFonts: Record<PaletteKey, FontKey> = { service: 'bricolage', studio: 'space', soft: 'fraunces' };
export const tokenNames = ['canvas','surface','ink','muted','line','accent','on-accent','secondary'];
