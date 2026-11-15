import { describe,it,expect } from 'vitest';
import { duplicateProductNames, nearbyProductWeights, normalizedCatalogName } from './catalog-duplicates';
import type { Product } from './types';
const product = (id:string,name:string,lbs:number,active=true):Product => ({id,name,lbs,active,group_id:'g',created_at:'2026-01-01'});
describe('catalog duplicate candidates',()=>{
  it('normalizes case, Unicode compatibility and whitespace but preserves punctuation',()=>{
    expect(normalizedCatalogName('  Ｃoffee\t BLEND ')).toBe('coffee blend');
    expect(normalizedCatalogName('coffee-blend')).not.toBe('coffee blend');
  });
  it('includes archived name matches without treating different coffees as duplicates',()=>{
    const a=product('a','House Blend',.68),b=product('b',' house  blend ',.68125,false),c=product('c','Decaf',.68);
    expect(duplicateProductNames([a,b,c])).toEqual([[a,b]]);
    expect(nearbyProductWeights([a,b,c])).toHaveLength(1);
    expect(nearbyProductWeights([a,c])).toEqual([]);
  });
  it('only proposes pairs within tolerance and ignores zero weights',()=>{
    const rows=[product('a','A',.68),product('b','B',.68125),product('c','C',.683433),product('d','D',1),product('e','E',0)];
    expect(nearbyProductWeights(rows)).toHaveLength(3);
    expect(nearbyProductWeights(rows,.01)).toEqual([]);
  });
});
