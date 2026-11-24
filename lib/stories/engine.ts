/** The film engine's parts, as the studio desk shows them (Status → The engine). One row per part of
 *  scripts/football-stories/studio that the owner can see in a film and switch from the repository's Actions variables.
 *  Data only: the worker reads the variables (.github/workflows/stories-worker.yml), this file only names them. */
export type EnginePart = { id: string; name: string; what: string; since: string; variable: string; off: string }

export const ENGINE: EnginePart[] = [
  { id: 'raconteur', name: 'The Raconteur', since: '23.11.2026', variable: 'STORIES_HOUSE_LEAD', off: 'unit',
    what: 'The lead house writer. Opens on the smallest true detail of the biggest night, tells a tie as one scene in two acts, one dry aside a scene, the final in five short beats. Never reads a tally aloud.' },
  { id: 'story-brief', name: 'Story-first brief', since: '23.11.2026', variable: '—', off: '—',
    what: 'The same rules in the brief the model writer gets: the small door, scenes, short beats, the shirt and the player said so they can be shown.' },
  { id: 'archive-props', name: 'The archive on screen', since: '23.11.2026', variable: 'STORIES_ARCHIVE_PROPS', off: '0',
    what: 'The season\'s shirt from the kit archive comes down when the line says the shirt; a named player\'s archive card turns in on his name (position, years, games, goals, one true line).' },
  { id: 'life', name: 'Life in the frame', since: '23.11.2026', variable: 'STORIES_LIFE', off: '0',
    what: 'Movement inside the picture: the painted crowd rows bouncing or swaying, falling paper on joy, floodlight beams, flare light, dust in the light, the ball in flight.' },
  { id: 'press', name: 'The press', since: '23.11.2026', variable: 'STORIES_PRESS', off: '0',
    what: 'The collage look. The film opens on a printed front page: the narrator\'s first sentence stamped as the headline, a halftone photograph, a cut-out figure, the number ringed by hand. A line with no picture of its own becomes a pasted collage on newsprint in the club\'s colour, boiling at 8 frames a second.' },
  { id: 'reveal', name: 'Your pictures and clips', since: '24.11.2026', variable: 'STORIES_REVEAL', off: '0',
    what: 'Every picture or video clip you upload (or pin in Drive) enters under its own line with motion and the line\'s words: a print sliding onto newsprint, the paper torn open, strips closing, a frame the camera flies through, a print dropped on the pile. Never a slide; clips play muted under the narration.' },
  { id: 'gazette-cover', name: 'The Terrace Gazette cover', since: '24.11.2026', variable: 'STORIES_GAZETTE_COVER', off: '0',
    what: 'Thumbnail 1 is a front page of our own: your picture pasted as a print, the line the film says over it as the headline, the number ringed by hand. The same picture opens the film on its front page.' },
  { id: 'atlas', name: 'The atlas', since: '17.11.2026', variable: 'STORIES_ATLAS', off: '0',
    what: 'A named place is a camera flight over a printed map with the route drawn.' },
  { id: 'house-first', name: 'House crew writes first', since: '16.11.2026', variable: 'STORIES_WRITER', off: '(empty)',
    what: 'Set to "house" and every film is written by the house crew without asking Google. Empty: Google writes when it answers, the house when it cannot.' },
]
