import assert from 'node:assert/strict';
import model from '../js/core/character-state.js';
let checks=0;
function eq(a,b){assert.deepEqual(a,b);checks++;}
function rejects(value){assert.throws(()=>model.normalize(value));checks++;}
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const minimal={_app:'dnd-cc',_v:1};
const a=model.createDefault(),b=model.createDefault();
eq(a,b);eq(a.sheet,model.createGameplay());eq(a.equipment,model.createEquipment());
function assertIndependent(left,right){
  if(!left||typeof left!=='object')return;
  assert.notEqual(left,right);checks++;
  for(const key of Object.keys(left))assertIndependent(left[key],right[key]);
}
assertIndependent(a,b);
eq(Object.keys(model.serialize(b)).sort(),['_app','_v',...model.persistentKeys].sort());
a.sheet.res['hd:0']=true;a.equipment.inventory.push({name:'One'});a.abilities.base.Strength=20;
eq(b.sheet.res,{});eq(b.equipment.inventory,[]);eq(b.abilities.base.Strength,8);
eq(model.normalize(minimal),b);eq(model.normalize({...minimal,equipment:{},sheet:{},spells:{}}),b);
const gameplay={hpCurrent:3,hpTemp:'4',hpEdited:true,res:{'hd:1':true,'slot:2:0':true,'Resource:0':true},
  inspiration:true,deathSucc:1,deathFail:2,active:{Rage:true},conc:'Synthetic|TEST',xp:'1234',acOther:'2',acOverride:'19'};
for(const edition of ['classic','one']){
  const saved=freeze({...minimal,edition,manualHp:37,sheet:gameplay,
    equipment:{inventory:[{name:'Synthetic',equipped:true,attuned:true,qty:2}],currency:{gp:31}},
    extension:{unrecognized:[1,{value:'kept'}]},spells:{cantrips:['One'],spells:['Two']}});
  const normalized=model.normalize(saved),roundtrip=model.serialize(normalized);
  eq(roundtrip.sheet,gameplay);eq(roundtrip.manualHp,37);eq(roundtrip.equipment.inventory,saved.equipment.inventory);
  eq(roundtrip.extension,saved.extension);eq(roundtrip.equipment.currency.gp,31);
  eq(model.serialize(model.normalize(roundtrip)),roundtrip);eq(model.serialize(normalized),roundtrip);
  normalized.equipment.inventory[0].qty=99;eq(saved.equipment.inventory[0].qty,2);
  roundtrip.extension.unrecognized.push('change');eq(saved.extension.unrecognized.length,2);
}
const legacy={...minimal,openPanels:{one:true},fdata:{large:true},id:'server-id',revision:4,updated_at:'today',
  equipment:{filterType:'Weapon',filterQ:'Blade',extension:7},spells:{q:'Fire',levelFilter:'2',preview:'Spell'},
  sheet:{invQ:'Blade',invAdd:'Draft',acEditOpen:true,dark:true,hpCurrent:7,hpEdited:true,extension:8}};
const clean=model.serialize(model.normalize(freeze(legacy)));
for(const key of ['id','revision','updated_at','fdata','openPanels']){eq(Object.hasOwn(clean,key),false);}
eq(clean.equipment.extension,7);eq(clean.sheet.extension,8);
for(const [parent,keys] of Object.entries({equipment:['filterType','filterQ'],spells:['q','levelFilter','preview'],sheet:['invQ','invAdd','acEditOpen','dark']}))
  for(const key of keys)eq(Object.hasOwn(clean[parent],key),false);
eq(clean.sheet.hpCurrent,7);eq(clean.sheet.hpEdited,true);eq(clean._app,'dnd-cc');eq(clean._v,1);
const independent=model.serialize(b);independent.sheet.res.used=true;eq(b.sheet.res,{});
eq(JSON.stringify(model.serialize({...b,extra:{z:1,a:2}})),JSON.stringify(model.serialize({...b,extra:{a:2,z:1}})));
for(const key of ['__proto__','constructor','prototype'])rejects(JSON.parse(`{"_app":"dnd-cc","_v":1,"extension":{"${key}":{}}}`));
for(const invalid of [{...minimal,sheet:null},{...minimal,level:21},{...minimal,equipment:{inventory:[{}]}},{...minimal,portrait:'invalid'},null])rejects(invalid);
const cyclic={...minimal};cyclic.extra=cyclic;rejects(cyclic);
rejects({...minimal,extension:()=>0});
const accessor={...minimal};Object.defineProperty(accessor,'extension',{enumerable:true,get(){throw new Error('getter must not run');}});rejects(accessor);
const list=[];Object.defineProperty(list,'0',{enumerable:true,get(){throw new Error('getter must not run');}});rejects({...minimal,extension:list});
eq(model.serialize({...b,extension:[undefined,1]}).extension,[null,1]);
console.log(`${checks} character state and serialization checks passed`);
