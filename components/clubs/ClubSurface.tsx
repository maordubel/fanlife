import type {ReactNode} from 'react'
import {themeStyle,type ClubTheme} from '@/lib/clubs/theme'
import {localeDirection,type UiLocale} from '@/lib/clubs/locale'

export function ClubSurface({children,theme,clubId,locale='en'}:{children:ReactNode;theme:ClubTheme;clubId:string;locale?:UiLocale}) {
 return <div className="club-theme club-surface mag-skin" data-club={clubId} data-pattern={theme.pattern} dir={localeDirection(locale)} lang={locale} style={themeStyle(theme,locale)}>{children}</div>
}
