import {describe,it,expect} from 'vitest'
import {REGISTRY} from '@/lib/master/registry'
import {clubTheme,validateTheme,contrast,rivalForbiddenColors,forbiddenColor,historicalColorAllowed,themeStyle,type ColorPolicy} from '@/lib/clubs/theme'
import {uiLocale,localeDirection,localizedDate} from '@/lib/clubs/locale'
import {loadClub} from '@/lib/clubs/resolver'
import en from '@/messages/clubs/en.json'
import he from '@/messages/clubs/he.json'

const get=(id='hapoel-tel-aviv')=>clubTheme(REGISTRY.find(c=>c.id===id)!)
const approved:ColorPolicy={status:'approved',rivalIdentityColors:['#D71920','#FFFFFF','#008030'],approvedBy:'owner:test',approvedAt:'2026-10-01',legacyRules:[]}
describe('manifest-driven club identity',()=>{
 it('validates all registry themes and readable text pairs',()=>{for(const club of REGISTRY){const theme=clubTheme(club);expect(validateTheme(theme)).toEqual([]);expect(contrast(theme.primary,theme.onPrimary)).toBeGreaterThanOrEqual(4.5)}})
 it('treats unknown and prototype-shaped identities as neutral instead of reading inherited objects',()=>{for(const id of ['new-club','constructor','__proto__']){const theme=clubTheme({id,primary:'#1F4E9C'});expect(theme.pattern).toBe('plain');expect(validateTheme(theme)).toEqual([])}})
 it('gives the three core clubs distinct backgrounds, patterns and display fonts',()=>{const themes=['hapoel-tel-aviv','zrinjski-mostar','olympiacos'].map(get);for(const field of ['background','pattern'] as const)expect(new Set(themes.map(t=>t[field])).size).toBe(3);expect(new Set(themes.map(t=>t.fonts.display)).size).toBe(3)})
 it('rejects unreadable palettes, invalid colors and forbidden legacy yellow',()=>{const theme=get();expect(validateTheme({...theme,muted:theme.background})).toContain('Low contrast muted/background');expect(validateTheme({...theme,primary:'url(javascript:bad)'})).toContain('Invalid primary');expect(validateTheme({...theme,accent:'#FFD700'})).toContain('Forbidden accent')})
 it('subtracts club color families before applying approved rival colors',()=>expect(rivalForbiddenColors(['#C92D39','#FFFFFF'],approved)).toEqual(['#008030']))
 it('requires a dated owner approval for new rivalry restrictions',()=>{for(const policy of [{...approved,status:'pending' as const},{...approved,approvedBy:'automated:test'},{...approved,approvedAt:'2026-02-30'}])expect(rivalForbiddenColors(['#C92D39'],policy)).toEqual([])})
 it('applies a rival family across nearby shades but keeps own shared red',()=>{const theme=get('olympiacos');theme.colorPolicy=approved;theme.rivalForbiddenColors=rivalForbiddenColors(theme.identityColors,approved);expect(forbiddenColor(theme,'#0B7A3B')).toBe(true);expect(forbiddenColor(theme,theme.primary)).toBe(false)})
 it('keeps new rival policies pending and carries only the existing Hapoel rule',()=>{expect(get('zrinjski-mostar').rivalForbiddenColors).toEqual([]);expect(get('olympiacos').colorPolicy.status).toBe('pending');expect(forbiddenColor(get(),'#FFD700')).toBe(true);expect(forbiddenColor(get(),'#EEE9DE')).toBe(false)})
 it('limits historical color exemptions to a sourced, approved asset with rights',()=>{const theme=get();theme.historicalExemptions=[{assetPath:'/archive/kit.webp',source:'https://example.org/history',rightsStatus:'licensed',approvedBy:'owner:test',approvedAt:'2026-10-01',reason:'Exact historical shirt',historicalContext:'Documented cup shirt'}];expect(historicalColorAllowed(theme,'/archive/kit.webp')).toBe(true);expect(historicalColorAllowed(theme,'/archive/other.webp')).toBe(false);theme.historicalExemptions[0]!.approvedBy='automated:test';expect(historicalColorAllowed(theme,'/archive/kit.webp')).toBe(false)})
 it('loads the same identity in compiled content and maps every inherited token',async()=>{for(const id of ['hapoel-tel-aviv','zrinjski-mostar','olympiacos']){const data=(await loadClub(id))!.data;expect(data.theme).toEqual(get(id));expect(Object.keys(themeStyle(data.theme))).toEqual(expect.arrayContaining(['--red','--paper','--ink','--muted','--font-frank','--club-primary']))}})
})
describe('UI language and content are separate',()=>{
 it('uses English by default, handles unsupported locales and derives direction from language',()=>{expect(uiLocale()).toBe('en');expect(uiLocale('el')).toBe('en');expect(uiLocale('he')).toBe('he');expect(localeDirection('he')).toBe('rtl');expect(localeDirection('el')).toBe('ltr');expect(themeStyle(get(),'he')['--font-frank' as keyof ReturnType<typeof themeStyle>]).toBe("'Frank Ruhl Libre'")})
 it('formats dates consistently in UTC',()=>{expect(localizedDate('2024-05-02','en')).toBe('05/02/2024');expect(localizedDate('2024-05-02','he')).toBe('02.05.2024');expect(localizedDate('unknown','en')).toBe('unknown')})
 it('keeps translated message keys complete',()=>expect(Object.keys(he).sort()).toEqual(Object.keys(en).sort()))
})
