// Real app adapters with synthetic mechanics. No generated resources or API.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const source=name=>readFileSync(new URL(`../${name}`,import.meta.url),'utf8').replace(/\r\n/g,'\n');
let checks=0;
function eq(actual,expected){assert.deepEqual(JSON.parse(JSON.stringify(actual)),expected);checks++;}
function harness({inventory=[],features=[],conditions=[],edition='classic',active={}}={}){
  const element=()=>({innerHTML:'',value:'',style:{},handlers:{},classList:{add(){},remove(){},toggle(){},contains(){return false;}},
    addEventListener(type,handler){this.handlers[type]=handler;},
    querySelectorAll(selector){
      if(selector!=='.sh-equip')return [];
      this.equipButtons=[...this.innerHTML.matchAll(/<button[^>]*class="[^"]*\bsh-equip\b[^"]*"[^>]*data-i="(\d+)"/g)].map(match=>{
        const button=element();button.getAttribute=name=>name==='data-i'?match[1]:'';return button;
      });
      return this.equipButtons;
    },querySelector(){return element();},getAttribute(){return '';},appendChild(){}});
  const elements=new Map();
  const document={getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},
    querySelectorAll(){return [];},querySelector(){return element();},createElement:element,addEventListener(){},head:element(),body:element()};
  const context=vm.createContext({window:{scrollTo(){}},document,console});
  vm.runInContext(`window.CC_CLASSES=[{slug:'synthetic',name:'Wizard'}];window.CC_SPELLS=[{name:'Placeholder',level:0,cls:{}}];window.CC_ITEMS=${JSON.stringify(inventory)};
    window.testFeatures=${JSON.stringify(features)};window.CC_CONDMODS={synthetic:${JSON.stringify(conditions)}};`,context);
  for(const name of ['components','rule-text','creator','character-sheet','navigation','library'])vm.runInContext(source(`js/ui/${name}.js`),context);
  vm.runInContext(source('js/character-validation.js'),context);
  for(const name of ['rules-core','rules-engine','character-state'])vm.runInContext(source(`js/core/${name}.js`),context);
  const startup='initServerLibrary();\n  populateLevels();showEdition();showDataVersion();';
  const app=source('js/app.js');assert.ok(app.includes(startup));
  vm.runInContext(app.replace(startup,`
    featuresAndTraits=function(){return window.testFeatures;};
    window.testApp={state:state,derived:derivedState,ui:uiState,load:loadCharObj,reset:resetCharacter,acInfo:acInfo,itemBonuses:itemBonuses,totalScore:totalScore,
      attackRows:attackRows,abilitySaveDc:abilitySaveDc,fxTotals:fxTotals,renderSpells:renderSpells,renderSheet:renderSheet};
    // Route redraws to the real sheet; other wizard pages are outside this harness.
    render=renderSheet;
  `),context);
  vm.runInContext(`var S=window.testApp.state;S.slug='synthetic';S.className='Wizard';S.edition=${JSON.stringify(edition)};
    S.level=5;S.hdFaces=8;window.testApp.derived.fdata={classFeatures:[],subclasses:[]};
    S.abilities.override={Strength:16,Dexterity:18,Intelligence:18};
    S.equipment.inventory=${JSON.stringify(inventory)};S.sheet.active=${JSON.stringify(active)};
    window.CC_SPELLCAST={synthetic:{ability:'Intelligence',caster:'full'}};`,context);
  return {app:context.window.testApp,window:context.window,context,elements};
}

const gear=[
  {name:'Synthetic Armor',cat:'Armor',ac:14,armorKind:'medium',bonusAc:1,equipped:true},
  {name:'Synthetic Shield',cat:'Armor',ac:2,armorKind:'shield',bonusAc:1,equipped:true},
  {name:'Cloak of Protection',cat:'Wondrous',bonusAc:1,bonusSavingThrow:1,attune:true,attuned:true,equipped:true},
  {name:'Ioun Stone of Mastery',cat:'Wondrous',bonusProficiencyBonus:1,attune:true,attuned:true,equipped:true},
  {name:'Stone of Good Luck',cat:'Wondrous',bonusAbilityCheck:1,bonusSavingThrow:1,equipped:true},
  {name:'Unworn',bonusAc:99,equipped:false},
  {name:'Unattuned',bonusAc:99,attune:true,equipped:true},
];
let h=harness({inventory:gear});
eq(h.app.itemBonuses().ac,1);eq(h.app.itemBonuses().save,2);eq(h.app.itemBonuses().abilCheck,1);
eq(h.app.itemBonuses().prof,1);
eq(h.app.acInfo(),{total:21,label:'Synthetic Armor',parts:[['Synthetic Armor',14],['Dex (max 2)',2],['magic',1],['Synthetic Shield',3],['Cloak of Protection +1',1]]});
h.app.state.sheet.acOverride='25';eq(h.app.acInfo().computed,21);eq(h.app.acInfo().total,25);
h=harness({inventory:[{name:'Pending Armor Variant',cat:'Armor',bonusAc:5,equipped:true},
  {name:'Optional',bonusAc:1,attune:'optional',equipped:true}]});
