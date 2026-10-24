import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import engine from '../js/core/rules-engine.js';

let checks=0;
function eq(actual,expected){assert.deepEqual(actual,expected);checks++;}
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}
function ac(extra={}){return engine.calculateAC(freeze({dexModifier:3,armor:null,shield:null,...extra}));}
const armor=(kind,base,bonus=0)=>({name:kind,armorKind:kind,ac:base,bonus});
const shield={name:'Shield',ac:2,bonus:1};
eq(ac(),{total:13,label:'Unarmoured',parts:[['Base',10],['Dex',3]]});
eq(ac({dexModifier:-2}).total,8);
eq(ac({armor:armor('light',12,1)}).total,16);
eq(ac({armor:armor('medium',14,1)}).total,17);
eq(ac({armor:armor('medium',14),dexModifier:-2}).total,12);
eq(ac({armor:armor('heavy',18,1),dexModifier:-2}).total,19);
eq(ac({shield}).total,16);
eq(ac({armor:armor('medium',14,1),shield,defenseStyle:true,
  bonuses:[{label:'Protection +1',value:1},{label:'Active',value:2}],other:'-1'}),
  {total:23,label:'medium',parts:[['medium',14],['Dex (max 2)',2],['magic',1],['Shield',3],['Defense style',1],['Protection +1',1],['Active',2],['Other',-1]]});
eq(ac({defenseStyle:true}).total,13);
const monk={label:'Unarmored Defense',base:10,noShield:true,modifiers:[{label:'Dex',value:3},{label:'Wis',value:4}]};
const natural={label:'Natural Armor',base:13,modifiers:[{label:'Dex',value:3}]};
eq(ac({alternativeFormulas:[monk,natural]}).total,17);
eq(ac({alternativeFormulas:[monk,natural],shield}).total,19);
eq(ac({alternativeFormulas:[monk],armor:armor('light',11)}).total,14);
eq(ac({alternativeFormulas:[{...monk,noShield:false}],shield}).total,20);
const shell={label:'Shell',base:17,flat:true,modifiers:[]};
eq(ac({alternativeFormulas:[shell],armor:armor('light',11),shield}).total,20);
eq(ac({alternativeFormulas:[{...shell,noShield:true}],shield}).total,16);
eq(ac({alternativeFormulas:[shell],armor:armor('heavy',18)}).label,'heavy');
eq(ac({alternativeFormulas:[shell],armor:armor('heavy',17)}).label,'Shell');
eq(ac({other:'2',manualOverride:'0'}),{total:0,label:'Manual override',parts:[['Override',0]],computed:15,overridden:true});
for(const override of ['',null,undefined,'invalid'])eq(ac({manualOverride:override}).total,13);
eq(ac({other:'invalid'}).total,13);

eq(engine.spellModifiers({abilityModifier:4,proficiencyBonus:4,attackBonus:2,saveBonus:1}),{attack:10,saveDC:17});
eq(engine.spellModifiers({abilityModifier:-1,proficiencyBonus:2}),{attack:1,saveDC:9});
// Input proficiency already contains the Ioun Stone bonus.
eq(engine.spellModifiers({abilityModifier:4,proficiencyBonus:5,attackBonus:1,saveBonus:1}),{attack:10,saveDC:18});

const weapon={name:'Synthetic Blade',wtype:'M',weaponCat:'simple',props:[],bonus:1,dmg:'1d4'};
function attack(extra={}){return engine.weaponAttack(freeze({weapon,strModifier:3,dexModifier:4,
  proficiencyBonus:3,effectDamage:2,itemCriticalThreshold:20,styles:{},...extra}));}
eq([attack().attack,attack().damageModifier,attack().usesStrength],[7,6,true]);
eq([attack({weapon:{...weapon,props:['Finesse']}}).attack,attack({weapon:{...weapon,props:['Finesse']}}).damageModifier],[8,5]);
eq(attack({weapon:{...weapon,props:['Finesse']},strModifier:4}).damageModifier,7);
eq(attack({weapon:{...weapon,wtype:'R'},styles:{archery:true,dueling:true,thrown:true}}).attack,10);
eq(attack({weapon:{...weapon,wtype:'R'},styles:{archery:true,dueling:true,thrown:true}}).damageModifier,5);
eq(attack({styles:{dueling:true}}).damageModifier,8);
eq(attack({weapon:{...weapon,props:['Two-Handed']},styles:{dueling:true,greatWeapon:true}}).damageModifier,6);
eq(attack({weapon:{...weapon,props:['Versatile']},styles:{dueling:true,greatWeapon:true}}).styles,
  {dueling:true,thrown:false,archery:false,greatWeapon:true});
