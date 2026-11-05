/**
 * The studio's three directors, as the desk shows them. The single definition is
 * scripts/football-stories/studio/directors.py (the writer and the pitch desk read it); this is its mirror for the
 * screen — id, name, tagline, what each one likes to pitch and his share of the house soul (studio/soul.py). `tests/stories-desk.test.ts` reads the Python file and
 * fails when the two disagree, so a renamed director can never show under his old name.
 */
export type Director={id:DirectorId;name:string;tagline:string;pitch_taste:string;owner_facet:string}
export const DIRECTOR_IDS=['broadcaster','terrace','trailer'] as const
export type DirectorId=typeof DIRECTOR_IDS[number]

export const DIRECTORS:readonly Director[]=[
 {id:"broadcaster",name:"The Broadcaster",tagline:"Live from the gantry: the clock, the score, the tension.",
  pitch_taste:"a decider, a derby, a title race, a final, a season-defining run",
  owner_facet:"His demand for precision and his feel for what is at stake: the right minute, the right score, the derby as THE match, the clock that makes a whole terrace hold its breath."},
 {id:"terrace",name:"The Terrace",tagline:"From the stands: the journey, the songs, the people who were there.",
  pitch_taste:"an away day, a rivalry, a cult season, a comeback the fans still talk about, a club's first time",
  owner_facet:"His heart: the capo on the fence, the father and son on the terrace, the kept ticket stub, the demolished ground remembered, self-irony and pride — football as belonging."},
 {id:"trailer",name:"The Trailer Cut",tagline:"Cinema: cold open on the climax, myth, slow motion, the big music.",
  pitch_taste:"the most dramatic single night, a final, a giant-killing, a turning point that changed a club",
  owner_facet:"His refusal of the boring and the banal: bold, original, cinematic, movement in every frame — the night told as a film supporters would queue to see."},
]

export const isDirector=(v:unknown):v is DirectorId=>typeof v==='string'&&(DIRECTOR_IDS as readonly string[]).includes(v)
export const directorOf=(id:unknown):Director|null=>DIRECTORS.find(d=>d.id===id)??null
/** A script option names its director by id (`director`) and by name (`angle`); either finds him. */
export function directorOfOption(o:{director?:string|null;angle?:string|null}):Director|null{
 return directorOf(o.director)??DIRECTORS.find(d=>d.name===o.angle)??null
}

/** The house soul (studio/soul.py): the owner's football heart that every director shares — a few of its lines, word
 *  for word, for the Directors tab. A voice, not a source: it shapes how a film is told and never adds a fact. */
export const HOUSE_SOUL={
 who:"A supporter first and a storyteller second: grew up on the terrace, stood behind the flags, kept the ticket of the night that mattered for forty years, and now builds films and games so that football stays the fans' own (\"the place football still belongs to the fans\").",
 feels:[
  "Football is belonging and inheritance — a father taking his son to the ground, the first shirt, the step on the terrace that becomes yours. The emotion lives in the people around the match as much as in the match.",
  "Memory is sacred: the old ground, the floodlight pylons, the club that was demolished, the ticket stub, the paper the morning after. Nostalgia is warm, never sugary.",
  "Rivalry is real and personal — the derby is THE match, the rival's colour does not belong on our page — and it is lived with pride, wit and respect for the game, never with hate for people."],
 demands:[
  "Accuracy is respect (\"I ask for precision in the details!\"): the right man, the right date, the right score. Nothing invented, ever — a wrong fact in front of supporters is a betrayal.",
  "Never boring, never mechanical (\"the movement fakes it\"; \"just reads results\"): it must have rhythm, movement, cinema — the bar is the films and games he loves, not \"good enough\".",
  "Show, don't list: the result on screen, the table, the clock, the people — a story with stakes, not a report."],
} as const