eq(h.app.itemBonuses().ac,1);eq(h.app.acInfo().total,15);
h=harness({inventory:[{name:'Unattuned Armor',cat:'Armor',ac:12,armorKind:'light',bonusAc:3,attune:true,equipped:true}]});
eq(h.app.acInfo().total,16); // Mundane armor remains, magic does not.

const focus={name:'Synthetic Focus',cat:'Wondrous',bonusSpellAttack:2,bonusSpellSaveDc:1,equipped:true};
h=harness({inventory:[gear[3],focus]});
eq(h.app.abilitySaveDc(),17); // 8 + (3 + Mastery 1) + Int 4 + focus 1.
h.window.CC_SPELLS=[{name:'Synthetic Bolt',source:'TEST',level:0,cls:{classic:['Wizard']},scaling:{1:'1d6'},atk:true}];
h.app.state.spells.cantrips=['Synthetic Bolt|TEST'];
eq(h.app.attackRows().find(r=>r.name==='Synthetic Bolt').hit,'+8'); // Preserved legacy difference.
h.app.renderSpells();
assert.match(h.elements.get('spellsPanel').innerHTML,/>17<\/div><div class="sl">Spell Save DC/);checks++;
assert.match(h.elements.get('spellsPanel').innerHTML,/>\+10<\/div><div class="sl">Spell Attack/);checks++;
// Martial feature DC selection remains in the app, with item-adjusted proficiency.
h.window.CC_SPELLCAST={};h.window.testFeatures=[{name:'Synthetic DC',entries:['8 + your proficiency bonus + your Constitution modifier']}];
h.app.state.abilities.override.Constitution=16;eq(h.app.abilitySaveDc(),16);

const blade={name:'Synthetic Blade',cat:'Weapon',dmg:'1d4',dmgType:'S',wtype:'M',weaponCat:'simple',props:['Finesse'],bonusWeapon:1,equipped:true};
h=harness({inventory:[blade],conditions:[{kind:'martialArts',values:['1d6']} ]});
h.app.state.level=1;
eq(h.app.attackRows().find(r=>r.name==='Synthetic Blade').dmg,'1d6+5 slashing');
eq(h.app.attackRows().find(r=>r.name==='Synthetic Blade').hit,'+7');
h=harness({inventory:[blade,{...blade,name:'No Attunement',attune:true,attuned:false}]});
eq(h.app.attackRows().filter(r=>r.name==='Synthetic Blade').length,1);
h.app.state.choices['Fighting Style:0']='Dueling';
eq(h.app.attackRows().find(r=>r.name==='Synthetic Blade').dmg,'1d4+7 slashing');

const song={name:'Synthetic Song',entries:['As a bonus action, you gain a +2 bonus to your AC for 1 minute.']};
h=harness({features:[song],active:{'Synthetic Song':true}});
eq(h.app.fxTotals().ac,2);eq(h.app.acInfo().total,16);
h.app.state.sheet.active={};eq(h.app.acInfo().total,14);
const rage={name:'Synthetic Rage',entries:["As a bonus action, you gain a +2 bonus to the damage roll for 1 minute if you aren't wearing heavy armor."]};
h=harness({features:[rage],active:{'Synthetic Rage':true}});
eq(h.app.fxTotals().dmg,2);
h.app.state.equipment.inventory=[{name:'Heavy',armorKind:'heavy',ac:18,equipped:true}];
eq(h.app.fxTotals().dmg,0);

// Ability floor/bonus aggregation is tested through the real item parser.
h=harness({inventory:[{name:'Floor',ability:{static:{str:21}},equipped:true},
  {name:'Delta',ability:{str:2},equipped:true}]});
delete h.app.state.abilities.override.Strength;h.app.state.abilities.base.Strength=16;
eq(h.app.totalScore('Strength'),21);h.app.state.abilities.base.Strength=22;
eq(h.app.totalScore('Strength'),24);

