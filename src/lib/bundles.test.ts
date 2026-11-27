import { describe, expect, it } from 'vitest';
import { cycleStart, nextCycle, cycleLabel, expandBundle, revisionFor, type Bundle, type BundleRevision } from './bundles';
import type { Product } from './types';
import { parseWithConfigDetails } from './csv/formats/generic';

const products: Product[] = ['Ethiopia','Colombia','Kenya'].map((name,i)=>({id:`p${i}`,name,lbs:100/453.59237,group_id:`g${i}`,active:true,created_at:''}));
const revision: BundleRevision = {id:'r1',bundle_id:'b1',cycle_start:'2026-12-01',created_at:'',imported_lines:0,components:products.map(p=>({product_id:p.id,name:p.name,lbs:p.lbs,group_id:p.group_id,quantity:1}))};
const bundle: Bundle = {id:'b1',name:'Subscription',contents_mode:'rotating',quantity_mode:'bags',active:true,revisions:[revision]};

describe('bundle cycles',()=>{
  it('uses half-month boundaries, including leap years and year rollover',()=>{
    expect(cycleStart('2026-12-14')).toBe('2026-12-01');
    expect(cycleStart('2026-12-15')).toBe('2026-12-15');
    expect(nextCycle('2026-12-31')).toBe('2027-01-01');
    expect(cycleLabel('2028-02-15')).toBe('2028-02-15 – 2028-02-29');
    expect(cycleLabel('2026-02-15')).toBe('2026-02-15 – 2026-02-28');
    expect(revisionFor(bundle,'2026-12-14')?.id).toBe('r1');
    expect(revisionFor(bundle,'2026-12-15')).toBeUndefined();
  });
});
describe('bundle expansion',()=>{
  it('expands each subscription before aggregation',()=>{
    const csv='Name,Qty\nSubscription,2\nSubscription,2';
    const parsed=parseWithConfigDetails(csv,{productNameColumn:'Name',quantityColumn:'Qty',aggregate:true},true);
    expect(parsed.rows).toEqual([{productName:'Subscription',quantity:4}]);
    const expanded=parsed.names.flatMap(r=>expandBundle(bundle,revision,r.quantity,products));
    expect(expanded.map(c=>c.product_id)).toEqual(['p0','p1','p0','p1']);
    expect(expanded.reduce((sum,c)=>sum+c.quantity,0)).toBe(4);
  });
  it('multiplies packs and preserves the actual sample product size',()=>{
    const result=expandBundle({...bundle,quantity_mode:'packs'},revision,4,products);
    expect(result.map(c=>c.quantity)).toEqual([4,4,4]);
    expect(result.reduce((n,c)=>n+c.lbs*c.quantity,0)*453.59237).toBeCloseTo(1200);
  });
  it.each([0,-1,1.5,4,NaN,Infinity,100001])('rejects invalid bag quantity %s',qty=>{
    expect(()=>expandBundle(bundle,revision,qty,products)).toThrow();
  });
  it('rejects unavailable components and oversized expanded quantities',()=>{
    expect(()=>expandBundle(bundle,revision,1,products.slice(0,2))).toThrow('unavailable');
    expect(()=>expandBundle({...bundle,quantity_mode:'packs'},{...revision,components:[{...revision.components[0],quantity:1000}]},1000,products)).toThrow('exceeds');
  });
  it('retains invalid source quantities for bundle validation rather than rounding or dropping them',()=>{
    const parsed=parseWithConfigDetails('Name,Qty\nSubscription,2.5\nSubscription,2bags\nSubscription,0',{productNameColumn:'Name',quantityColumn:'Qty'},true);
    expect(parsed.names).toHaveLength(3);
    for(const row of parsed.names) expect(()=>expandBundle(bundle,revision,row.quantity,products)).toThrow();
  });
});
