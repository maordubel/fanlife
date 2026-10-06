import type {ReactNode} from 'react'
import {rivalBans,themeStyle,type ClubTheme} from '@/lib/clubs/theme'
import {PlayFx} from './PlayFx'
import {localeDirection,type UiLocale} from '@/lib/clubs/locale'

export function ClubSurface({children,theme,clubId,locale='en'}:{children:ReactNode;theme:ClubTheme;clubId:string;locale?:UiLocale}) {
 return <div className="club-theme club-surface mag-skin" data-club={clubId} data-pattern={theme.pattern} data-rival-no={rivalBans(theme).join(' ')||undefined} dir={localeDirection(locale)} lang={locale} style={themeStyle(theme,locale)}>{children}<PlayFx/></div>
}