// Actual sheet markup, real equipment/level event handlers, and the engine path.
for(const edition of ['classic','one']){
  h=harness({edition,inventory:[gear[0],gear[1],blade]});
  if(process.argv[2]==='--regression-probe'){
    const original=h.window.CCRulesEngine.calculateAC;
    h.window.CCRulesEngine.calculateAC=input=>({...original(input),total:77});
  }
  const sheet=()=>{
    h.app.renderSheet();
    const panel=h.elements.get('sheetPanel');
    assert.doesNotMatch(panel.innerHTML,/Sheet error|Loading class data/);checks++;
    return panel;
  };
  let panel=sheet();
  assert.match(panel.innerHTML,/id="acStat"[^>]*><div class="tv">20<\/div>/);checks++;
  assert.match(panel.innerHTML,/class="atk-hit">\+8<\/td>/);checks++;
  assert.match(panel.innerHTML,/1d4\+5 slashing/);checks++;
  // The existing sheet button removes medium armor, then renders updated AC.
  assert.ok(panel.equipButtons.length>=3);checks++;
  panel.equipButtons[0].handlers.click();
  eq(h.app.state.equipment.inventory[0].equipped,false);
  assert.match(panel.innerHTML,/id="acStat"[^>]*><div class="tv">17<\/div>/);checks++;
  // Raising level through the existing handler updates proficiency and the attack.
  h.elements.get('levelSelect').handlers.change({target:{value:'9'}});
  eq(h.app.state.level,9);
  assert.match(panel.innerHTML,/class="atk-hit">\+9<\/td>/);checks++;
  // A deliberately wrong engine result must reach the sheet, not a legacy fallback.
  const original=h.window.CCRulesEngine.calculateAC;
  h.window.CCRulesEngine.calculateAC=input=>({...original(input),total:77});
  panel=sheet();
  assert.match(panel.innerHTML,/id="acStat"[^>]*><div class="tv">77<\/div>/);checks++;
  assert.throws(()=>assert.match(panel.innerHTML,/id="acStat"[^>]*><div class="tv">17<\/div>/),assert.AssertionError);checks++;
}
// Verify an actual non-zero child-process exit for an injected engine regression.
const probe=spawnSync(process.execPath,[fileURLToPath(import.meta.url),'--regression-probe'],{encoding:'utf8'});
assert.ifError(probe.error);eq(probe.status,1);
assert.match(probe.stderr,/AssertionError/);checks++;
// State normalization feeds the unchanged rules after import, reset and switching.
for(const edition of ['classic','one']){
  h=harness({edition,inventory:[gear[0],gear[1],blade]});
  const fd={classFeatures:[],subclasses:[]};h.window.CC_FEATURE_DATA={synthetic:fd};
  const saved=h.window.CCCharacterState.serialize(h.app.state);
  saved.sheet.hpCurrent=3;saved.sheet.hpEdited=true;saved.sheet.res={'slot:1:0':true};
  h.app.load(saved);eq(h.app.acInfo().total,20);eq(h.app.state.sheet.hpCurrent,3);
  eq(h.app.attackRows().find(r=>r.name==='Synthetic Blade').hit,'+8');
  h.app.ui.equipment.filterQ='draft';h.app.reset();eq(h.app.ui.equipment.filterQ,'');eq(h.app.derived.fdata,null);
  h.app.load(saved);eq(h.app.acInfo().total,20);eq(h.app.state.sheet.res['slot:1:0'],true);
  h.app.ui.sheet.invAdd='draft & keepsake';h.app.renderSheet();
  assert.match(h.elements.get('sheetPanel').innerHTML,/id="invCustom"[^>]*value="draft &amp; keepsake"/);checks++;
  eq(Object.hasOwn(h.window.CCCharacterState.serialize(h.app.state).sheet,'invAdd'),false);
  h.elements.get('levelSelect').handlers.change({target:{value:'9'}});
  eq(h.app.attackRows().find(r=>r.name==='Synthetic Blade').hit,'+9');eq(h.app.state.sheet.hpCurrent,3);
  const next={...saved,name:'Next',equipment:{inventory:[]},sheet:{hpEdited:false},slug:'synthetic'};
  h.app.load(next);eq(h.app.acInfo().total,14);eq(h.app.state.sheet.hpCurrent,23);
  eq(h.app.state.sheet.res,{});eq(h.app.ui.equipment.filterQ,'');
}
console.log(`${checks} synthetic rules adapter checks passed`);
