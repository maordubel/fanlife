import { Screen } from '@/components/ui/Screen'
import { ReportLink } from '@/components/ui/ReportLink'
import { pickerRoster } from '@/lib/archive/player-master'
import { t } from '@/lib/i18n'

import { CountBoard } from './CountBoard'

/**
 * שער 7, לוח הספירה — reachable only from a sealed slip.
 *
 * There is no server work here and no seed in the URL: the count board reads the same
 * local store the ballot does, entirely client-side, and this file exists only to give
 * that client component the screen shell — the one `<SignPlate>` (rule: "one per
 * screen"), the reading-page ad slot `<Screen>` already reserves, and the footer.
 *
 * Not listed in `lib/gates.ts` — it is a room behind gate 7, reached by the "לוח
 * הספירה" link on a sealed slip, the same way `/derby/file` sits behind gate 11
 * without a gate of its own.
 *
 * **Two maps go down since 21.9.2026, both names only.** A vote is cast as the Player
 * Master's id now, so the board needs the NAME of each id to print it; and rows cast
 * before that were cast as display names, so it needs each name's id to fold them into
 * the same row (`lib/polls/board.ts` `mergeLegacyRows`). Every spelling the master
 * attached to a man — his aliases included — points at his one id.
 */
export default function CountBoardPage() {
  const picker = pickerRoster()
  const names: Record<string, string> = {}
  const legacy: Record<string, string> = {}
  for (const player of picker.players) {
    names[player.id] = player.nameHe
    legacy[player.nameHe] = player.id
    for (const alias of player.aliasesHe ?? []) legacy[alias] = player.id
  }
  return (
    <Screen title={t('screen.board.title')} sub={t('screen.board.sub')}>
      <CountBoard names={names} legacy={legacy} />
      <ReportLink />
    </Screen>
  )
}
