import {describe,expect,it} from 'vitest'
import {parseTeamCard} from '@/lib/fixtures/provider'
import {compare} from '@/lib/fixtures/teamcards'
import {FIXTURE_TEAMS} from '@/lib/fixtures/teams'

const celtic=FIXTURE_TEAMS.find(t=>t.clubId==='celtic')!
const json=(extra:Record<string,unknown>={})=>({teams:[
 {idTeam:'133647',strTeam:'Celtic',strSport:'Soccer',strCountry:'Scotland',idLeague:'4330',strLeague:'Scottish Premiership',intFormedYear:'1887',strStadium:'Celtic Park',intStadiumCapacity:'60411',strLocation:'Glasgow',strWebsite:'www.celticfc.com',strBadge:'https://r2.thesportsdb.com/images/media/team/badge/x.png',strEquipment:'https://r2.thesportsdb.com/images/media/team/equipment/y.png',...extra},
 {idTeam:'1',strTeam:'Celtic',strSport:'Basketball',strCountry:'Scotland'}]})
describe('TheSportsDB team card (owner, 12.10.2026)',()=>{
 it('reads one exact football team, old and new field names, https only',()=>{
  const c=parseTeamCard(json(),celtic)!
  expect(c).toMatchObject({teamId:'133647',founded:1887,stadium:'Celtic Park',capacity:60411,website:'https://www.celticfc.com',location:'Glasgow'})
  expect(c.badge).toMatch(/^https:/);expect(parseTeamCard(json({strBadge:null,strTeamBadge:'http://insecure/x.png'}),celtic)!.badge).toBeNull()
 })
 it('a namesake in another sport, or two matches, is not a club',()=>{
  expect(parseTeamCard({teams:[{idTeam:'1',strTeam:'Celtic',strSport:'Basketball',strCountry:'Scotland'}]},celtic)).toBeNull()
  expect(parseTeamCard({teams:[json().teams[0],{...json().teams[0],idTeam:'2'}]},celtic)).toBeNull()
 })
 it('compares with the club file and says where they differ, correcting neither',()=>{
  const ok=compare('celtic',parseTeamCard(json(),celtic));expect(ok.every(c=>c.agree)).toBe(true);expect(ok.length).toBe(2)
  const bad=compare('celtic',parseTeamCard(json({intFormedYear:'1888',strStadium:'Hampden Park'}),celtic));expect(bad.filter(c=>!c.agree).map(c=>c.field).sort()).toEqual(['founded','ground'])
 })
})
