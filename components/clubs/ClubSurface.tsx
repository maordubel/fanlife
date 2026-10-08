import type {ReactNode} from 'react'
import {rivalBans,themeStyle,type ClubTheme} from '@/lib/clubs/theme'
import {PlayFx} from './PlayFx'
import {localeDirection,type UiLocale} from '@/lib/clubs/locale'

/**
 * A club page's theme and effects. The navigation is not here any more: `app/clubs/[slug]/layout.tsx` draws the club's
 * masthead and its own tab bar. `tabbar={false}` marks the page immersive (LIFE, a game in play mode) and the layout's
 * chrome steps out of the way.
 */
export function ClubSurface({children,theme,clubId,locale='en',tabbar=true}:{children:ReactNode;theme:ClubTheme;clubId:string;locale?:UiLocale;tabbar?:boolean}) {
 return <div className="club-theme club-surface mag-skin" data-club={clubId} data-pattern={theme.pattern} data-chrome={tabbar?undefined:'immersive'} data-rival-no={rivalBans(theme).join(' ')||undefined} dir={localeDirection(locale)} lang={locale} style={themeStyle(theme,locale)}>{children}<PlayFx/></div>
}
