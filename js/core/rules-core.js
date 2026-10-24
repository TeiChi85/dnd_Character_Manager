(function(root){
  "use strict";

  function abMod(score){
    if(score===null||score===undefined||isNaN(Number(score)))return 0;
    return Math.floor((Number(score)-10)/2);
  }

  function profBonusBase(level){
    return Math.floor((Number(level)-1)/4)+2;
  }

  function profBonus(level,itemBonus){
    var value=profBonusBase(level);
    if(itemBonus) value += Number(itemBonus);
    return value;
  }

  function autoHp(faces,level){
    if(!faces||!level)return null;
    return Number(faces)+(Number(level)-1)*(Math.floor(Number(faces)/2)+1);
  }

  function maxHP(faces,level,conMod,manualHp){
    if(manualHp!=null)return manualHp;
    if(!faces)return null;
    var con = Number(conMod)||0;
    var avg = Math.floor(Number(faces)/2)+1;
    return Number(faces)+con+(Number(level)-1)*(avg+con);
  }

  function skillBonus(abilityScore, proficiencyBonus, hasProficiency, hasExpertise, abilityCheckBonus){
    var mod = abMod(abilityScore);
    var prof = 0;
    if(hasProficiency)prof = hasExpertise ? Number(proficiencyBonus)*2 : Number(proficiencyBonus||0);
    return mod + prof + (Number(abilityCheckBonus)||0);
  }

  function passiveScore(abilityScore, proficiencyBonus, hasProficiency, hasExpertise, abilityCheckBonus){
    return 10 + skillBonus(abilityScore, proficiencyBonus, hasProficiency, hasExpertise, abilityCheckBonus);
  }

  function saveBonus(abilityScore, proficiencyBonus, hasProficiency, saveBonusItem){
    return abMod(abilityScore) + (hasProficiency ? Number(proficiencyBonus||0) : 0) + (Number(saveBonusItem)||0);
  }

  function maxSpellLevel(caster,L){
    switch(caster){
      case "full":return Math.min(9,Math.ceil(L/2));
      case "pact":return Math.min(5,Math.ceil(L/2));
      case "1/2":return L<2?0:Math.min(5,Math.ceil(L/4));
      case "artificer":return Math.min(5,Math.ceil(L/4));
      default:return Math.min(9,Math.ceil(L/2));
    }
  }

  var api={
    abMod:abMod,
    profBonusBase:profBonusBase,
    profBonus:profBonus,
    autoHp:autoHp,
    maxHP:maxHP,
    skillBonus:skillBonus,
    passiveScore:passiveScore,
    saveBonus:saveBonus,
    maxSpellLevel:maxSpellLevel
  };

  root.CCRulesCore=api;

  if(typeof module !== "undefined" && module.exports){
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
