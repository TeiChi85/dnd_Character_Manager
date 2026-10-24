// Tests the shipped module directly; no DOM, generated data or npm packages.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import core from '../js/core/rules-core.js';

let checks=0;
function eq(actual,expected){assert.deepEqual(actual,expected);checks++;}
for(const [score,mod] of [[1,-5],[8,-1],[9,-1],[10,0],[11,0],[12,1],[20,5],[30,10],['16',3],[null,0],[undefined,0],['invalid',0]])eq(core.abMod(score),mod);
for(let level=1;level<=20;level++){
  const base=level<=4?2:level<=8?3:level<=12?4:level<=16?5:6;
  eq(core.profBonusBase(level),base);
  eq(core.profBonus(level,1),base+1);
  eq(core.profBonus(level,0),base);
}
eq(core.autoHp(10,1),10);eq(core.autoHp(10,5),34);eq(core.autoHp(0,5),null);
eq(core.maxHP(10,5,2,null),44);eq(core.maxHP(10,5,-2,null),24);
eq(core.maxHP(10,1,-2,null),8);eq(core.maxHP(10,5,2,0),0);
eq(core.maxHP(0,5,2,37),37);eq(core.maxHP(0,5,2,null),null);
eq(core.skillBonus(16,3,false,false,0),3);
eq(core.skillBonus(16,3,true,false,1),7);
eq(core.skillBonus(16,3,true,true,1),10);
eq(core.skillBonus(8,3,false,true,-1),-2);
eq(core.saveBonus(8,3,false,1),0);eq(core.saveBonus(16,3,true,1),7);
eq(core.passiveScore(16,3,true,true,1),20);
eq(core.passiveScore(8,2,false,false,0),9);
const expected={full:[1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,9,9],
  pact:[1,1,2,2,3,3,4,4,5,5,5,5,5,5,5,5,5,5,5,5],
  '1/2':[0,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5],
  artificer:[1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5]};
for(const [caster,levels] of Object.entries(expected))levels.forEach((want,i)=>eq(core.maxSpellLevel(caster,i+1),want));
eq(core.maxSpellLevel('unknown',5),3);
// The legacy JScript runner does not provide Number.isNaN or globalThis.
const browser=vm.createContext({window:{}});
vm.runInContext('Number.isNaN=undefined;',browser);
vm.runInContext(readFileSync(new URL('../js/core/rules-core.js',import.meta.url),'utf8'),browser);
eq(browser.window.CCRulesCore.abMod(16),3);
eq(Object.keys(browser.window.CCRulesCore),Object.keys(core));
console.log(`${checks} rules core checks passed`);
