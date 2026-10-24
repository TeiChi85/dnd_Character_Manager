(function(root){
  "use strict";
  var core=root.CCRulesCore;
  if(typeof module!=="undefined"&&module.exports)core=require("./rules-core.js");

  // Inputs are resolved mechanics, never inventory, feature prose or character state.
  function calculateAC(input){
    var dex=input.dexModifier,body=input.armor,shield=input.shield;
    var formulas=input.alternativeFormulas||[],opts=[];
    var shieldBonus=shield?((shield.ac||2)+shield.bonus):0;
    formulas.forEach(function(f){
      if(!f.flat||f.noShield&&shield)return;
      opts.push({label:f.label,parts:[[f.label,f.base]],total:f.base});
    });
    if(body){
      var b=body.ac||10,dexPart=body.armorKind==="light"?dex:(body.armorKind==="medium"?Math.min(dex,2):0);
      var parts=[[body.name,b]];
      if(body.armorKind!=="heavy")parts.push([body.armorKind==="medium"?"Dex (max 2)":"Dex",dexPart]);
      if(body.bonus)parts.push(["magic",body.bonus]);
      opts.push({label:body.name,parts:parts,total:b+dexPart+body.bonus});
    }else{
      opts.push({label:"Unarmoured",parts:[["Base",10],["Dex",dex]],total:10+dex});
      formulas.forEach(function(f){
        if(f.flat||f.noShield&&shield)return;
        var p=[[f.label,f.base]],total=f.base;
        f.modifiers.forEach(function(m){p.push([m.label,m.value]);total+=m.value;});
        opts.push({label:f.label,parts:p,total:total});
      });
    }
    var best=opts[0];
    opts.forEach(function(o){if(o.total>best.total)best=o;});
    var finalParts=best.parts.slice(),total=best.total;
    if(shieldBonus){finalParts.push([shield.name,shieldBonus]);total+=shieldBonus;}
    if(body&&input.defenseStyle){finalParts.push(["Defense style",1]);total+=1;}
    (input.bonuses||[]).forEach(function(bonus){
      if(bonus.value){finalParts.push([bonus.label,bonus.value]);total+=bonus.value;}
    });
    var other=parseInt(input.other,10)||0;
    if(other){finalParts.push(["Other",other]);total+=other;}
    var ov=input.manualOverride;
    if(ov!==""&&ov!=null&&!isNaN(parseInt(ov,10))){
      var value=parseInt(ov,10);
      return {total:value,label:"Manual override",parts:[["Override",value]],computed:total,overridden:true};
    }
    return {total:total,label:best.label,parts:finalParts};
  }

  // proficiencyBonus is already item-adjusted by the caller. Never add it twice.
  function spellModifiers(input){
    var base=input.proficiencyBonus+input.abilityModifier;
    return {attack:base+(input.attackBonus||0),saveDC:8+base+(input.saveBonus||0)};
  }
  function dieFaces(d){var m=/^\s*1d(\d+)\s*$/.exec(String(d));return m?parseInt(m[1],10):0;}
  function biggerDie(a,b){return dieFaces(b)>dieFaces(a)?b:a;}
  function scaledDie(sc,L){var best="",bl=-1;for(var k in sc){var n=+k;if(n<=L&&n>bl){bl=n;best=sc[k];}}return best;}
  function martialArtsDie(input){return input.body||input.shield?"":input.die;}
  function isMonkWeapon(w,edition){
    if(!w||w.wtype==="R")return false;
    var p=w.props||[],light=p.indexOf("Light")>=0,twoH=p.indexOf("Two-Handed")>=0,heavy=p.indexOf("Heavy")>=0;
    if(edition==="one")return w.weaponCat==="simple"||(w.weaponCat==="martial"&&light);
    if(/^shortsword$/i.test(w.name||""))return true;
    return w.weaponCat==="simple"&&!twoH&&!heavy;
  }
  function effectDamage(kind,damage){return kind&&kind.melee&&kind.str?damage:0;}
  function abilityWithItems(score,bonus){
    if(!bonus)return score;
    var total=score+bonus.delta;
    return bonus.floor!=null&&bonus.floor>total?bonus.floor:total;
  }
  function weaponAttack(input){
    var w=input.weapon,p=w.props||[],melee=w.wtype!=="R";
    var finesse=p.indexOf("Finesse")>=0,thrown=p.indexOf("Thrown")>=0;
    var twoH=p.indexOf("Two-Handed")>=0,versatile=p.indexOf("Versatile")>=0;
    var monk=!!input.martialArtsDie&&isMonkWeapon(w,input.edition),useDex=finesse||monk;
    var str=input.strModifier,dex=input.dexModifier;
    var ability=melee?(useDex?Math.max(str,dex):str):dex;
    var usesStr=melee&&(!useDex||str>=dex),styles=input.styles||{};
    var dueling=!!(styles.dueling&&melee&&!twoH),thrownStyle=!!(styles.thrown&&thrown&&melee);
    var archery=!!(styles.archery&&!melee),greatWeapon=!!(styles.greatWeapon&&melee&&(twoH||versatile));
    return {melee:melee,finesse:finesse,thrown:thrown,monkWeapon:monk,usesStrength:usesStr,
      abilityModifier:ability,attack:ability+w.bonus+input.proficiencyBonus+(archery?2:0),
      damageModifier:ability+w.bonus+effectDamage({melee:melee,str:usesStr},input.effectDamage)+(dueling?2:0)+(thrownStyle?2:0),
      die:monk?biggerDie(w.dmg,input.martialArtsDie):w.dmg,
      criticalThreshold:Math.min(parseInt(input.weaponCriticalThreshold,10)||20,input.itemCriticalThreshold),
      styles:{dueling:dueling,thrown:thrownStyle,archery:archery,greatWeapon:greatWeapon}};
  }
  function unarmedAttack(input){
    var ma=input.martialArtsDie,ability=ma?Math.max(input.strModifier,input.dexModifier):input.strModifier;
    // Preserve the existing Strength-melee treatment for Martial Arts effects.
    var damage=ability+input.effectDamage;
    return {attack:ability+input.proficiencyBonus,die:ma||"",
      damageModifier:ma?damage:0,flatDamage:ma?null:Math.max(1,1+damage)};
  }
  function featureAttack(input){
    var str=input.strModifier,dex=input.dexModifier,ability=input.finesse?Math.max(str,dex):str;
    var usesStr=!input.finesse||str>=dex;
    return {attack:ability+input.proficiencyBonus,usesStrength:usesStr,
      damageModifier:ability+effectDamage({melee:true,str:usesStr},input.effectDamage)};
  }

  function aggregateEffects(input){
    var t={dmg:0,ac:0,speed:0,resist:[],advAbility:[],sources:{dmg:[],ac:[],speed:[],resist:[],adv:[]}};
    input.effects.forEach(function(e){
      if(e.blocked)return;
      var m=e.mods,acv=m.ac+(m.acAbility?core.abMod(input.abilityScores[m.acAbility]):0);
      if(m.dmg){t.dmg+=m.dmg;t.sources.dmg.push(e.name);}
      if(acv){t.ac+=acv;t.sources.ac.push(e.name);}
      if(m.speed){t.speed+=m.speed;t.sources.speed.push(e.name);}
      if(m.resist.length&&t.sources.resist.indexOf(e.name)<0)t.sources.resist.push(e.name);
      m.resist.forEach(function(r){if(t.resist.indexOf(r)<0)t.resist.push(r);});
      if(m.advAbility.length&&t.sources.adv.indexOf(e.name)<0)t.sources.adv.push(e.name);
      m.advAbility.forEach(function(a){if(t.advAbility.indexOf(a)<0)t.advAbility.push(a);});
    });
    return t;
  }

  // Each record is one applicable item. Armor AC is excluded by the adapter.
  function aggregateItems(items){
    var t={ac:0,save:0,saveConc:0,spellAtk:0,spellDc:0,abilCheck:0,prof:0,crit:20,
      abil:{},speed:[],profItems:[],sources:{ac:[],save:[],saveConc:[],spellAtk:[],spellDc:[],abilCheck:[],prof:[],crit:[]}};
    items.forEach(function(it){
      var nm=it.name;
      ["ac","save","saveConc","spellAtk","spellDc","abilCheck","prof"].forEach(function(k){
        var amount=it[k];
        if(amount){t[k]+=amount;t.sources[k].push(nm+" "+(amount>=0?"+":"")+amount);}
      });
      if(it.crit&&it.crit<t.crit){t.crit=it.crit;t.sources.crit=[nm+" (crit on "+it.crit+"+)"];}
      if(it.grantsProficiency)t.profItems.push(nm);
      (it.abilities||[]).forEach(function(a){
        if(!t.abil[a.name])t.abil[a.name]={delta:0,floor:null,from:[]};
        var slot=t.abil[a.name];
        if(slot.from.indexOf(nm)<0)slot.from.push(nm);
        if(a.floor!=null&&(slot.floor==null||a.floor>slot.floor))slot.floor=a.floor;
        if(typeof a.delta==="number")slot.delta+=a.delta;
      });
      (it.speed||[]).forEach(function(s){t.speed.push({op:s.op,kind:s.kind,val:s.val,from:nm});});
    });
    return t;
  }

  var api={calculateAC:calculateAC,spellModifiers:spellModifiers,weaponAttack:weaponAttack,
    unarmedAttack:unarmedAttack,featureAttack:featureAttack,aggregateEffects:aggregateEffects,
    aggregateItems:aggregateItems,effectDamage:effectDamage,martialArtsDie:martialArtsDie,
    isMonkWeapon:isMonkWeapon,biggerDie:biggerDie,scaledDie:scaledDie,abilityWithItems:abilityWithItems};
  root.CCRulesEngine=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
