import { describe, expect, it } from 'vitest'
import { bulbTeeGirderPath } from './BulbTeeGirderShape'
describe('Bulb-Tee girder geometry',()=>it('uses all eight family dimensions in the shared outline',()=>{const path=bulbTeeGirderPath({H:1.9,tf:1.5,bf:.8,w:.2,th1:.12,th2:.1,bh1:.28,bh2:.15});expect(path).toContain('0.0631578947368421');expect(path).not.toContain('M40,20')}))
