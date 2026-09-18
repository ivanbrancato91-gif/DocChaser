import { describe, expect, it } from 'vitest'
import { hasFeature, planRank } from '@/lib/billing'
describe('billing plans',()=>{it('orders plans',()=>{expect(planRank('starter')).toBe(1);expect(planRank('studio')).toBe(2);expect(planRank('team')).toBe(3)});it('gates advanced features by plan',()=>{expect(hasFeature('starter','ai')).toBe(false);expect(hasFeature('studio','ai')).toBe(true);expect(hasFeature('studio','team')).toBe(false);expect(hasFeature('team','analytics')).toBe(true)})})
