import 'server-only'
import * as bank from './question-master'
import {createTriviaEngine} from './trivia-engine'
export {ROUND_LENGTH,OPTION_COUNT,MULTI_OPTION_COUNT,MULTI_PICK_COUNT,YEAR_OPTION_COUNT,TOPIC_CAP,DEEP_CAP,TEMPLATE_CAP,MIXED} from './trivia-engine'
export type {RunSpec,RunPlan,Hint,TriviaQuestion,TriviaWindow,PublicQuestion,Verdict} from './trivia-engine'
/** Native compatibility facade: the original bank and exactly the same engine. */
export const {eligible, eraChips, topicDepth, dealSeededRun, dealPersonalRun, publicQuestion, publicQuestions, gradeAnswer, entitiesOfQuestions, decadeLabel, hintFor, topicCounts, windowedQuestionCount, deal, grade, auditRound, roundDifficulties, availableQuestionCount} = createTriviaEngine(bank)
