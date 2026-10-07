import type {ReactNode} from 'react'
import {rivalBans,themeStyle,type ClubTheme} from '@/lib/clubs/theme'
import {PlayFx} from './PlayFx'
import {TabBar} from '@/components/master/TabBar'
import {localeDirection,type UiLocale} from '@/lib/clubs/locale'

/** A club's gate pages. They carry the same fixed phone tab bar as the magazine — except LIFE, whose game owns the bottom of the glass. */
export function ClubSurface({children,theme,clubId,locale='en',tabbar=true}:{children:ReactNode;theme:ClubTheme;clubId:string;locale?:UiLocale;tabbar?:boolean}) {
 return <div className={`club-theme club-surface mag-skin${tabbar?' has-tabbar':''}`} data-club={clubId} data-pattern={theme.pattern} data-rival-no={rivalBans(theme).join(' ')||undefined} dir={localeDirection(locale)} lang={locale} style={themeStyle(theme,locale)}>{children}<PlayFx/>{tabbar&&<TabBar locale={locale}/>}</div>
}
