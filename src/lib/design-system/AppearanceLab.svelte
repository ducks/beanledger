<script lang="ts">
  import { onMount } from 'svelte';
  import beanMascot from './assets/bean-bookkeeper.png';
  import CurrentFlowPreview from './CurrentFlowPreview.svelte';
  import { fonts, palettes, presetFonts, tokenNames, type FontKey, type PaletteKey } from './appearance';
  import './appearance.css';
  let palette = $state<PaletteKey>('service');
  let display = $state<FontKey | 'local'>('bricolage');
  let body = $state<FontKey | 'local'>('system');
  let dark = $state(false);
  let headings = $state(true);
  let radius = $state('6px');
  let loaded = $state(false);
  let message = $state('');
  let localName = $state('');
  let localFace: FontFace | undefined;
  let fontLoad = 0;
  const family = (key: FontKey | 'local') => key === 'local' ? '"Lab Local", sans-serif' : fonts[key].family;
  const colors = $derived(palettes[palette][dark ? 'dark' : 'light']);
  const style = $derived(tokenNames.map((name,i)=>`--${name}:${colors[i]}`).join(';')+`;--display-font:${family(display)};--body-font:${family(body)};--heading-font:${family(headings?display:body)};--radius:${radius};color-scheme:${dark?'dark':'light'}`);
  function preset(value:PaletteKey) { palette=value; display=presetFonts[value]; radius=value==='studio'?'0px':value==='soft'?'12px':'6px'; }
  function settings() { return {palette, display:display==='local'?'system':display, body:body==='local'?'system':body,dark,headings,radius}; }
  onMount(() => {
    const query = new URLSearchParams(location.search);
    const p=query.get('palette'); if(p && Object.hasOwn(palettes,p)) palette=p as PaletteKey;
    const d=query.get('display'); if(d && Object.hasOwn(fonts,d)) display=d as FontKey;
    const b=query.get('body'); if(b && Object.hasOwn(fonts,b)) body=b as FontKey;
    dark=query.get('dark')==='true'; headings=query.get('headings')!=='false';
    const r=query.get('radius'); if(r && ['0px','6px','12px'].includes(r)) radius=r;
    loaded=true;
    return ()=>{fontLoad++;if(localFace) document.fonts.delete(localFace);};
  });
  $effect(() => {
    const chosen=settings();
    if(loaded) {
      const url=new URL(location.href);
      url.search=new URLSearchParams(Object.entries(chosen).map(([key,value])=>[key,String(value)])).toString();
      history.replaceState(null,'',url);
    }
  });
  async function loadFont(event:Event) {
    const input=event.currentTarget as HTMLInputElement;
    const file=input.files?.[0]; if(!file) return;
    const version=++fontLoad;
    if(file.size>8*1024*1024 || !/\.(woff2?|otf|ttf)$/i.test(file.name)) { message='Choose a WOFF, WOFF2, OTF, or TTF font under 8 MB.'; input.value=''; return; }
    try {
      const face=await new FontFace('Lab Local',await file.arrayBuffer()).load();
      if(version!==fontLoad) return;
      if(localFace) document.fonts.delete(localFace);
      document.fonts.add(face); localFace=face; localName=file.name; display='local';
      message='Local font loaded for this visit. It is not uploaded or included in shared links.';
    } catch { message='That font could not be loaded. Try another font file.'; }
    input.value='';
  }
  async function copyLink() {
    try { await navigator.clipboard.writeText(location.href); message='Appearance link copied.'+(localName?' Local font files are not shared; the link uses System sans in their place.':''); }
    catch { message='Copy the URL from your address bar to share this combination.'; }
  }
</script>
<svelte:head><title>BeanLedger · Appearance lab</title><meta name="description" content="Explore BeanLedger typography and color directions on a sample of the current planner."/></svelte:head>
<div class="appearance-lab">
  <header class="lab-header"><div><p class="lab-kicker">BeanLedger / visual identity studies</p><h1>Same work. Different character.</h1><p>Explore the look of the current planner. Mix type and color before choosing a direction.</p></div><button class="lab-button" onclick={copyLink}>Copy appearance link</button></header>
  <nav class="preset-row" aria-label="Visual directions">{#each Object.entries(palettes) as [key,value]}<button class:selected={palette===key} onclick={()=>preset(key as PaletteKey)}><span class="preset-number">{key==='service'?'A':key==='studio'?'B':'C'}</span><span><strong>{value.name}</strong><small>{value.description}</small></span><span class="swatches" aria-hidden="true">{#each value.light.slice(5,6).concat(value.light[7],value.light[0]) as color}<i style:background={color}></i>{/each}</span></button>{/each}</nav>
  <div class="lab-layout"><aside class="controls" aria-label="Appearance controls"><h2>Make a combination</h2><p class="control-note">These controls change the preview, never the live app.</p>
    <label for="palette">Color palette</label><select id="palette" bind:value={palette}>{#each Object.entries(palettes) as [key,value]}<option value={key}>{value.name}</option>{/each}</select>
    <button class="theme-button" aria-pressed={dark} onclick={()=>dark=!dark}>{dark?'Switch to light':'Switch to dark'}</button>
    <label for="display-font">Wordmark font</label><select id="display-font" bind:value={display}>{#each Object.entries(fonts) as [key,value]}<option value={key}>{value.label}</option>{/each}{#if localName}<option value="local">Local: {localName}</option>{/if}</select>
    <label class="checkbox"><input type="checkbox" bind:checked={headings}/>Use wordmark font for headings</label>
    <label for="body-font">Interface font</label><select id="body-font" bind:value={body}>{#each Object.entries(fonts) as [key,value]}<option value={key}>{value.label}</option>{/each}{#if localName}<option value="local">Local: {localName}</option>{/if}</select>
    <label for="radius">Corners</label><select id="radius" bind:value={radius}><option value="0px">Square</option><option value="6px">Slightly softened</option><option value="12px">Rounded</option></select>
    <details class="font-picker"><summary>Try a font file</summary><p>Have an Ocsquid or Rolla trial? Choose a font from your computer. It stays in this browser tab.</p><label for="local-font">Local font file</label><input id="local-font" type="file" accept=".woff,.woff2,.otf,.ttf" onchange={loadFont}/><p>Reloading removes the local font. Built-in fonts are freely licensed alternatives, not replicas.</p></details>
    <p class="feedback" role="status">{message}</p>
    <div class="references"><h3>Type references</h3><a href="https://creativemarket.com/alpercakici/10967210-Ocsquid-Fun-Display-Font">Ocsquid by alpercakici</a><a href="https://creativemarket.com/hipfonts/7468459-Rolla-Soft-Vintage-Typeface">Rolla by HipFonts</a><p>Neither commercial font is bundled here.</p></div>
  </aside><div class="canvas" style={style}>
    <section class="identity-board" aria-label="Identity specimen"><img class="bean-mascot" src={beanMascot} alt="Coffee bean mascot holding a clipboard" width="144" height="160"/><div class="specimen-type"><p class="specimen-word">BeanLedger</p><p>Specialty coffee. Everyday operations.</p></div><div class="specimen-detail"><div class="color-strip" aria-label="Palette colors">{#each colors.slice(0,3).concat(colors[5],colors[7]) as color}<span style:background={color} title={color}></span>{/each}</div><span class="numbers">0123456789 · 12 oz · 20.00 lb</span></div></section>
    <div class="screen-caption"><strong>Current roast-day layout</strong><span>Sample data · click Catalog, Reports, or Packaging to compare dialogs</span></div>
    <CurrentFlowPreview/>
  </div></div>
</div>