eq(attack({weapon:{...weapon,props:['Thrown']},styles:{dueling:true,thrown:true}}).damageModifier,10);
eq(attack({strModifier:-2,dexModifier:-1,effectDamage:0}).damageModifier,-1);
eq(attack({martialArtsDie:'1d8',edition:'classic'}).die,'1d8');
eq(attack({martialArtsDie:'1d8',edition:'classic'}).attack,8);
eq(attack({weapon:{...weapon,dmg:'1d10'},martialArtsDie:'1d8'}).die,'1d10');
eq(attack({weaponCriticalThreshold:19,itemCriticalThreshold:18}).criticalThreshold,18);
eq(attack({weaponCriticalThreshold:18,itemCriticalThreshold:19}).criticalThreshold,18);
eq(attack({weaponCriticalThreshold:'invalid'}).criticalThreshold,20);
for(const edition of ['classic','one']){
  eq(engine.isMonkWeapon({...weapon,wtype:'R'},edition),false);
  eq(engine.isMonkWeapon(weapon,edition),true);
  eq(engine.isMonkWeapon({...weapon,weaponCat:'martial',props:['Heavy']},edition),false);
}
eq(engine.isMonkWeapon({...weapon,props:['Two-Handed']},'classic'),false);
eq(engine.isMonkWeapon({...weapon,props:['Two-Handed']},'one'),true);
eq(engine.isMonkWeapon({...weapon,weaponCat:'martial',props:['Light']},'classic'),false);
eq(engine.isMonkWeapon({...weapon,weaponCat:'martial',props:['Light']},'one'),true);
eq(engine.isMonkWeapon({...weapon,name:'Shortsword',weaponCat:'martial'},'classic'),true);
eq(engine.isMonkWeapon(null,'one'),false);
eq(engine.martialArtsDie({die:'1d6',body:'',shield:false}),'1d6');
eq(engine.martialArtsDie({die:'1d6',body:'light',shield:false}),'');
eq(engine.martialArtsDie({die:'1d6',body:'',shield:true}),'');
eq(engine.unarmedAttack({strModifier:-2,dexModifier:4,proficiencyBonus:3,effectDamage:0}),
  {attack:1,die:'',damageModifier:0,flatDamage:1});
eq(engine.unarmedAttack({strModifier:3,dexModifier:4,proficiencyBonus:3,effectDamage:2,martialArtsDie:'1d6'}),
  {attack:7,die:'1d6',damageModifier:6,flatDamage:null});
eq(engine.featureAttack({strModifier:3,dexModifier:4,proficiencyBonus:3,effectDamage:2,finesse:true}),
  {attack:7,usesStrength:false,damageModifier:4});
eq(engine.featureAttack({strModifier:3,dexModifier:4,proficiencyBonus:3,effectDamage:2,finesse:false}),
  {attack:6,usesStrength:true,damageModifier:5});
for(const kind of [null,{}, {melee:true,str:false},{melee:false,str:true}])eq(engine.effectDamage(kind,3),0);
eq(engine.effectDamage({melee:true,str:true},3),3);
eq(engine.biggerDie('1d6','1d8'),'1d8');eq(engine.biggerDie('1d8','1d6'),'1d8');
eq(engine.biggerDie('2d6','1d4'),'1d4'); // Legacy single-die comparison, not average damage.
eq(engine.scaledDie({17:'4d6',1:'1d6',5:'2d6',11:'3d6'},10),'2d6');
eq(engine.scaledDie({5:'2d6'},4),'');

const items=freeze([
  {name:'Protection',ac:1,save:1,saveConc:2,crit:19,abilities:[{name:'Strength',floor:19}]},
  {name:'Mastery',prof:1},
  {name:'Luck',abilCheck:1,save:1},
  {name:'Strength',abilities:[{name:'Strength',floor:21},{name:'Strength',delta:2}],crit:18},
  {name:'Focus',spellAtk:2,spellDc:1,grantsProficiency:true,speed:[{op:'multiply',kind:'walk',val:2}]},
]);
const ib=engine.aggregateItems(items);
eq([ib.ac,ib.save,ib.saveConc,ib.prof,ib.abilCheck,ib.spellAtk,ib.spellDc,ib.crit],[1,2,2,1,1,2,1,18]);
eq(ib.abil.Strength,{delta:2,floor:21,from:['Protection','Strength']});
eq(ib.sources.ac,['Protection +1']);eq(ib.sources.crit,['Strength (crit on 18+)']);
eq(ib.profItems,['Focus']);eq(ib.speed,[{op:'multiply',kind:'walk',val:2,from:'Focus'}]);
eq(engine.abilityWithItems(16,ib.abil.Strength),21);
eq(engine.abilityWithItems(22,ib.abil.Strength),24);
eq(engine.abilityWithItems(16,null),16);
eq(engine.aggregateItems([{name:'Penalty',save:-1}]).sources.save,['Penalty -1']);
eq(engine.aggregateItems([]).crit,20);
// Changing a returned object must not change a future call or an input record.
ib.abil.Strength.from.push('changed');ib.speed[0].val=99;
eq(engine.aggregateItems(items).speed[0].val,2);
eq(engine.aggregateItems(items).abil.Strength.from,['Protection','Strength']);

const mods={dmg:2,ac:0,acAbility:'Intelligence',speed:10,resist:['Fire'],advAbility:['Strength']};
const effects=freeze({abilityScores:{Intelligence:18},effects:[
  {name:'Active A',mods},{name:'Blocked',blocked:true,mods},
  {name:'Active B',mods:{...mods,dmg:1,ac:1,acAbility:'',resist:['Fire','Cold']}},
]});
const fx=engine.aggregateEffects(effects);
eq([fx.dmg,fx.ac,fx.speed],[3,5,20]);
eq(fx.resist,['Fire','Cold']);eq(fx.advAbility,['Strength']);
eq(fx.sources.ac,['Active A','Active B']);
eq(engine.aggregateEffects({effects:[],abilityScores:{}}).dmg,0);
eq(engine.aggregateEffects({effects:[{name:'Low',mods}],abilityScores:{Intelligence:8}}).ac,-1);

// The classic browser script and CommonJS export expose the same implementation.
const context=vm.createContext({window:{}});
for(const name of ['rules-core','rules-engine'])vm.runInContext(readFileSync(new URL(`../js/core/${name}.js`,import.meta.url),'utf8'),context);
eq(JSON.parse(JSON.stringify(context.window.CCRulesEngine.calculateAC({dexModifier:3}))),ac());
eq(Object.keys(context.window.CCRulesEngine),Object.keys(engine));
console.log(`${checks} rules engine checks passed`);
