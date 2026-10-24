(function(){
  "use strict";
  var characterModel=window.CCCharacterState;
  function freshEquipment(){return characterModel.createEquipment();}
  function freshSheet(){return characterModel.createGameplay();}
  function freshCharacter(){return characterModel.createDefault();}
  function freshView(){return {screen:"edition",currentStep:"class",openPanels:{},equipment:{filterType:"",filterQ:""},
    spells:{levelFilter:"",q:"",preview:""},sheet:{invQ:"",invAdd:"",acEditOpen:false}};}
  function replaceState(target,value){Object.keys(target).forEach(function(k){delete target[k];});Object.keys(value).forEach(function(k){target[k]=value[k];});}
  var state=freshCharacter(),uiState=freshView(),derivedState={fdata:null};
  var ruleTextUI,creatorUI,sheetUI,navigationUI;
  var serverLibrary=null;
  var featureLoadGeneration=0;
  var importGeneration=0,fileReadGeneration=0;
  var CCRules = (typeof window !== "undefined" && window.CCRulesCore) || null;
  var rulesEngine=window.CCRulesEngine;
  // Wipe every character field in place (keeping the same state object) and reset the form controls.
  function resetCharacter(){
    featureLoadGeneration++;
    replaceState(uiState,freshView());derivedState.fdata=null;
    charFileHandle=null;                    // a new character is not tied to a file
    replaceState(state,freshCharacter());
    var n=$("charName");if(n)n.value="";
    var cn=$("bgCustomName");if(cn)cn.value="";
    var cd=$("bgCustomDesc");if(cd)cd.value="";
    var cs=$("classSelect");if(cs)cs.value="";
    var am=$("abilityMethod");if(am)am.value="pointbuy";
    var hr=$("hpEditRow");if(hr)hr.classList.add("hidden");
    if(serverLibrary)serverLibrary.detach();
    populateLevels();
    $("featTitle").textContent="Class Features";
  }
  var ABILITIES=["Strength","Dexterity","Constitution","Intelligence","Wisdom","Charisma"];
  var STD_LANGS=["Common","Dwarvish","Elvish","Giant","Gnomish","Goblin","Halfling","Orc"];
  var EXOTIC_LANGS=["Abyssal","Celestial","Deep Speech","Draconic","Infernal","Primordial","Sylvan","Undercommon"];
  var ALL_LANGS=STD_LANGS.concat(EXOTIC_LANGS);
  var ALL_SKILLS=["Acrobatics","Animal Handling","Arcana","Athletics","Deception","History","Insight","Intimidation","Investigation","Medicine","Nature","Perception","Performance","Persuasion","Religion","Sleight of Hand","Stealth","Survival"];
  var ALIGNMENTS=["Lawful Good","Neutral Good","Chaotic Good","Lawful Neutral","True Neutral","Chaotic Neutral","Lawful Evil","Neutral Evil","Chaotic Evil","Unaligned"];
  var LIFESTYLES=["Wretched","Squalid (1SP)","Poor (2SP)","Modest (1GP)","Comfortable (2GP)","Wealthy (4GP)","Aristocratic (10GP minimum)"];
  var SOURCE_NAMES={
    PHB:"Player's Handbook (2014)",XPHB:"Player's Handbook (2024)",DMG:"Dungeon Master's Guide",
    TCE:"Tasha's Cauldron of Everything",XGE:"Xanathar's Guide to Everything",SCAG:"Sword Coast Adventurer's Guide",
    FTD:"Fizban's Treasury of Dragons",MPMM:"Mordenkainen Presents: Monsters of the Multiverse",
    MTF:"Mordenkainen's Tome of Foes",VGM:"Volo's Guide to Monsters",
    EGW:"Explorer's Guide to Wildemount",ERLW:"Eberron: Rising from the Last War",GGR:"Guildmasters' Guide to Ravnica",
    AI:"Acquisitions Incorporated",AAG:"Astral Adventurer's Guide",SATO:"Sigil and the Outlands",
    PSK:"Plane Shift: Kaladesh",BGG:"Bigby Presents: Glory of the Giants",BMT:"The Book of Many Things",
    MOT:"Mythic Odysseys of Theros",VRGR:"Van Richten's Guide to Ravenloft",SCC:"Strixhaven: A Curriculum of Chaos",
    DSotDQ:"Dragonlance: Shadow of the Dragon Queen",
    TDCSR:"Tal'Dorei Campaign Setting Reborn",UA:"Unearthed Arcana"};
  // Prefer the generated 5etools book list, fall back to the built-in map.
  function bookTitle(code){
    if(!code)return "";
    var g=window.CC_SOURCES&&window.CC_SOURCES[code];
    return g||SOURCE_NAMES[code]||"";
  }
  /* Homebrew books use a long code on their entries ("GriffonsSaddlebag2") but declare
     a short abbreviation of their own ("TGS2"), which is what belongs on a sheet. */
  function srcAbbr(code){
    var known=window.CC_SOURCE_ABBR&&window.CC_SOURCE_ABBR[code];
    if(known)return known;
    // Unearthed Arcana articles are not in the book list, and their codes read as one long
    // word: "UATheMysticClass" is no use in a dropdown, "UA" is.
    if(/^UA[A-Z]/.test(code))return "UA";
    return code;
  }
  /* A readable title for a source the book list does not cover, by breaking the code back
     into words: "UATheMysticClass" -> "Unearthed Arcana: The Mystic Class". */
  function derivedSourceTitle(code){
    if(!/^UA[A-Z]/.test(code))return "";
    var words=code.slice(2).replace(/([a-z0-9])([A-Z])/g,"$1 $2");
    return "Unearthed Arcana: "+words;
  }
  // Third-party content is labelled as such rather than passed off as official.
  function hbAuthor(code){
    var h=window.CC_HOMEBREW&&window.CC_HOMEBREW[code];
    return h?(typeof h==="string"?h:""):null;
  }
  function isHomebrew(code){return hbAuthor(code)!==null;}
  function sourceName(code){
    var t=bookTitle(code)||derivedSourceTitle(code),a=hbAuthor(code);
    var tail=isHomebrew(code)?" — homebrew"+(a?" by "+a:""):"";
    return (t?t+" ("+srcAbbr(code)+")":srcAbbr(code))+tail;
  }
  // An abbreviation that reveals the full book title on hover.
  function srcTag(code){
    if(!code)return "";
    var hb=isHomebrew(code);
    return '<span class="src'+(hb?" src-hb":"")+'" title="'+esc(sourceName(code))+'">'+esc(srcAbbr(code))+"</span>";
  }
  // Subclass features that require picking one row from a table (e.g. which dragon).
  var TABLE_CHOICES=[
    {className:"Sorcerer",sub:"Draconic",feature:"Dragon Ancestor",label:"Draconic Ancestry — choose your dragon",optCol:0,detailCol:1,detailLabel:"Damage type",caption:"Draconic Ancestry"},
    {className:"Warlock",sub:"Genie",feature:"The Genie",label:"Genie Kind — choose your patron",optCol:1,detailCol:2,detailLabel:"Element",caption:"Genie Kind"},
    {className:"Sorcerer",sub:"Divine Soul",feature:"Divine Magic",label:"Divine Magic — choose your affinity",optCol:0,detailCol:1,detailLabel:"Bonus spell"},
    {className:"Rogue",sub:"Scion of the Three",feature:"Dread Allegiance",label:"Dread Allegiance — choose your god",optCol:0,detailCol:1,detailLabel:"Damage resistance"}
  ];
  function tableChoiceCfg(className,subShort,featName){
    for(var i=0;i<TABLE_CHOICES.length;i++){var c=TABLE_CHOICES[i];
      if(c.className===className&&c.sub===subShort&&c.feature===featName)return c;}
    return null;
  }
  var ALL=window.CC_CLASSES||[];
  function $(id){return document.getElementById(id);}
  /* Icons are inline SVG stroked in currentColor rather than emoji, so every button
     reads as monochrome and follows the text colour in both themes. */
  var SVG_OPEN='<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  var ICON={
    moon:SVG_OPEN+'<path d="M20.5 14.8A8.6 8.6 0 0 1 9.2 3.5a8.6 8.6 0 1 0 11.3 11.3Z"/></svg>',
    sun:SVG_OPEN+'<circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6"/></svg>',
    save:SVG_OPEN+'<path d="M5.5 3.5h9.8L20.5 8.7v11.8H5.5z"/><path d="M9 3.5v5.2h6V3.5"/><rect x="8.4" y="13" width="7.2" height="7.5"/></svg>',
    pdf:SVG_OPEN+'<path d="M14 3.5H7.2v17h9.6V6.3z"/><path d="M14 3.5v2.8h2.8"/><path d="M9.6 12.2h4.8M9.6 15.2h4.8M9.6 18h3"/></svg>',
    star:SVG_OPEN+'<path d="m12 4.2 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4-3.9-3.8 5.4-.8z"/></svg>',
    starOn:'<svg class="ico" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="m12 4.2 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4-3.9-3.8 5.4-.8z"/></svg>'
  };
  function editionLabel(ed){return ed==="one"?"2024 Revised Rules":"2014 Core Rules";}
  function autoHp(faces,level){
    if(CCRules&&CCRules.autoHp)return CCRules.autoHp(faces,level);
    if(!faces||!level)return null;
    return faces+(level-1)*(Math.floor(faces/2)+1);
  }
  function classesForEdition(ed){return ALL.filter(function(c){return c.edition===ed;}).sort(function(a,b){return a.name.localeCompare(b.name);});}
  function classBySlug(slug){return ALL.filter(function(c){return c.slug===slug;})[0]||null;}
  function isSidekickClass(){var c=classBySlug(state.slug);return !!(c&&c.isSidekick);}

  /* ---------- entry / tag renderer ---------- */
  function esc(s){return window.CCUIComponents.esc(s);}
  function atkText(){return ruleTextUI.atkText.apply(null,arguments);}
  // short rules for the conditions, so a {@condition ...} link explains itself on hover
  var CONDITION_INFO={
    blinded:"Blinded: can't see, auto-fails sight checks; attacks against it have advantage, its own have disadvantage.",
    charmed:"Charmed: can't attack the charmer; the charmer has advantage on social checks with it.",
    deafened:"Deafened: can't hear and auto-fails hearing checks.",
    exhaustion:"Exhaustion: stacking penalties by level (disadvantage, half speed, and worse; 6 = death).",
    frightened:"Frightened: disadvantage on checks and attacks while the source is in sight, and can't move closer to it.",
    grappled:"Grappled: speed 0; ends if the grappler is incapacitated or you're moved away.",
    incapacitated:"Incapacitated: can't take actions or reactions.",
    invisible:"Invisible: can't be seen unaided; attacks against it have disadvantage, its own have advantage.",
    paralyzed:"Paralyzed: incapacitated, can't move or speak, auto-fails Str and Dex saves; hits from within 5 ft are crits.",
    petrified:"Petrified: turned to solid substance; incapacitated, resistant to all damage, immune to poison and disease.",
    poisoned:"Poisoned: disadvantage on attack rolls and ability checks.",
    prone:"Prone: disadvantage on attacks; melee attacks against it have advantage, ranged have disadvantage; half your speed to stand up.",
    restrained:"Restrained: speed 0; disadvantage on attacks and Dex saves; attacks against it have advantage.",
    stunned:"Stunned: incapacitated, can't move, auto-fails Str and Dex saves; attacks against it have advantage.",
    unconscious:"Unconscious: incapacitated and prone, drops what it holds, auto-fails Str and Dex saves; hits from within 5 ft are crits."
  };
  // a plain-language hint for a rules link, shown on hover
  function tagExplain(){return ruleTextUI.tagExplain.apply(null,arguments);}
  function linkSpan(){return ruleTextUI.linkSpan.apply(null,arguments);}
  function tagHtml(){return ruleTextUI.tagHtml.apply(null,arguments);}
  function renderTags(){return ruleTextUI.renderTags.apply(null,arguments);}
  function renderEntry(){return ruleTextUI.renderEntry.apply(null,arguments);}
  function renderInline(){return ruleTextUI.renderInline.apply(null,arguments);}

  /* ---------- screens ---------- */
  function showEdition(){return navigationUI.showEdition.apply(null,arguments);}
  function setStep(){return navigationUI.setStep.apply(null,arguments);}
  function showBuild(){return navigationUI.showBuild.apply(null,arguments);}

  /* The core classes first, then the rest grouped by where they come from - the sidekick
     classes from Tasha's and the Mystic from Unearthed Arcana - so it is obvious at a
     glance which are the standard thirteen. */
  /* The footer used to name the data release in hard-coded text, and sat nine releases
     behind before anyone noticed. The generators stamp the real one into the data now. */
  function showDataVersion(){
    var el=$("dataVer");
    if(el&&window.CC_DATA_VERSION)el.textContent="v"+window.CC_DATA_VERSION;
  }
  function populateClasses(){
    var sel=$("classSelect");sel.innerHTML='<option value="">— Choose a class —</option>';
    var list=classesForEdition(state.edition);
    function group(label,items){
      if(!items.length)return;
      var g=document.createElement("optgroup");g.label=label;
      items.forEach(function(c){
        var o=document.createElement("option");
        o.value=c.slug;
        o.textContent=c.name+(c.isCore?"":" ("+srcAbbr(c.source)+")");
        o.title=sourceName(c.source);
        g.appendChild(o);
      });
      sel.appendChild(g);
    }
    group("Core classes",list.filter(function(c){return c.isCore;}));
    group("Sidekicks",list.filter(function(c){return !c.isCore&&c.isSidekick;}));
    group("Unearthed Arcana",list.filter(function(c){return !c.isCore&&!c.isSidekick;}));
  }
  function populateLevels(){
    var sel=$("levelSelect");sel.innerHTML="";
    for(var i=1;i<=20;i++){var o=document.createElement("option");o.value=i;o.textContent=i;sel.appendChild(o);}
    sel.value=state.level;
  }
  function populateBackgrounds(){
    var sel=$("bgSelect");
    var list=(window.CC_BACKGROUNDS&&window.CC_BACKGROUNDS[state.edition])||[];
    var core=state.edition==="one"?"XPHB":"PHB";
    var coreList=list.filter(function(b){return b.source===core;});
    var expList=list.filter(function(b){return b.source!==core;});
    function opt(b){return '<option value="'+esc(b.name+"|"+b.source)+'" title="'+esc(sourceName(b.source))+'">'+esc(b.name+(b.source!==core?" ("+srcAbbr(b.source)+")":""))+"</option>";}
    var html='<option value="">— Choose a background —</option><option value="custom">✎ Custom Background (write your own)…</option>';
    if(coreList.length)html+='<optgroup label="Core">'+coreList.map(opt).join("")+"</optgroup>";
    if(expList.length)html+='<optgroup label="Expanded">'+expList.map(opt).join("")+"</optgroup>";
    sel.innerHTML=html;
    sel.value=state.bgIsCustom?"custom":(state.background?state.background.name+"|"+state.background.source:"");
  }
  function populateRaces(){
    var sel=$("raceSelect");
    var list=(window.CC_RACES&&window.CC_RACES[state.edition])||[];
    var coreList=list.filter(function(r){return r.isCore;});
    var expList=list.filter(function(r){return !r.isCore;});
    // Each species with subraces contributes one option per lineage ("Elf — Drow"); a species
    // with none is a single option. The value is "name|source" or "name|source|lineage", so
    // choosing a subrace picks the species and its lineage together — no separate picker.
    function opts(r){
      var tag=(!r.isCore?" ("+srcAbbr(r.source)+")":"");
      if(r.lineages&&r.lineages.length){
        return r.lineages.map(function(l){
          var a=abilShort(combineAbil(r.ability,l.ability));
          return '<option value="'+esc(r.name+"|"+r.source+"|"+l.name)+'" title="'+esc(sourceName(l.source||r.source))+'">'+esc(r.name+tag+" — "+l.name+(a?" ["+a+"]":""))+"</option>";
        }).join("");
      }
      var a=abilShort(r.ability);
      return '<option value="'+esc(r.name+"|"+r.source)+'" title="'+esc(sourceName(r.source))+'">'+esc(r.name+tag+(a?" ["+a+"]":""))+"</option>";
    }
    var html='<option value="">— Choose a species —</option>';
    if(coreList.length)html+='<optgroup label="Core">'+coreList.map(opts).join("")+"</optgroup>";
    if(expList.length)html+='<optgroup label="Expanded">'+expList.map(opts).join("")+"</optgroup>";
    sel.innerHTML=html;
    sel.value=state.race?(state.race.name+"|"+state.race.source+(state.raceLineage?"|"+state.raceLineage:"")):"";
  }

  function loadFeatureData(slug,cb){
    window.CC_FEATURE_DATA=window.CC_FEATURE_DATA||{};
    if(window.CC_FEATURE_DATA[slug])return cb(window.CC_FEATURE_DATA[slug]);
    var s=document.createElement("script");
    s.src="resources/features/"+slug+".js";
    s.onload=function(){cb(window.CC_FEATURE_DATA[slug]);};
    s.onerror=function(){cb(null);};
    document.head.appendChild(s);
  }
  // Only the current selection may apply data. A slug alone cannot distinguish
  // Fighter -> Wizard -> Fighter or a new character using the same class.
  // Keep the raw loader independent: server-library preparation only warms cache.
  function loadSelectedFeatureData(slug,cb){
    var generation=++featureLoadGeneration;
    loadFeatureData(slug,function(fd){
      if(generation===featureLoadGeneration&&state.slug===slug)cb(fd);
    });
  }

  /* ---------- render ---------- */
  // Gameplay normalization belongs to a state transition, never to navigation/rendering.
  function synchronizeGameplay(){
    var hp=maxHP();if(!state.sheet.hpEdited&&hp!=null)state.sheet.hpCurrent=hp;
    var worn=false;
    state.equipment.inventory.forEach(function(it){
      if(it.attuned&&!itemAttune(it))it.attuned=false;
      var armor=it.equipped&&resolveArmor(it);
      if(armor&&armor.armorKind!=="shield"){
        if(worn)it.equipped=false;else worn=true;
      }
    });
  }
  function renderAfterChange(){synchronizeGameplay();render();}
  // Preserve the legacy creator/sheet spell-summary difference (sheet omits item bonuses).
  function spellPresentation(info,withItems){
    var bonuses=withItems?itemBonuses():{spellDc:0,spellAtk:0};
    return rulesEngine.spellModifiers({abilityModifier:abMod(totalScore(info.ability)),
      proficiencyBonus:profBonus(),saveBonus:bonuses.spellDc,attackBonus:bonuses.spellAtk});
  }
  function resourceView(){
    var bonus=featResourceBonus();
    return ((window.CC_RESOURCES&&window.CC_RESOURCES[state.slug])||[]).map(function(resource){
      return {resource:resource,count:(resource.values[state.level-1]||0)+(bonus[resource.name]||0)};
    });
  }
  function shortRestNames(info){
    var names=[],list=(window.CC_RESOURCES&&window.CC_RESOURCES[state.slug])||[];
    var set={"Ki Points":1,"Focus Points":1,"Channel Divinity":1,"Wild Shape":1};
    if(state.level>=5)set["Bardic Inspiration"]=1;
    list.forEach(function(resource){if(set[resource.name]&&(resource.values[state.level-1]||0))names.push(resource.name);});
    if(info&&info.sc.slots&&info.sc.slots.type==="pact")names.push("Pact Magic slots");
    return names;
  }
  function render(){
    creatorUI.renderHeader();
    var hasClass=!!state.className;
    if(hasClass&&derivedState.fdata)renderFeatures();
    renderBackground();
    renderDetails();
    renderRace();
    renderAbilities();
    renderEquipment();
    renderSpells();
    renderSheet();
  }

  function progAt(p,level){var best=0,bestL=-1;for(var k in p){var l=+k;if(l<=level&&l>bestL){bestL=l;best=p[k];}}return best;}
  function groupFilled(groupKey,count){var n=0;for(var i=0;i<count;i++){if(state.choices[groupKey+":"+i])n++;}return n;}
  function bgFilled(groupKey,count){var n=0;for(var i=0;i<count;i++){if(state.bgChoices[groupKey+":"+i])n++;}return n;}

  function validChoiceKeys(){
    var fd=derivedState.fdata,lvl=state.level,keys={};
    if(!fd)return keys;
    var chosen=state.subclassName?fd.subclasses.filter(function(s){return s.name===state.subclassName;})[0]:null;
    var progMap=optProgMap(fd,chosen);
    var sk=fd.proficiencies&&fd.proficiencies.skills;
    if(sk){for(var i=0;i<sk.count;i++)keys["skill:"+i]=1;}
    var feats=fd.classFeatures.slice();
    if(chosen)feats=feats.concat(chosen.features);
    var seen={};
    feats.forEach(function(f){
      if(f.level>lvl)return;
      if(f.name==="Ability Score Improvement"){
        ["mode","feat","dist","a0","a1"].forEach(function(s){keys["asi:"+f.level+":"+s]=1;});
        return;
      }
      var isChoice=(progMap[f.name]||fd.inlineChoiceCount[f.name])&&(fd.optionLists[f.name]&&fd.optionLists[f.name].length);
      if(isChoice&&!seen[f.name]){
        seen[f.name]=1;
        var count=progMap[f.name]?progAt(progMap[f.name].progression,lvl):fd.inlineChoiceCount[f.name];
        for(var i=0;i<count;i++)keys[f.name+":"+i]=1;
      }
    });
    orphanProgressions(fd,chosen,progMap).forEach(function(op){    // e.g. Rune Knight "Runes"
      if(op.level>lvl)return;
      var count=progAt(progMap[op.name].progression,lvl);
      for(var i=0;i<count;i++)keys[op.name+":"+i]=1;
    });
    if(chosen)chosen.features.forEach(function(f){
      if(f.level<=lvl&&tableChoiceCfg(fd.name,chosen.shortName,f.name))keys["tbl:"+f.name+":0"]=1;
    });
    // skill / language / tool pickers a feature offers "of your choice" (keep them across level changes)
    featuresAndTraits().forEach(function(f){
      [featureSkillChoice(f),featureLangChoice(f),featureToolChoice(f)].forEach(function(c){
        if(c)for(var i=0;i<c.count;i++)keys[c.key+":"+i]=1;
      });
    });
    return keys;
  }

  // drop class choices (and subclass) no longer valid at the current level. Background choices live in state.bgChoices and are untouched here.
  function pruneChoices(){
    var fd=derivedState.fdata;if(!fd)return;
    var gains=fd.classFeatures.filter(function(f){return f.gainSubclassFeature;}).map(function(f){return f.level;});
    var subLvl=gains.length?Math.min.apply(null,gains):null;
    if(subLvl&&state.level<subLvl)state.subclassName=null;
    var valid=validChoiceKeys();
    for(var k in state.choices){if(!valid[k])delete state.choices[k];}
  }

  function optProgMap(fd,chosen){
    var m={};
    (fd.optProgression||[]).forEach(function(p){m[p.name]=p;});
    if(chosen)(chosen.optProgression||[]).forEach(function(p){m[p.name]=p;});
    return m;
  }
  /* A choice-pool progression is normally hosted by a feature of the same name (Sorcerer's
     Metamagic). Some are not: the Rune Knight's progression is "Runes" but its feature is
     "Rune Knight", and a Battle Master's is "Maneuvers". Those need their own picker, placed
     at the level they first grant a choice. */
  function orphanProgressions(fd,chosen,progMap){
    var names={};
    (fd.classFeatures||[]).forEach(function(f){names[f.name]=1;});
    if(chosen)(chosen.features||[]).forEach(function(f){names[f.name]=1;});
    var out=[],pn;
    for(pn in progMap){
      if(names[pn]||!(fd.optionLists[pn]&&fd.optionLists[pn].length))continue;
      var lv=99;for(var k in progMap[pn].progression){if(+k<lv)lv=+k;}
      var isSub=!!(chosen&&(chosen.optProgression||[]).filter(function(p){return p.name===pn;}).length);
      out.push({name:pn,level:lv,isSub:isSub});
    }
    return out;
  }

  function choiceSelectsHtml(groupKey,pool,count,label){
    var fd=derivedState.fdata;
    var chosen=[];for(var i=0;i<count;i++)chosen.push(state.choices[groupKey+":"+i]||"");
    var picked=chosen.filter(Boolean).length;
    var head='<div class="origin-picker"><label>'+esc(label)+' ('+picked+'/'+count+')'+
      (picked<count?'<span class="need-choice">choose '+(count-picked)+' more</span>':'')+'</label>';
    var body="";
    for(var i=0;i<count;i++){
      var others=chosen.filter(function(v,idx){return idx!==i&&v;});
      var opts='<option value="">— Choose —</option>'+pool.map(function(o){
        var val=o.name,dis=others.indexOf(val)>=0?" disabled":"",sel=chosen[i]===val?" selected":"";
        var lbl=o.name+(o.source&&fd&&o.source!==fd.source?" ("+srcAbbr(o.source)+")":"")+(o.prerequisite?" — "+o.prerequisite:"");
        return '<option value="'+esc(val)+'"'+dis+sel+(o.source?' title="'+esc(sourceName(o.source))+'"':"")+'>'+esc(lbl)+"</option>";
      }).join("");
      body+='<select class="choice-sel" data-group="'+esc(groupKey)+'" data-idx="'+i+'">'+opts+"</select>";
    }
    // list every option with its full description (as 5etools shows them inline), so the
    // player can read them all before choosing; chosen ones are marked
    var ref="";
    pool.forEach(function(o){
      var isPicked=chosen.indexOf(o.name)>=0;
      var nm=o.name+(o.prerequisite?" — "+o.prerequisite:"")+(o.source&&fd&&o.source!==fd.source?" ("+srcAbbr(o.source)+")":"");
      ref+='<div class="opt-ref'+(isPicked?" picked":"")+'"><div class="opt-ref-h">'+esc(nm)+(isPicked?' <span class="opt-tick">&#10003; chosen</span>':"")+"</div>"+
           ((o.entries&&o.entries.length)?o.entries.map(renderEntry).join(""):"")+"</div>";
    });
    if(ref){
      var openAttr=pool.length<=8?" open":"";                 // long pools (invocations) start collapsed
      body+='<details class="opt-ref-list"'+openAttr+'><summary>All '+pool.length+" options</summary>"+ref+"</details>";
    }
    return head+body+"</div>";
  }

  function featByName(nm){
    if(!nm)return null;
    var L=window.CC_FEATS||[];
    for(var i=0;i<L.length;i++)if(L[i].name===nm&&L[i].edition===state.edition)return L[i];
    for(var j=0;j<L.length;j++)if(L[j].name===nm)return L[j];
    return null;
  }
  // ability increases granted by the feat taken at an ASI level
  function featAsiPicks(level){
    var ft=featByName(state.choices["asi:"+level+":feat"]);
    if(!ft||!ft.ability)return [];
    var out=[],k;
    for(k in ft.ability.fixed)out.push({ability:k,amount:ft.ability.fixed[k],from:ft.name});
    var ch=ft.ability.choose;
    if(ch)for(var i=0;i<ch.count;i++){
      var a=state.choices["asi:"+level+":featab"+i];
      if(a)out.push({ability:a,amount:ch.amount,from:ft.name});
    }
    return out;
  }
  function featAsiPending(level){
    var ft=featByName(state.choices["asi:"+level+":feat"]);
    if(!ft||!ft.ability||!ft.ability.choose)return false;
    for(var i=0;i<ft.ability.choose.count;i++)if(!state.choices["asi:"+level+":featab"+i])return true;
    return false;
  }
  function featAsiHtml(level){
    var ft=featByName(state.choices["asi:"+level+":feat"]);
    if(!ft||!ft.ability)return "";
    var html="",k,fixedTxt=[];
    for(k in ft.ability.fixed)fixedTxt.push(k+" +"+ft.ability.fixed[k]);
    if(fixedTxt.length)html+='<div class="choice-desc">Grants '+esc(fixedTxt.join(", "))+".</div>";
    var ch=ft.ability.choose;
    if(ch){
      for(var i=0;i<ch.count;i++){
        var cur=state.choices["asi:"+level+":featab"+i]||"",others=[];
        for(var j=0;j<ch.count;j++){if(j!==i){var v=state.choices["asi:"+level+":featab"+j];if(v)others.push(v);}}
        html+='<div class="asi-row"><select class="asi-featab" data-level="'+level+'" data-idx="'+i+'">'+
          '<option value="">— '+esc(ft.name)+": +"+ch.amount+' to which ability? —</option>'+
          ch.from.map(function(a){
            return '<option value="'+a+'"'+(others.indexOf(a)>=0?" disabled":"")+(cur===a?" selected":"")+">"+a+" +"+ch.amount+"</option>";
          }).join("")+"</select></div>";
      }
      if(ft.ability.max)html+='<div class="choice-desc tag-note">This can raise the score to a maximum of '+ft.ability.max+".</div>";
    }
    return html+featPicksHtml(ft,"asi:"+level+":ft:",state.choices,"asi-featpick");
  }
  function asiResolved(level){
    var mode=state.choices["asi:"+level+":mode"];
    if(!mode)return false;
    if(mode==="feat"){
      var _ft=featByName(state.choices["asi:"+level+":feat"]);
      return !!state.choices["asi:"+level+":feat"]&&!featAsiPending(level)&&
             !(_ft&&featPicksPending(_ft,"asi:"+level+":ft:",state.choices));
    }
    var dist=state.choices["asi:"+level+":dist"]||"2",n=dist==="11"?2:1;
    for(var i=0;i<n;i++){if(!state.choices["asi:"+level+":a"+i])return false;}
    return true;
  }

  function asiChoiceHtml(level){
    var modeKey="asi:"+level+":mode",featKey="asi:"+level+":feat",distKey="asi:"+level+":dist";
    var mode=state.choices[modeKey]||"";
    var html='<div class="origin-picker"><label>At '+ordinal(level)+' level, choose one</label>'+
      '<select class="asi-mode" data-level="'+level+'">'+
      '<option value="">— Choose —</option>'+
      '<option value="asi"'+(mode==="asi"?" selected":"")+'>Ability Score Improvement</option>'+
      '<option value="feat"'+(mode==="feat"?" selected":"")+'>Feat</option></select>';
    if(mode==="asi"){
      var dist=state.choices[distKey]||"2",n=dist==="11"?2:1,inc=dist==="11"?"+1":"+2";
      html+='<div class="asi-row"><select class="asi-dist" data-level="'+level+'">'+
        '<option value="2"'+(dist==="2"?" selected":"")+'>+2 to one ability</option>'+
        '<option value="11"'+(dist==="11"?" selected":"")+'>+1 to two abilities</option></select></div>';
      for(var i=0;i<n;i++){
        var cur=state.choices["asi:"+level+":a"+i]||"",others=[];
        for(var j=0;j<n;j++){if(j!==i){var v=state.choices["asi:"+level+":a"+j];if(v)others.push(v);}}
        var opts='<option value="">— Ability —</option>'+ABILITIES.map(function(a){
          var dis=others.indexOf(a)>=0?" disabled":"",sel=cur===a?" selected":"";
          return '<option value="'+a+'"'+dis+sel+'>'+a+" "+inc+"</option>";
        }).join("");
        html+='<div class="asi-row"><select class="asi-abil" data-level="'+level+'" data-idx="'+i+'">'+opts+"</select></div>";
      }
      html+='<div class="choice-desc tag-note">Final ability totals are applied in the Ability Scores step (coming later); here you pick which scores get the bump.</div>';
    }else if(mode==="feat"){
      var feats=(window.CC_FEATS||[]).filter(function(ft){return ft.edition===state.edition&&ft.category!=="Origin";});
      var chosen=state.choices[featKey]||"";
      html+='<select class="asi-feat" data-level="'+level+'"><option value="">— Choose a feat —</option>'+
        feats.map(function(ft){
          var lbl=ft.name+(ft.category&&ft.category!=="General"?" ["+ft.category+"]":"")+(ft.prereq?" — "+ft.prereq:"");
          return '<option value="'+esc(ft.name)+'"'+(chosen===ft.name?" selected":"")+'>'+esc(lbl)+"</option>";
        }).join("")+"</select>";
      if(chosen){
        var ft=feats.filter(function(x){return x.name===chosen;})[0];
        html+=featAsiHtml(level);
        if(ft)html+='<div class="choice-desc">'+(ft.prereq?"<p class='tag-note'>Prerequisite (not enforced yet): "+esc(ft.prereq)+"</p>":"")+(ft.entries||[]).map(renderEntry).join("")+"</div>";
      }
    }
    return html+"</div>";
  }

  function plainTags(s){return renderTags(String(s)).replace(/<[^>]+>/g,"");}
  function tableChoiceHtml(f,cfg){
    var tbl=null;
    (f.entries||[]).forEach(function(e){if(!tbl&&e&&typeof e==="object"&&e.type==="table"&&(!cfg.caption||e.caption===cfg.caption))tbl=e;});
    if(!tbl)(f.entries||[]).forEach(function(e){if(!tbl&&e&&typeof e==="object"&&e.type==="table")tbl=e;});
    if(!tbl)return {html:"",choicesN:0,pending:false};
    var key="tbl:"+f.name,cur=state.choices[key+":0"]||"";
    var opts='<option value="">— Choose —</option>'+tbl.rows.map(function(r){
      var val=plainTags(r[cfg.optCol]),det=cfg.detailCol!=null?plainTags(r[cfg.detailCol]):"",sel=cur===val?" selected":"";
      return '<option value="'+esc(val)+'"'+sel+'>'+esc(val+(det?" — "+det:""))+"</option>";
    }).join("");
    var html='<div class="origin-picker"><label>'+esc(cfg.label)+'</label>'+
      '<select class="tbl-sel" data-key="'+esc(key)+'">'+opts+"</select>";
    if(cur&&cfg.detailCol!=null){
      var row=null;tbl.rows.forEach(function(r){if(plainTags(r[cfg.optCol])===cur)row=r;});
      if(row)html+='<div class="choice-desc">'+esc(cfg.detailLabel||"Detail")+": <b>"+esc(plainTags(row[cfg.detailCol]))+"</b></div>";
    }
    return {html:html+"</div>",choicesN:1,pending:!cur};
  }

  function panelHtml(){return creatorUI.panelHtml.apply(null,arguments);}

  function hitPointsBody(fd){
    /* A sidekick class states no hit die - the creature brings its own - so the one chosen
       for this character is used instead of the class's. */
    var f=fd.hdFaces||state.hdFaces,cn=fd.name;
    if(!f)return "<p class='prof-line tag-note'>A sidekick uses the hit die of the creature it is. Choose one above.</p>";
    var avg=Math.floor(f/2)+1;
    var note=fd.hdFaces?"":" <span class='tag-note'>(from the creature, not the class)</span>";
    return "<p class='prof-line'><b>Hit Dice:</b> 1d"+f+" per "+cn+" level"+note+"</p>"+
      "<p class='prof-line'><b>Hit Points at 1st Level:</b> "+f+" + your Constitution modifier</p>"+
      "<p class='prof-line'><b>Hit Points at Higher Levels:</b> 1d"+f+" (or "+avg+") + your Constitution modifier per "+cn+" level after 1st</p>";
  }
  function proficienciesBody(fd){
    var p=fd.proficiencies||{};
    var h="<p class='prof-line'><b>Armor:</b> "+renderTags(p.armor||"None")+"</p>"+
      "<p class='prof-line'><b>Weapons:</b> "+renderTags(p.weapons||"None")+"</p>"+
      "<p class='prof-line'><b>Tools:</b> "+renderTags(p.tools||"None")+"</p>"+
      "<p class='prof-line'><b>Saving Throws:</b> "+esc(p.savingThrows||"None")+"</p>";
    if(p.skills){
      h+="<p class='prof-line'><b>Skills:</b> Choose "+p.skills.count+" from "+p.skills.from.join(", ")+"</p>";
      var pool=p.skills.from.map(function(s){return {name:s,source:fd.source,entries:[]};});
      h+=choiceSelectsHtml("skill",pool,p.skills.count,"Skill proficiencies");
    }else{
      h+="<p class='prof-line'><b>Skills:</b> None</p>";
    }
    return h;
  }

  /* ---------- skill proficiencies granted by a feature ----------
     e.g. Primal Knowledge: "proficiency in one skill of your choice from the list of
     skills available to barbarians at 1st level", and again at 10th level. */
  var NUMWORD={a:1,one:1,two:2,three:3};
  function featureSkillChoice(f){
    var txt=entryText(f.entries||"");
    var m=/proficiency (?:in|with) (a|one|two|three) (?:skill|of the following skills)/i.exec(txt);
    if(!m)return null;
    var count=NUMWORD[m[1].toLowerCase()]||1;
    var again=/again at (\d+)(?:st|nd|rd|th) level/i.exec(txt);
    if(again&&state.level>=parseInt(again[1],10))count+=1;
    var pool=ALL_SKILLS,fd=derivedState.fdata;
    if(/list of skills available to/i.test(txt)&&fd&&fd.proficiencies&&fd.proficiencies.skills){
      pool=fd.proficiencies.skills.from;
    }else{
      var listed=[];
      for(var i=0;i<ALL_SKILLS.length;i++){
        if(txt.toLowerCase().indexOf(ALL_SKILLS[i].toLowerCase())>=0)listed.push(ALL_SKILLS[i]);
      }
      if(listed.length>=2)pool=listed;
    }
    return {count:count,pool:pool,key:"featskill:"+f.name};
  }
  function featureSkillPicks(){
    var out=[],seen={};
    featuresAndTraits().forEach(function(f){
      if(seen[f.name])return;
      var c=featureSkillChoice(f);if(!c)return;
      seen[f.name]=1;
      for(var i=0;i<c.count;i++){var v=state.choices[c.key+":"+i];if(v)out.push(v);}
    });
    return out;
  }
  function featureSkillHtml(f){
    var c=featureSkillChoice(f);
    if(!c)return {html:"",count:0,pending:false};
    var picked=0,html='<div class="origin-picker"><label>Skill proficiency from '+esc(f.name)+"</label>";
    for(var i=0;i<c.count;i++){
      var cur=state.choices[c.key+":"+i]||"";if(cur)picked++;
      var others=[];
      for(var j=0;j<c.count;j++){if(j!==i){var v=state.choices[c.key+":"+j];if(v)others.push(v);}}
      html+='<select class="feat-skill" data-key="'+esc(c.key)+'" data-idx="'+i+'"><option value="">- Choose a skill -</option>'+
        c.pool.map(function(s){
          return '<option value="'+esc(s)+'"'+(others.indexOf(s)>=0?" disabled":"")+(cur===s?" selected":"")+">"+esc(s)+"</option>";
        }).join("")+"</select>";
    }
    return {html:html+"</div>",count:c.count,pending:picked<c.count};
  }

  /* ---------- languages / tools granted "of your choice" by a feature ----------
     e.g. Ranger Favored Enemy ("you learn one language of your choice"), a Bonus Proficiency
     that grants "one type of artisan's tools of your choice". Mirrors featureSkillChoice: a
     picker appears inside the granting feature, and the chosen values feed the languages list
     and the tool-proficiency display. */
  function featureLangChoice(f){
    var txt=plainTags(entryText(f.entries||""));
    var m=/(a|one|two|three) (?:additional )?languages? of your choice/i.exec(txt);
    if(!m)return null;
    // "Alternatively/Instead, you learn one language" is an either/or with a skill the feature
    // already offers — the skill picker covers it, so don't also grant a language.
    if(/alternativ|instead/i.test(txt.substr(Math.max(0,m.index-30),30)))return null;
    return {count:NUMWORD[m[1].toLowerCase()]||1,pool:langPool(),key:"featlang:"+f.name,label:"Language from "+f.name};
  }
  function toolPoolFor(kind){
    var t=(window.CC_PROF_OPTS||{}).tools||{},flat=[],g;
    function push(gr){(t[gr]||[]).forEach(function(x){flat.push(x);});}
    if(kind==="artisan")push("Artisan's Tools");
    else if(kind==="gaming")push("Gaming Sets");
    else if(kind==="musical")push("Musical Instruments");
    else for(g in t)push(g);
    return flat;
  }
  function featureToolChoice(f){
    var txt=plainTags(entryText(f.entries||""));
    var m=/(a|one|two|three) (?:type[s]? of |kind[s]? of )?([a-z' ]*?(?:artisan'?s tools|gaming set|musical instrument|tool))s? of your choice/i.exec(txt);
    if(!m)return null;
    // "If you already have this proficiency, you gain ... of your choice" is a conditional swap
    // for a tool the feature already grants outright — don't offer it as an extra pick.
    if(/if you already have|already have (?:this|one of these)/i.test(txt.substr(Math.max(0,m.index-120),120)))return null;
    var noun=m[2].toLowerCase(),kind="any";
    if(/artisan/.test(noun))kind="artisan";
    else if(/gaming/.test(noun))kind="gaming";
    else if(/musical|instrument/.test(noun))kind="musical";
    var name=kind==="artisan"?"Artisan's tools":kind==="gaming"?"Gaming set":kind==="musical"?"Musical instrument":"Tool";
    return {count:NUMWORD[m[1].toLowerCase()]||1,pool:toolPoolFor(kind),key:"feattool:"+f.name,label:name+" from "+f.name};
  }
  // a picker (reusing the .feat-skill select wiring) for each language/tool a feature lets you pick
  function featureProfChoiceHtml(f){
    var out={html:"",count:0,pending:false};
    [featureLangChoice(f),featureToolChoice(f)].forEach(function(c){
      if(!c||!c.pool.length)return;
      var picked=0,h='<div class="origin-picker"><label>'+esc(c.label)+"</label>";
      for(var i=0;i<c.count;i++){
        var cur=state.choices[c.key+":"+i]||"";if(cur)picked++;
        var others=[];
        for(var j=0;j<c.count;j++){if(j!==i){var vv=state.choices[c.key+":"+j];if(vv)others.push(vv);}}
        h+='<select class="feat-skill" data-key="'+esc(c.key)+'" data-idx="'+i+'"><option value="">- Choose -</option>'+
          c.pool.map(function(o){
            var val=(typeof o==="string")?o:o.val,lab=(typeof o==="string")?o:o.label;
            return '<option value="'+esc(val)+'"'+(others.indexOf(val)>=0?" disabled":"")+(cur===val?" selected":"")+">"+esc(lab)+"</option>";
          }).join("")+"</select>";
      }
      out.html+=h+"</div>";out.count+=c.count;if(picked<c.count)out.pending=true;
    });
    return out;
  }
  function featureChoicePicks(chooser){
    var out=[],seen={};
    featuresAndTraits().forEach(function(f){
      if(seen[f.name])return;var c=chooser(f);if(!c)return;seen[f.name]=1;
      for(var i=0;i<c.count;i++){var v=state.choices[c.key+":"+i];if(v)out.push(v);}
    });
    return out;
  }
  function featureLangPicks(){return featureChoicePicks(featureLangChoice);}
  function featureToolPicks(){return featureChoicePicks(featureToolChoice);}

  function stripOptions(entries){return (entries||[]).filter(function(e){return !(e&&typeof e==="object"&&e.type==="options");});}

  function renderFeatures(){return creatorUI.renderFeatures.apply(null,arguments);}

  // shared collapse wiring (persists open/closed state)
  function wireCollapse(){return creatorUI.wireCollapse.apply(null,arguments);}

  function originPickerHtml(fd){
    var opts='<option value="">— Choose —</option>'+fd.subclasses.map(function(s){
      var lbl=s.name+(s.source!==fd.source?" ("+srcAbbr(s.source)+")":"");
      return '<option value="'+esc(s.name)+'" title="'+esc(sourceName(s.source))+'">'+esc(lbl)+"</option>";
    }).join("");
    return '<div class="origin-picker"><label>Choose your subclass</label><select id="originSelect">'+opts+"</select></div>";
  }

  /* ---------- background ---------- */
  function currentBg(){
    if(!state.background)return null;
    var list=(window.CC_BACKGROUNDS&&window.CC_BACKGROUNDS[state.edition])||[];
    return list.filter(function(b){return b.name===state.background.name&&b.source===state.background.source;})[0]||null;
  }
  function officialLanguages(){
    var L=window.CC_LANGUAGES;
    if(L&&L.length)return L;
    var out=[];
    STD_LANGS.forEach(function(x){out.push({name:x,type:"standard",core:true});});
    EXOTIC_LANGS.forEach(function(x){out.push({name:x,type:"exotic",core:true});});
    return out;
  }
  /* ---------- added proficiencies ----------
     Extra armor, weapon or tool proficiencies a player picks up from a feat, feature or a
     DM's leave, chosen from the official lists like the languages are and saved with the
     character. Stored under state.customProficiencies[armor|weapons|tools]. */
  function customProfs(key){return (state.customProficiencies&&state.customProficiencies[key])||[];}
  function profChips(key){
    return customProfs(key).map(function(v,i){
      return '<span class="lang-chip">'+esc(v)+' <span class="prof-x" data-pk="'+esc(key)+'" data-i="'+i+'">&times;</span></span>';
    }).join("");
  }
  // the dropdown, with anything already added filtered out
  function profOpts(key){
    var opts=window.CC_PROF_OPTS||{},have={};
    customProfs(key).forEach(function(v){have[String(v).toLowerCase()]=1;});
    function optsFor(list){
      return list.filter(function(v){return !have[v.toLowerCase()];})
                 .map(function(v){return '<option>'+esc(v)+"</option>";}).join("");
    }
    var html='<option value="">— Add a proficiency —</option>';
    if(key==="armor"){html+=optsFor(opts.armor||[]);return html;}
    var groups=opts[key]||{};
    for(var g in groups){
      var inner=optsFor(groups[g]||[]);
      if(inner)html+='<optgroup label="'+esc(g)+'">'+inner+"</optgroup>";
    }
    return html;
  }
  function profBlock(label,key,granted){
    return '<div class="prof-blk"><div class="pl">'+label+'</div>'+renderTags(granted||"None")+
      '<div class="prof-edit">'+profChips(key)+
        '<select class="prof-pick" data-pk="'+esc(key)+'">'+profOpts(key)+'</select>'+
      "</div></div>";
  }
  // languages, alphabetical, tagged with type; value stays the bare name
  function langPool(){
    var out=[];
    STD_LANGS.forEach(function(l){out.push({val:l,label:l+" (Standard)"});});
    EXOTIC_LANGS.forEach(function(l){out.push({val:l,label:l+" (Exotic)"});});
    out.sort(function(a,b){return a.val.localeCompare(b.val);});
    return out;
  }
  // multi-pick dropdowns for background choices (stored in state.bgChoices).
  // pool items may be plain strings or {val,label} objects.
  function bgSelectHtml(group,pool,count,label){
    var chosen=[];for(var i=0;i<count;i++)chosen.push(state.bgChoices[group+":"+i]||"");
    var picked=chosen.filter(Boolean).length;
    var html='<div class="origin-picker"><label>'+esc(label)+' ('+picked+'/'+count+')'+
      (picked<count?'<span class="need-choice">choose '+(count-picked)+' more</span>':'')+'</label>';
    for(var i=0;i<count;i++){
      var others=chosen.filter(function(v,idx){return idx!==i&&v;});
      var opts='<option value="">— Choose —</option>'+pool.map(function(o){
        var val=(typeof o==="string")?o:o.val,lab=(typeof o==="string")?o:o.label;
        var dis=others.indexOf(val)>=0?" disabled":"",sel=chosen[i]===val?" selected":"";
        return '<option value="'+esc(val)+'"'+dis+sel+'>'+esc(lab)+"</option>";
      }).join("");
      html+='<select class="bg-sel" data-group="'+esc(group)+'" data-idx="'+i+'">'+opts+"</select>";
    }
    return html+"</div>";
  }
  function bgProficienciesHtml(b){
    var lines=[],groups=[];
    var sk=b.skills;
    if(sk.fixed.length)lines.push("<b>Skill Proficiencies:</b> "+sk.fixed.join(", "));
    if(sk.choose)groups.push({g:"skillChoose",pool:sk.choose.from,n:sk.choose.count,l:"Skill proficiency"});
    if(sk.any)groups.push({g:"skillAny",pool:ALL_SKILLS.filter(function(x){return sk.fixed.indexOf(x)<0;}),n:sk.any,l:"Skill proficiency (any)"});
    var lg=b.langs;
    if(lg.fixed.length)lines.push("<b>Languages:</b> "+lg.fixed.join(", "));
    if(lg.anyStandard)groups.push({g:"langStd",pool:langPool(),n:lg.anyStandard,l:"Language"});
    if(lg.any)groups.push({g:"langAny",pool:langPool(),n:lg.any,l:"Language (any)"});
    if(lg.choose)groups.push({g:"langChoose",pool:lg.choose.from.slice().sort(),n:lg.choose.count,l:"Language"});
    var tl=b.tools;
    if(tl.fixed.length)lines.push("<b>Tool Proficiencies:</b> "+tl.fixed.join(", "));
    if(tl.any)lines.push("<b>Tool Proficiencies:</b> choose "+tl.any+" (see background text)");
    var html=lines.map(function(x){return '<p class="prof-line">'+x+"</p>";}).join("");
    var pending=false,picks=0;
    groups.forEach(function(gr){html+=bgSelectHtml(gr.g,gr.pool,gr.n,gr.l);picks+=gr.n;if(bgFilled(gr.g,gr.n)<gr.n)pending=true;});
    return {html:html,pending:pending,picks:picks};
  }
  function renderBackground(){return creatorUI.renderBackground.apply(null,arguments);}

  /* ---------- character details ---------- */
  function renderDetails(){return creatorUI.renderDetails.apply(null,arguments);}

  /* ---------- species / race ---------- */
  var ABIL_ABBR={Strength:"Str",Dexterity:"Dex",Constitution:"Con",Intelligence:"Int",Wisdom:"Wis",Charisma:"Cha"};
  function abilShort(ab){
    if(!ab)return "";
    var parts=[];
    for(var k in ab.fixed)parts.push((ABIL_ABBR[k]||k)+" +"+ab.fixed[k]);
    (ab.choose||[]).forEach(function(c){parts.push("+"+c.amount+" to "+c.count+" of choice");});
    return parts.join("; ");
  }
  function combineAbil(base,lin){
    var f={},k;
    for(k in base.fixed)f[k]=base.fixed[k];
    for(k in lin.fixed)f[k]=(f[k]||0)+lin.fixed[k];
    return {fixed:f,choose:base.choose.concat(lin.choose)};
  }
  function currentRace(){
    if(!state.race)return null;
    var list=(window.CC_RACES&&window.CC_RACES[state.edition])||[];
    return list.filter(function(r){return r.name===state.race.name&&r.source===state.race.source;})[0]||null;
  }
  // A lineage can add languages of its own (High Elf's extra standard language,
  // Duergar's Undercommon, ...), so combine them with the species entry.
  function mergedLanguages(race,lin){
    var out={fixed:[],anyStandard:0,any:0,choose:null};
    function addFrom(L){
      if(!L)return;
      (L.fixed||[]).forEach(function(x){if(out.fixed.indexOf(x)<0)out.fixed.push(x);});
      out.anyStandard+=L.anyStandard||0;
      out.any+=L.any||0;
      if(L.choose&&!out.choose)out.choose=L.choose;
    }
    addFrom(race&&race.languages);addFrom(lin&&lin.languages);
    return out;
  }
  function currentLineage(race){
    if(!race||!state.raceLineage)return null;
    return race.lineages.filter(function(l){return l.name===state.raceLineage;})[0]||null;
  }
  // Lineage names carry a " (SRC)" suffix so the dropdown can tell three Eladrins apart;
  // that source code is noise on the sheet, so strip it for display.
  function cleanLineageName(nm){return String(nm||"").replace(/\s*\([A-Z0-9]{2,6}\)\s*$/,"").trim();}
  // The species label to show: the chosen lineage (e.g. "Eladrin") when there is one,
  // otherwise the base species (e.g. "Human").
  function speciesLabel(){
    var race=currentRace(),lin=race?currentLineage(race):null;
    if(!race)return "";
    return lin?cleanLineageName(lin.name):race.name;
  }
  function raceChoiceCount(group,count){var n=0;for(var i=0;i<count;i++)if(state.raceChoices[group+":"+i])n++;return n;}
  /* Species that grant a *choice* of spell (Astral Elf's Astral Fire — one of dancing
     lights / light / sacred flame) store the options in spellPicks. Only the chosen ones
     count as known, so racial spells route through here rather than being read raw. */
  function spellPicksAll(race,lin){
    var out=[];
    if(race)(race.spellPicks||[]).forEach(function(pk,i){out.push({pk:pk,group:"race:spellpick"+i});});
    if(lin)(lin.spellPicks||[]).forEach(function(pk,i){out.push({pk:pk,group:"lin:spellpick"+i});});
    return out;
  }
  function pickedRacialSpells(){
    var race=currentRace(),lin=race?currentLineage(race):null,out=[];
    spellPicksAll(race,lin).forEach(function(p){
      for(var i=0;i<p.pk.choose;i++){var v=state.raceChoices[p.group+":"+i];if(v)out.push({name:v,cantrip:!!p.pk.cantrip,when:p.pk.when||"known"});}
    });
    return out;
  }
  // Every racial/innate spell the character actually has: the fixed grants plus their picks.
  function allRacialSpells(){
    var race=currentRace(),lin=race?currentLineage(race):null,out=[];
    if(race)out=out.concat(race.spells||[]);
    if(lin)out=out.concat(lin.spells||[]);
    return out.concat(pickedRacialSpells());
  }

  /* ---------- custom origin ability increases ----------
     Many 2014-era species (MPMM, MOT, AAG, and PHB Human) carry no fixed ability
     increase: the player allocates them ("Customizing Your Origin"). 2024 species
     get theirs from the background instead, so this only applies to classic. */
  var CUSTOM_ASI_MODES={"2-1":[2,1],"1-1-1":[1,1,1],"all":[1,1,1,1,1,1]};
  function needsCustomAsi(race,lin){
    if(!race||state.edition!=="classic")return false;
    var ab=combineAbil(race.ability,lin?lin.ability:{fixed:{},choose:[]});
    for(var k in ab.fixed)return false;
    return !ab.choose.length;
  }
  function customAsiPicks(){
    var mode=state.raceChoices["race:custom:mode"];
    if(!mode||!CUSTOM_ASI_MODES[mode])return [];
    var w=CUSTOM_ASI_MODES[mode],out=[];
    if(mode==="all"){ABILITIES.forEach(function(a){out.push({ability:a,amount:1});});return out;}
    for(var i=0;i<w.length;i++){
      var a=state.raceChoices["race:custom:a"+i];
      if(a)out.push({ability:a,amount:w[i]});
    }
    return out;
  }
  function customAsiHtml(){
    var mode=state.raceChoices["race:custom:mode"]||"";
    var opts=[["","— Choose an arrangement —"],["2-1","+2 to one ability, +1 to another"],
              ["1-1-1","+1 to three different abilities"],["all","+1 to all six (2014 Human)"]];
    var html='<div class="origin-picker"><label>Ability score increases (custom origin)</label>'+
      '<select class="race-custom-mode">'+opts.map(function(o){
        return '<option value="'+o[0]+'"'+(mode===o[0]?" selected":"")+'>'+esc(o[1])+"</option>";
      }).join("")+"</select>";
    if(mode&&mode!=="all"){
      var w=CUSTOM_ASI_MODES[mode];
      for(var i=0;i<w.length;i++){
        var cur=state.raceChoices["race:custom:a"+i]||"",others=[];
        for(var j=0;j<w.length;j++){if(j!==i){var v=state.raceChoices["race:custom:a"+j];if(v)others.push(v);}}
        html+='<select class="race-custom-abil" data-idx="'+i+'"><option value="">— Ability (+'+w[i]+') —</option>'+
          ABILITIES.map(function(a){
            return '<option value="'+a+'"'+(others.indexOf(a)>=0?" disabled":"")+(cur===a?" selected":"")+">"+a+" +"+w[i]+"</option>";
          }).join("")+"</select>";
      }
    }
    if(mode==="all")html+='<div class="choice-desc">+1 to Strength, Dexterity, Constitution, Intelligence, Wisdom and Charisma.</div>';
    return html+"</div>";
  }
  function customAsiPending(){
    var mode=state.raceChoices["race:custom:mode"];
    if(!mode)return true;
    if(mode==="all")return false;
    var w=CUSTOM_ASI_MODES[mode];
    for(var i=0;i<w.length;i++)if(!state.raceChoices["race:custom:a"+i])return true;
    return false;
  }
  /* Every feat the character has taken: the one a species hands out and any taken in
     place of an Ability Score Improvement. Each carries the key prefix and the store its
     own picks live in, so two copies of a feat never share answers. */
  function allChosenFeats(){
    var out=[],g=raceFeatGrant(),i;
    if(g)for(i=0;i<g.count;i++){
      var rf=featByName(raceFeatName(i));
      if(rf)out.push({ft:rf,base:"race:feat"+i+":",store:state.raceChoices});
    }
    var fd=derivedState.fdata;
    if(fd)(fd.classFeatures||[]).forEach(function(f){
      if(f.name!=="Ability Score Improvement"||f.level>state.level)return;
      if(state.choices["asi:"+f.level+":mode"]!=="feat")return;
      var af=featByName(state.choices["asi:"+f.level+":feat"]);
      if(af)out.push({ft:af,base:"asi:"+f.level+":ft:",store:state.choices});
    });
    return out;
  }
  /* ---------- what a feat actually grants ----------
     A feat is not just prose: Metamagic Adept hands out two Metamagic options and two
     sorcery points, Skilled three skills or tools, Skill Expert a skill plus expertise.
     5etools records all of that structurally, so these read the record rather than the
     text, and every call site (an ASI feat, a feat from your species) shares them.

     `store` is the object the picks live in (state.choices or state.raceChoices) and
     `base` is the key prefix, so the same feat can be taken twice without collision. */
  function optFeatureList(types,ed){
    var pool=window.CC_OPTFEATURES||{},out=[],seen={};
    (types||[]).forEach(function(ty){
      (pool[ty]||[]).forEach(function(o){
        if(o.edition!==ed)return;
        if(seen[o.name])return;                 // the same option is reprinted per edition
        seen[o.name]=1;out.push(o);
      });
    });
    // fall back to the other edition when a list only exists there (Maneuvers, Invocations)
    if(!out.length)(types||[]).forEach(function(ty){
      (pool[ty]||[]).forEach(function(o){if(!seen[o.name]){seen[o.name]=1;out.push(o);}});
    });
    out.sort(function(a,b){return a.name<b.name?-1:(a.name>b.name?1:0);});
    return out;
  }
  // the skills/tools/languages a "choose any" grant can draw from
  function anyPool(kind){
    if(kind==="anySkill")return ALL_SKILLS.slice();
    if(kind==="anyLanguage")return langPool().map(function(o){return o.val;});
    if(kind==="anyTool"||kind==="anyArtisansTool"||kind==="anyMusicalInstrument"){
      var t=(window.CC_PROF_OPTS||{}).tools||{},out=[],g;
      for(g in t){
        if(kind==="anyArtisansTool"&&g.indexOf("Artisan")<0)continue;
        if(kind==="anyMusicalInstrument"&&g.indexOf("Musical")<0)continue;
        (t[g]||[]).forEach(function(x){out.push(x);});
      }
      return out;
    }
    return [];
  }
  /* A feat's spell grant names its choices with a 5etools filter rather than a list -
     Fey Touched offers "level=1|school=E;D", one 1st-level enchantment or divination spell.
     This resolves such a filter against the spell data. */
  var SCHOOL_LETTER={A:"Abjuration",C:"Conjuration",D:"Divination",E:"Enchantment",
                     V:"Evocation",I:"Illusion",N:"Necromancy",T:"Transmutation",P:"Psionic"};
  function spellFilterPool(filter){
    var want={lvl:null,schools:null,cls:null,ritual:false};
    String(filter||"").split("|").forEach(function(part){
      var i=part.indexOf("=");
      if(i<0)return;
      var k=part.slice(0,i).trim().toLowerCase(),v=part.slice(i+1).trim();
      if(k==="level")want.lvl=parseInt(v,10);
      else if(k==="school"){
        want.schools={};
        v.split(";").forEach(function(s){
          s=s.trim();
          want.schools[(SCHOOL_LETTER[s.toUpperCase()]||s).toLowerCase()]=1;
        });
      }
      else if(k==="class"){
        // a filter may name several lists at once, as "class=Cleric;Wizard" does
        want.cls={};
        v.split(";").forEach(function(c){c=c.trim();if(c)want.cls[c.toLowerCase()]=1;});
      }
      else if(/ritual/i.test(v))want.ritual=true;
    });
    var out=[];
    (window.CC_SPELLS||[]).forEach(function(s){
      if(want.lvl!=null&&s.level!==want.lvl)return;
      if(want.schools&&!want.schools[String(s.school||"").toLowerCase()])return;
      if(want.ritual&&!s.ritual)return;
      if(want.cls){
        // the filters are inconsistently cased ("class=Bard" but "class=cleric")
        var c=s.cls||{},hit=false;
        [].concat(c.classic||[],c.one||[]).forEach(function(x){
          if(want.cls[String(x).toLowerCase()])hit=true;
        });
        if(!hit)return;
      }
      if(out.indexOf(s.name)<0)out.push(s.name);
    });
    out.sort();
    return out;
  }
  // which spell block of a feat applies (Magic Initiate offers one list per class)
  function featSpellBlock(ft,base,store){
    var sp=ft&&ft.spells;
    if(!sp||!sp.length)return null;
    if(sp.length===1)return sp[0];
    var pick=(store||{})[base+"sb"];
    for(var i=0;i<sp.length;i++)if(sp[i].name===pick)return sp[i];
    return null;                       // nothing chosen yet
  }
  /* Every pick a feat asks for, as a list of {key, label, pool} so the renderer and the
     "what did you choose" reader stay in step. */
  /* Guard against a loop: the expertise pool is "skills you are proficient in", and the
     proficient-skill list now includes what feats grant - which is worked out here. While
     building the slots we therefore read the list without the feat contribution. */
  var _inFeatSlots=false;
  function featPickSlots(ft,base,store){
    if(!ft)return [];
    store=store||{};
    var slots=[],i;
    (ft.optProg||[]).forEach(function(p,pi){
      var pool=optFeatureList(p.types,ft.edition).map(function(o){return o.name;});
      for(i=0;i<p.count;i++)slots.push({kind:"option",key:base+"opt:"+pi+":"+i,
        label:p.name+(p.count>1?" ("+(i+1)+" of "+p.count+")":""),pool:pool,types:p.types});
    });
    var ANY={skills:"anySkill",tools:"anyTool",langs:"anyLanguage"};
    /* A weapon choice arrives as a 5etools filter ("type=martial weapon;mundane weapon"),
       so it is resolved against the plain weapons in the item list. */
    function filterPool(expr){
      var want={},m=/type=([^|]+)/.exec(String(expr||""));
      if(m)m[1].split(";").forEach(function(x){want[x.trim().toLowerCase()]=1;});
      var out=[],seen={};
      (window.CC_ITEMS||[]).forEach(function(it){
        if(it.cat!=="Weapon")return;
        if(it.rarity&&it.rarity!=="none")return;              // no magic items
        if(it.baseItem||it.variant||it.bonusWeapon)return;    // no variants
        var wc=String(it.weaponCat||"").toLowerCase();
        if(!wc)return;
        if((want["martial weapon"]&&wc==="martial")||(want["simple weapon"]&&wc==="simple")||
           (!want["martial weapon"]&&!want["simple weapon"])){
          if(!seen[it.name]){seen[it.name]=1;out.push(it.name);}
        }
      });
      out.sort();
      return out;
    }
    function profSlots(g,kind,label){
      if(!g)return;
      if(g.choose){
        var pool=(g.choose.from&&g.choose.from.length)?g.choose.from:filterPool(g.choose.fromFilter);
        for(i=0;i<g.choose.count;i++)
          slots.push({kind:kind,key:base+kind+":c"+i,label:label,pool:pool});
      }
      for(i=0;i<(g.any||0);i++)
        slots.push({kind:kind,key:base+kind+":a"+i,label:label,pool:anyPool(ANY[kind]||"")});
    }
    profSlots(ft.skills,"skills","Skill proficiency");
    profSlots(ft.tools,"tools","Tool proficiency");
    profSlots(ft.langs,"langs","Language");
    profSlots(ft.weapons,"weapons","Weapon proficiency");
    if(ft.stl){                                  // Skilled: any mix of skills and tools
      var mixed=[];
      (ft.stl.from||[]).forEach(function(k){mixed=mixed.concat(anyPool(k));});
      for(i=0;i<ft.stl.count;i++)slots.push({kind:"stl",key:base+"stl:"+i,
        label:"Skill or tool proficiency",pool:mixed});
    }
    // spells the feat grants: pick the list first when it offers several, then the spells
    var sblocks=ft.spells||[];
    if(sblocks.length>1&&sblocks[0].name)
      slots.push({kind:"spellblock",key:base+"sb",label:"Spell list",
                  pool:sblocks.map(function(b){return b.name;})});
    var sb=featSpellBlock(ft,base,store);
    if(sb)(sb.choose||[]).forEach(function(ch,ci){
      var pool=spellFilterPool(ch.filter);
      for(var q=0;q<(ch.count||1);q++)
        slots.push({kind:"spell",key:base+"sp:"+ci+":"+q,
                    label:(ch.count>1?"Spell ("+(q+1)+" of "+ch.count+")":"Spell"),pool:pool});
    });
    for(i=0;i<(ft.expertise||0);i++){            // expertise applies to what you are proficient in
      var prof=[];
      var was=_inFeatSlots;_inFeatSlots=true;
      var ps=proficientSkills();
      _inFeatSlots=was;
      for(var s in ps)prof.push(s);
      prof.sort();
      slots.push({kind:"expertise",key:base+"exp:"+i,label:"Expertise (double proficiency)",pool:prof});
    }
    return slots;
  }
  function featPicks(ft,base,store){
    var out={options:[],skills:[],tools:[],langs:[],expertise:[],spells:[]};
    featPickSlots(ft,base,store).forEach(function(s){
      var v=store[s.key];
      if(!v)return;
      if(s.kind==="option")out.options.push(v);
      else if(s.kind==="spell")out.spells.push(v);
      else if(s.kind==="spellblock")return;   // which list, not a spell itself
      else if(s.kind==="stl"){
        // one pool of skills and tools: file it under whichever it is
        (ALL_SKILLS.indexOf(v)>=0?out.skills:out.tools).push(v);
      }
      else out[s.kind].push(v);
    });
    return out;
  }
  function featPicksPending(ft,base,store){
    var slots=featPickSlots(ft,base,store);
    for(var i=0;i<slots.length;i++)
      if(slots[i].pool.length&&!store[slots[i].key])return true;   // an empty pool cannot be answered yet
    return false;
  }
  function featPicksHtml(ft,base,store,cls){
    var slots=featPickSlots(ft,base,store),html="";
    slots.forEach(function(s){
      var cur=store[s.key]||"",taken=[];
      slots.forEach(function(o){if(o!==s&&o.kind===s.kind){var v=store[o.key];if(v)taken.push(v);}});
      if(!s.pool.length){
        html+='<div class="choice-desc tag-note">'+esc(s.label)+
          (s.kind==="expertise"?": choose your skill proficiencies first, then come back."
                               :": nothing to choose from.")+"</div>";
        return;
      }
      html+='<select class="'+cls+'" data-key="'+esc(s.key)+'"><option value="">- '+esc(s.label)+" -</option>"+
        s.pool.map(function(x){
          return '<option value="'+esc(x)+'"'+(taken.indexOf(x)>=0?" disabled":"")+(cur===x?" selected":"")+">"+esc(x)+"</option>";
        }).join("")+"</select>";
      if(s.kind==="option"&&cur){               // show what the chosen option does
        var o=optFeatureList(s.types,ft.edition).filter(function(x){return x.name===cur;})[0];
        if(o&&o.entries&&o.entries.length)
          html+='<div class="choice-desc">'+o.entries.map(renderEntry).join("")+"</div>";
      }
    });
    return html;
  }
  /* A feat can also top up a class resource ("You gain 2 sorcery points to spend on
     Metamagic"). The amount is only in the prose, so it is read from there and matched
     against the resource names the class actually tracks. */
  // everything the taken feats grant, merged (their fixed grants plus what you picked)
  function featGrantsAll(){
    var out={options:[],skills:[],tools:[],langs:[],expertise:[],armor:[],weapons:[],saves:[],spells:[]};
    function push(a,v){if(v&&a.indexOf(v)<0)a.push(v);}
    allChosenFeats().forEach(function(rec){
      var ft=rec.ft,p=featPicks(ft,rec.base,rec.store);
      ["options","skills","tools","langs","expertise","spells"].forEach(function(k){
        (p[k]||[]).forEach(function(v){push(out[k],v);});
      });
      // spells the feat grants outright (Fey Touched's Misty Step)
      var sb=featSpellBlock(ft,rec.base,rec.store);
      if(sb)(sb.fixed||[]).forEach(function(v){push(out.spells,v);});
      ["skills","tools","langs","armor","weapons","saves"].forEach(function(k){
        var g=ft[k];
        if(g&&g.fixed)g.fixed.forEach(function(v){push(out[k],v);});
      });
    });
    return out;
  }
  function featResourceBonus(){
    var res=(window.CC_RESOURCES&&window.CC_RESOURCES[state.slug])||[],out={};
    if(!res.length)return out;
    allChosenFeats().forEach(function(rec){
      var txt=plainTags(entryText(rec.ft.entries||"")).toLowerCase();
      res.forEach(function(r){
        var nm=r.name.toLowerCase();
        var re=new RegExp("gain (\\d+) "+nm.replace(/[^a-z0-9 ]/g,"."),"i");
        var m=re.exec(txt);
        if(m)out[r.name]=(out[r.name]||0)+parseInt(m[1],10);
      });
    });
    return out;
  }
  /* ---------- a feat granted by the species ----------
     Variant Human and Custom Lineage hand out a feat at level 1, and the 2024 Human's
     Versatile trait hands out an Origin feat. The grant is recorded in the species data,
     so the picker (and the feat's own ability increases) work from that. */
  function raceFeatGrant(){
    var race=currentRace(),lin=race?currentLineage(race):null;
    return (lin&&lin.feats)||(race&&race.feats)||null;
  }
  function raceFeatOptions(){
    var g=raceFeatGrant();
    return (window.CC_FEATS||[]).filter(function(ft){
      if(ft.edition!==state.edition)return false;
      return (g&&g.category)?ft.category===g.category:true;
    });
  }
  function raceFeatName(i){return state.raceChoices["race:feat:"+i]||"";}
  // ability increases the chosen feat grants (Slasher's +1 Dex, and the like)
  function raceFeatPicks(){
    var g=raceFeatGrant();if(!g)return [];
    var out=[];
    for(var i=0;i<g.count;i++){
      var ft=featByName(raceFeatName(i));
      if(!ft||!ft.ability)continue;
      for(var k in ft.ability.fixed)out.push({ability:k,amount:ft.ability.fixed[k],from:ft.name});
      var ch=ft.ability.choose;
      if(ch)for(var j=0;j<ch.count;j++){
        var a=state.raceChoices["race:featab:"+i+":"+j];
        if(a)out.push({ability:a,amount:ch.amount,from:ft.name});
      }
    }
    return out;
  }
  function raceFeatPending(){
    var g=raceFeatGrant();if(!g)return false;
    for(var i=0;i<g.count;i++){
      var nm=raceFeatName(i);
      if(!nm)return true;
      var ft=featByName(nm);
      if(ft&&ft.ability&&ft.ability.choose)
        for(var j=0;j<ft.ability.choose.count;j++)if(!state.raceChoices["race:featab:"+i+":"+j])return true;
      if(ft&&featPicksPending(ft,"race:feat"+i+":",state.raceChoices))return true;
    }
    return false;
  }
  function raceFeatHtml(){
    var g=raceFeatGrant();if(!g)return "";
    var opts=raceFeatOptions(),html="";
    for(var i=0;i<g.count;i++){
      var cur=raceFeatName(i);
      html+='<div class="origin-picker"><label>'+(g.category?esc(g.category)+" feat":"Feat")+
        " from your species"+(g.count>1?" ("+(i+1)+" of "+g.count+")":"")+"</label>"+
        '<select class="race-feat" data-idx="'+i+'"><option value="">- Choose a feat -</option>'+
        opts.map(function(ft){
          return '<option value="'+esc(ft.name)+'"'+(cur===ft.name?" selected":"")+">"+esc(ft.name)+
            (ft.category&&!g.category?" ("+esc(ft.category)+")":"")+"</option>";
        }).join("")+"</select>";
      var ft=featByName(cur);
      if(ft){
        if(ft.entries&&ft.entries.length)html+='<div class="choice-desc">'+ft.entries.map(renderEntry).join("")+"</div>";
        html+=featPicksHtml(ft,"race:feat"+i+":",state.raceChoices,"race-featpick");
        if(ft.ability){
          var fixedTxt=[],k;
          for(k in ft.ability.fixed)fixedTxt.push(k+" +"+ft.ability.fixed[k]);
          if(fixedTxt.length)html+='<div class="choice-desc">Grants '+esc(fixedTxt.join(", "))+".</div>";
          var ch=ft.ability.choose;
          if(ch)for(var j=0;j<ch.count;j++){
            var curA=state.raceChoices["race:featab:"+i+":"+j]||"",others=[];
            for(var q=0;q<ch.count;q++){if(q!==j){var v=state.raceChoices["race:featab:"+i+":"+q];if(v)others.push(v);}}
            html+='<select class="race-featab" data-idx="'+i+'" data-sub="'+j+'">'+
              '<option value="">- '+esc(ft.name)+": +"+ch.amount+' to which ability? -</option>'+
              ch.from.map(function(a){
                return '<option value="'+a+'"'+(others.indexOf(a)>=0?" disabled":"")+(curA===a?" selected":"")+">"+a+" +"+ch.amount+"</option>";
              }).join("")+"</select>";
          }
        }
      }
      html+="</div>";
    }
    return html;
  }
  function raceSelectHtml(group,pool,count,label){
    var chosen=[];for(var i=0;i<count;i++)chosen.push(state.raceChoices[group+":"+i]||"");
    var picked=chosen.filter(Boolean).length;
    var html='<div class="origin-picker"><label>'+esc(label)+' ('+picked+'/'+count+')'+
      (picked<count?'<span class="need-choice">choose '+(count-picked)+' more</span>':'')+'</label>';
    for(var i=0;i<count;i++){
      var others=chosen.filter(function(v,idx){return idx!==i&&v;});
      var opts='<option value="">— Choose —</option>'+pool.map(function(o){
        var val=(typeof o==="string")?o:o.val,lab=(typeof o==="string")?o:o.label;
        var dis=others.indexOf(val)>=0?" disabled":"",sel=chosen[i]===val?" selected":"";
        return '<option value="'+esc(val)+'"'+dis+sel+'>'+esc(lab)+"</option>";
      }).join("");
      html+='<select class="race-sel" data-group="'+esc(group)+'" data-idx="'+i+'">'+opts+"</select>";
    }
    return html+"</div>";
  }
  function renderRace(){return creatorUI.renderRace.apply(null,arguments);}

  /* ---------- ability scores ---------- */
  var POINT_BUY_COST={8:0,9:1,10:2,11:3,12:4,13:5,14:7,15:9};
  var STANDARD_ARRAY=[15,14,13,12,10,8];
  function rollSix(){
    var out=[];
    for(var i=0;i<6;i++){var r=[];for(var j=0;j<4;j++)r.push(1+Math.floor(Math.random()*6));r.sort(function(a,b){return a-b;});out.push(r[1]+r[2]+r[3]);}
    return out.sort(function(a,b){return b-a;});
  }
  function abMod(score){
    if(CCRules&&CCRules.abMod)return CCRules.abMod(score);
    return Math.floor((score-10)/2);
  }
  function modStr(m){return (m>=0?"+":"")+m;}
  function capWord(s){s=String(s);return s.charAt(0).toUpperCase()+s.slice(1);}
  // aggregate every ability increase the character has earned/chosen so far
  function abilityBonusMap(){
    var map={};ABILITIES.forEach(function(a){map[a]=[];});
    function add(ab,src,amt){if(map[ab]!==undefined&&amt)map[ab].push({src:src,amt:amt});}
    var race=currentRace(),lin=race?currentLineage(race):null;
    if(race){
      for(var k in race.ability.fixed)add(k,race.name,race.ability.fixed[k]);
      if(lin)for(var k2 in lin.ability.fixed)add(k2,lin.name,lin.ability.fixed[k2]);
      var chooseList=[];
      race.ability.choose.forEach(function(c){chooseList.push({label:race.name,src:"asi",c:c});});
      if(lin)lin.ability.choose.forEach(function(c){chooseList.push({label:lin.name,src:"linasi",c:c});});
      chooseList.forEach(function(ch,idx){
        var grp="race:"+ch.src+idx;
        for(var i=0;i<ch.c.count;i++){var ab=state.raceChoices[grp+":"+i];if(ab)add(ab,ch.label,ch.c.amount);}
      });
      customAsiPicks().forEach(function(p){add(p.ability,"Custom origin",p.amount);});
    }
    if(derivedState.fdata){
      derivedState.fdata.classFeatures.forEach(function(f){
        if(f.name!=="Ability Score Improvement"||f.level>state.level)return;
        if(state.choices["asi:"+f.level+":mode"]!=="asi")return;
        var dist=state.choices["asi:"+f.level+":dist"]||"2";
        if(dist==="2"){var a=state.choices["asi:"+f.level+":a0"];if(a)add(a,"ASI (level "+f.level+")",2);}
        else{var a0=state.choices["asi:"+f.level+":a0"],a1=state.choices["asi:"+f.level+":a1"];if(a0)add(a0,"ASI (level "+f.level+")",1);if(a1)add(a1,"ASI (level "+f.level+")",1);}
      });
      // half-feats (Slasher, Resilient, Actor, ...) grant their own increases
      derivedState.fdata.classFeatures.forEach(function(f){
        if(f.name!=="Ability Score Improvement"||f.level>state.level)return;
        if(state.choices["asi:"+f.level+":mode"]!=="feat")return;
        featAsiPicks(f.level).forEach(function(p){add(p.ability,p.from+" (level "+f.level+")",p.amount);});
      });
    }
    // a feat the species grants (Variant Human, Custom Lineage, 2024 Human) can raise scores too
    raceFeatPicks().forEach(function(p){add(p.ability,p.from+" (species feat)",p.amount);});
    return map;
  }
  function pbRemaining(){var u=0;ABILITIES.forEach(function(a){u+=(POINT_BUY_COST[state.abilities.base[a]]||0);});return 27-u;}
  function baseScore(a){var ab=state.abilities;if(ab.method==="pointbuy")return ab.base[a]||8;var v=ab.assign[a];return v?parseInt(v,10):null;}
  function bonusSum(a){
    var list=abilityBonusMap()[a];       // an ability we do not recognise contributes nothing
    return list?list.reduce(function(s,b){return s+b.amt;},0):0;
  }
  function totalScore(a){
    var ov=state.abilities.override[a];
    if(ov!==undefined&&ov!==""&&ov!==null&&!isNaN(parseInt(ov,10)))return parseInt(ov,10);
    var base=baseScore(a);if(base==null)base=0;
    var other=parseInt(state.abilities.other[a],10)||0;
    var tot=base+bonusSum(a)+other;
    /* Worn gear last: a Belt of Hill Giant Strength sets Strength to 21 unless it is
       already higher, an Ioun Stone of Agility simply adds. */
    var ib=itemBonuses().abil[a];
    return rulesEngine.abilityWithItems(tot,ib);
  }

  function renderAbilities(){return creatorUI.renderAbilities.apply(null,arguments);}

  /* ---------- equipment ---------- */
  var _itemIndex=null;
  function itemIndex(){if(_itemIndex)return _itemIndex;_itemIndex={};(window.CC_ITEMS||[]).forEach(function(it){var k=it.name.toLowerCase();if(!_itemIndex[k])_itemIndex[k]=it;});return _itemIndex;}
  function matchItem(name){
    var n=String(name).toLowerCase(),s=n.replace(/\s*\(.*?\)\s*/g,"").trim(),L=window.CC_ITEMS||[],loose=null;
    for(var i=0;i<L.length;i++){
      var ln=L[i].name.toLowerCase();
      if(ln!==n&&ln!==s)continue;
      if(itemAllowed(L[i]))return L[i];
      if(!loose)loose=L[i];
    }
    return loose;
  }
  // 5etools keeps armour mechanics in fields, not in the description, so build those
  // sentences ourselves: the stealth penalty and the minimum-Strength speed rule.
  function itemMechanics(it){
    var info=itemInfo(it.name,it.source)||it||{},out=[];
    if(info.stealthDis)out.push("The wearer has disadvantage on Dexterity (Stealth) checks.");
    if(info.strReq)out.push("If the wearer has a Strength score lower than "+info.strReq+", their speed is reduced by 10 feet.");
    return out;
  }
  function itemEntriesFull(it){
    var info=itemInfo(it.name,it.source)||it||{};
    return itemMechanics(it).concat(info.entries||it.entries||[]);
  }
  var _itemByKey=null;
  function itemInfo(name,source){if(!_itemByKey){_itemByKey={};(window.CC_ITEMS||[]).forEach(function(it){_itemByKey[it.name+"|"+(it.source||"")]=it;});}return _itemByKey[name+"|"+(source||"")]||null;}
  function addItemObj(it){
    var inv=state.equipment.inventory;
    var ex=inv.filter(function(x){return x.name===it.name&&x.source===it.source;})[0];
    if(ex){ex.qty=(ex.qty||1)+1;return;}
    inv.push({name:it.name,source:it.source||"",cat:it.cat||"Other Gear",rarity:it.rarity,ac:it.ac,armorKind:it.armorKind,
              dmg:it.dmg,dmgType:it.dmgType,wtype:it.wtype,range:it.range,props:it.props,
              attune:it.attune||null,bonusWeapon:it.bonusWeapon||null,requires:it.requires||null,base:null,
              qty:1,equipped:false,generic:!!it.generic});
  }
  // base weapons a magic variant may be applied to (from its `requires` tags)
  function baseWeaponsFor(reqs){
    if(!reqs||!reqs.length)return [];
    return (window.CC_ITEMS||[]).filter(function(x){
      if(!itemAllowed(x))return false;
      if(!x.tags||!x.dmg)return false;
      for(var i=0;i<reqs.length;i++)if(x.tags.indexOf(reqs[i])>=0)return true;
      return false;
    }).sort(function(a,b){return a.name.localeCompare(b.name);});
  }
  function isVariantWeapon(it){
    if(it.dmg)return false;
    var r=it.requires||(itemInfo(it.name,it.source)||{}).requires;
    if(!r)return false;
    for(var i=0;i<r.length;i++)if(["weapon","sword","axe","bow","crossbow","dagger","hammer","mace","polearm","spear","club","staff"].indexOf(r[i])>=0)return true;
    return false;
  }
  // effective weapon stats: own stats, or a variant applied to its chosen base weapon
  function resolveWeapon(it){
    var att=itemAttune(it),attRequired=!!att&&att!=="optional",attuneOk=!attRequired||!!it.attuned;
    var bonus=0,bw=it.bonusWeapon||(itemInfo(it.name,it.source)||{}).bonusWeapon;
    if(bw&&attuneOk)bonus=parseInt(String(bw).replace("+",""),10)||0;
    // weaponCat (simple/martial) decides monk-weapon status; older saves omit it, so fall
    // back to the item database
    var wc=it.weaponCat||(itemInfo(it.name,it.source)||{}).weaponCat||"";
    if(it.dmg)return {name:it.name,dmg:it.dmg,dmgType:it.dmgType,wtype:it.wtype,range:it.range,props:it.props||[],weaponCat:wc,bonus:bonus,attuneOk:attuneOk,attRequired:attRequired,att:att};
    if(!isVariantWeapon(it)||!it.base)return null;
    var b=null,L=window.CC_ITEMS||[];
    for(var i=0;i<L.length;i++)if(L[i].name===it.base&&L[i].dmg){b=L[i];break;}
    if(!b)return null;
    return {name:it.name+" ("+b.name+")",dmg:b.dmg,dmgType:b.dmgType,wtype:b.wtype,range:b.range,props:b.props||[],weaponCat:b.weaponCat||"",bonus:bonus,attuneOk:attuneOk,attRequired:attRequired,att:att};
  }
  // attunement is only possible on items whose data says so (reqAttune)
  function itemAttune(it){
    if(it&&it.attune)return it.attune;
    var info=itemInfo(it.name,it.source);
    return (info&&info.attune)||null;
  }
  function attuneNote(a){
    if(a===true||a==="true")return "requires attunement";
    if(a==="optional")return "attunement optional";
    return "requires attunement "+String(a);
  }
  function addByName(name){var m=matchItem(name);if(m)addItemObj(m);else addItemObj({name:name,cat:"Other Gear",generic:true});}
  function rollDiceStr(f){
    var m=f.match(/(\d+)d(\d+)/);if(!m)return 0;
    var n=+m[1],s=+m[2],t=0,i;for(i=0;i<n;i++)t+=1+Math.floor(Math.random()*s);
    var rest=f.replace(/\d+\s*d\s*\d+/,""),mu=rest.match(/(\d+)/);  // any leftover number is the multiplier (× / x / *)
    if(mu)t*=+mu[1];
    return t;
  }
  function currencyGP(){var c=state.equipment.currency;return (c.pp||0)*10+(c.gp||0)+(c.ep||0)*0.5+(c.sp||0)*0.1+(c.cp||0)*0.01;}

  /* ---------- armour ---------- */
  // Core books define an edition; supplements, settings and adventures apply to both.
  var EDITION_CORE={PHB:"classic",DMG:"classic",XPHB:"one",XDMG:"one"};
  function itemEdition(it){return it.edition||EDITION_CORE[it.source]||null;}
  // Keep an item unless it is clearly from the other edition's core books.
  function itemAllowed(it){
    var e=itemEdition(it);
    return !e||!state.edition||e===state.edition;
  }
  function findItemByName(nm){var L=window.CC_ITEMS||[];for(var i=0;i<L.length;i++)if(L[i].name===nm)return L[i];return null;}
  // an Armor-category item without an armorKind is a magic variant that needs a base (e.g. "+1 Armor")
  function isVariantArmor(it){
    if(it.armorKind)return false;
    var info=itemInfo(it.name,it.source)||{};
    return (it.cat||info.cat)==="Armor";
  }
  function baseArmorsFor(it){
    var info=itemInfo(it.name,it.source)||{},reqs=it.requires||info.requires||[];
    var wantShield=(reqs.indexOf("shield")>=0)||/shield/i.test(it.name);
    return (window.CC_ITEMS||[]).filter(function(x){
      if(!itemAllowed(x))return false;
      if(!x.armorKind)return false;
      return wantShield?(x.armorKind==="shield"):(x.armorKind!=="shield");
    }).sort(function(a,b){return a.name.localeCompare(b.name);});
  }
  // effective armour stats: own values, or a variant applied to its chosen base armour
  function resolveArmor(it){
    var info=itemInfo(it.name,it.source)||{};
    var att=itemAttune(it),attRequired=!!att&&att!=="optional";
    var bonus=parseInt(String(it.bonusAc||info.bonusAc||"0").replace("+",""),10)||0;
    if(attRequired&&!it.attuned)bonus=0;              // no magic benefit without attunement
    if(it.armorKind)return {name:it.name,ac:it.ac,armorKind:it.armorKind,bonus:bonus};
    if(!isVariantArmor(it)||!it.base)return null;     // variant with no base chosen yet
    var b=findItemByName(it.base);
    if(!b||!b.armorKind)return null;
    return {name:it.name+" ("+b.name+")",ac:b.ac,armorKind:b.armorKind,bonus:bonus};
  }

  /* ---------- what worn gear does to the numbers ----------
     Magic items carry their effects as data rather than as prose: a Cloak of Protection is
     bonusAc +1 and bonusSavingThrow +1, a Belt of Hill Giant Strength sets Strength to 21,
     Boots of Speed double the walking speed. Everything equipped is added up here once and
     the rest of the sheet reads the totals, so a newly added item needs no new code.
     An item that calls for attunement does nothing until it is attuned. */
  function abilFromAbbr(k){
    k=String(k).toLowerCase();
    for(var a in ABIL_ABBR)if(ABIL_ABBR[a].toLowerCase()===k)return a;
    return null;
  }
  // categories worn about the person, and those held in the hand
  var WEAR_CATS={Ring:1,Wondrous:1,Armor:1},HOLD_CATS={Weapon:1,Rod:1,Staff:1,Wand:1};
  var EFFECT_KEYS=["bonusAc","bonusWeapon","bonusWeaponAttack","bonusWeaponDamage",
                   "bonusSavingThrow","bonusSavingThrowConcentration","bonusSpellAttack",
                   "bonusSpellSaveDc","bonusAbilityCheck","bonusProficiencyBonus",
                   "critThreshold","modifySpeed","ability","grantsProficiency"];
  function itemHasEffect(it){
    var info=itemInfo(it.name,it.source)||{};
    for(var i=0;i<EFFECT_KEYS.length;i++){
      var k=EFFECT_KEYS[i];
      if(it[k]!==undefined&&it[k]!==null)return true;
      if(info[k]!==undefined&&info[k]!==null)return true;
    }
    return false;
  }
  /* Whether an item can be put on or taken up, and what to call doing so. A cloak or ring
     has to be wearable or its bonuses never reach the sheet, so anything that changes a
     number - or that asks to be attuned - can be equipped, not only armour and weapons. */
  function equipInfo(it){
    var cat=it.cat||(itemInfo(it.name,it.source)||{}).cat||"";
    if(resolveArmor(it)||isVariantArmor(it)||it.armorKind)return {ok:true,verb:it.equipped?"Worn":"Wear"};
    if(HOLD_CATS[cat])return {ok:true,verb:it.equipped?"Wielding":"Wield"};
    if(WEAR_CATS[cat]||itemAttune(it)||itemHasEffect(it))return {ok:true,verb:it.equipped?"Worn":"Wear"};
    return {ok:false,verb:""};
  }
  function itemBonuses(){
    var items=[];
    state.equipment.inventory.forEach(function(it){
      if(!it.equipped)return;
      var att=itemAttune(it),attRequired=!!att&&att!=="optional";
      if(attRequired&&!it.attuned)return;
      var info=itemInfo(it.name,it.source)||{};
      function f(k){var v=it[k];return v===undefined||v===null?info[k]:v;}
      function num(k){var v=f(k);return v==null?0:(parseInt(String(v).replace("+",""),10)||0);}
      // Armor/shield magic AC is already included by resolveArmor -> calculateAC.
      var record={name:it.name,ac:(!resolveArmor(it)&&!isVariantArmor(it)&&!it.armorKind)?num("bonusAc"):0,
        save:num("bonusSavingThrow"),saveConc:num("bonusSavingThrowConcentration"),
        spellAtk:num("bonusSpellAttack"),spellDc:num("bonusSpellSaveDc"),
        abilCheck:num("bonusAbilityCheck"),prof:num("bonusProficiencyBonus"),
        crit:parseInt(f("critThreshold"),10),grantsProficiency:f("grantsProficiency")===true,
        abilities:[],speed:[]};
      var ab=f("ability");
      if(ab&&typeof ab==="object"){
        for(var sk in (ab.static||{})){
          var full=abilFromAbbr(sk);
          if(full)record.abilities.push({name:full,floor:ab.static[sk]});
        }
        for(var dk in ab){
          if(dk==="static"||dk==="choose"||dk==="from"||dk==="count"||dk==="amount")continue;
          var ability=abilFromAbbr(dk);
          if(ability)record.abilities.push({name:ability,delta:ab[dk]});
        }
      }
      var ms=f("modifySpeed");
      if(ms&&typeof ms==="object"){
        ["static","bonus","multiply","equal"].forEach(function(op){
          for(var mk in (ms[op]||{}))record.speed.push({op:op,kind:mk,val:ms[op][mk]});
        });
      }
      items.push(record);
    });
    return rulesEngine.aggregateItems(items);
  }
  /* A plain list of what the worn gear is doing, so it is obvious whether an item has
     been picked up by the sheet or is still waiting to be equipped or attuned. */
  function itemEffectsHtml(){
    var b=itemBonuses(),rows=[];
    function row(v,label,src){if(v)rows.push(modStr(v)+" "+label+" <span class=\"res-sub\">("+esc(src.join(" + "))+")</span>");}
    row(b.ac,"AC",b.sources.ac);
    row(b.save,"to all saving throws",b.sources.save);
    row(b.saveConc,"to concentration saves",b.sources.saveConc);
    row(b.abilCheck,"to all ability checks",b.sources.abilCheck);
    row(b.spellAtk,"to spell attacks",b.sources.spellAtk);
    row(b.spellDc,"to spell save DC",b.sources.spellDc);
    row(b.prof,"proficiency bonus",b.sources.prof);
    for(var a in b.abil){
      var e=b.abil[a],bits=[];
      if(e.delta)bits.push(modStr(e.delta));
      if(e.floor!=null)bits.push("at least "+e.floor);
      if(bits.length)rows.push(a+": "+bits.join(", ")+' <span class="res-sub">('+esc(e.from.join(" + "))+")</span>");
    }
    b.speed.forEach(function(s){
      var how=s.op==="static"?("set to "+s.val+" ft."):
              s.op==="bonus"?(modStr(s.val)+" ft."):
              s.op==="multiply"?("doubled (x"+s.val+")"):
              ("equal to your "+(s.val==="walk"?"walking":String(s.val))+" speed");
      rows.push(capWord(s.kind)+" speed "+how+' <span class="res-sub">('+esc(s.from)+")</span>");
    });
    if(b.crit<20)rows.push("Critical hits on "+b.crit+"–20 " +'<span class="res-sub">('+esc(b.sources.crit.join(" + "))+")</span>");
    b.profItems.forEach(function(n){rows.push("Counts as proficient with it "+'<span class="res-sub">('+esc(n)+")</span>");});
    if(!rows.length)return "";
    return '<div class="res-sub" style="margin-bottom:8px"><b>Item effects</b><br>'+rows.join("<br>")+"</div>";
  }

  /* ---------- AC ----------
     Alternative AC formulas (Unarmored Defense, Natural Armor, Draconic Resilience, ...)
     are read from the feature text rather than hard-coded, so any source works. */
  var ABIL_WORD={strength:"Strength",dexterity:"Dexterity",constitution:"Constitution",
                 intelligence:"Intelligence",wisdom:"Wisdom",charisma:"Charisma"};
  /* Alternative ways to work out AC, read from a feature's own words: the Monk's and
     Barbarian's Unarmored Defense, a Draconic sorcerer's scales, and the natural armour a
     species can have. Two shapes appear:
       "AC equals 10 + your Dexterity modifier + ..."  - a base plus ability modifiers
       "a base AC of 17 (your Dexterity modifier doesn't affect this number)" - a flat
         number, which is a shell or carapace and applies whatever else is worn. */
  function acFormulas(){
    var out=[],seen={};
    featuresAndTraits().forEach(function(t){
      var txt=plainTags(entryText(t.entries||""));
      if(/beast/i.test(txt)&&!/natural armor/i.test(txt))return;   // wild-shape form AC
      // base + ability modifiers
      var m=/(?:armor class|\bac\b)\s*(?:equals|is|of)\s*(?:equal to\s+)?(\d+)\s*(?:\+|plus)\s*([^.]{0,110})/i.exec(txt);
      if(m){
        var tail=m[2],mods=[],re=/(strength|dexterity|constitution|intelligence|wisdom|charisma)/gi,mm;
        while((mm=re.exec(tail)))mods.push(ABIL_WORD[mm[1].toLowerCase()]);
        if(mods.length){
          var key=t.name+"|"+m[1]+"|"+mods.join(",");
          if(!seen[key]){
            seen[key]=1;
            out.push({label:t.name,base:parseInt(m[1],10),mods:mods,
                      noShield:/wielding a shield/i.test(txt)&&!/can (?:use|wield) a shield/i.test(txt)});
          }
          return;
        }
      }
      /* A flat natural armour: the Tortle's shell is AC 17 and Dexterity never applies.
         It is not conditional on going unarmoured either - the shell says you gain no
         benefit from armour, so the number stands however the character is equipped. */
      var fm=/(?:base\s+)?(?:armor class|\bac\b)\s*(?:of|is|equals)\s*(\d+)/i.exec(txt);
      if(fm&&/natural armor|shell|carapace/i.test(t.name+" "+txt)&&
         /modifier\s+doesn'?t\s+affect|doesn'?t\s+affect\s+this\s+number/i.test(txt)){
        var k2=t.name+"|flat|"+fm[1];
        if(!seen[k2]){
          seen[k2]=1;
          out.push({label:t.name,base:parseInt(fm[1],10),mods:[],flat:true,
                    noShield:/no benefit from.*shield/i.test(txt)});
        }
      }
    });
    return out;
  }
  // Returns {total, label, parts:[[name,value],...]} using the best applicable formula.
  function acInfo(){
    var body=null,shield=null;
    state.equipment.inventory.forEach(function(i){
      if(!i.equipped)return;
      var a=resolveArmor(i);if(!a)return;
      if(a.armorKind==="shield"){if(!shield)shield=a;}else if(!body)body=a;
    });
    var formulas=acFormulas().map(function(f){
      return {label:f.label,base:f.base,flat:f.flat,noShield:f.noShield,
        modifiers:f.mods.map(function(a){return {label:ABIL_ABBR[a]||a,value:abMod(totalScore(a))};})};
    });
    var fx=fxTotals(),items=itemBonuses();
    return rulesEngine.calculateAC({dexModifier:abMod(totalScore("Dexterity")),armor:body,shield:shield,
      alternativeFormulas:formulas,defenseStyle:hasStyle("Defense"),
      bonuses:[{label:fx.sources.ac.join(" + "),value:fx.ac},{label:items.sources.ac.join(" + "),value:items.ac}],
      other:state.sheet.acOther,manualOverride:state.sheet.acOverride});
  }
  function computeAC(){return acInfo().total;}
  function acBreakdown(){
    var i=acInfo();
    var s=i.parts.map(function(p){return p[0]+" "+(p[1]>=0&&p[0]!==i.label?"+":"")+p[1];}).join("  ")+"  =  "+i.total;
    if(i.overridden)s+="   (calculated value would be "+i.computed+")";
    return s+"   — click to customise";
  }

  function renderEquipment(){return creatorUI.renderEquipment.apply(null,arguments);}

  function renderStarting(){return creatorUI.renderStarting.apply(null,arguments);}

  var ITEM_TYPES=["Armor","Weapon","Potion","Ring","Rod","Scroll","Staff","Wand","Wondrous","Other Gear"];
  function renderItemBrowser(){return creatorUI.renderItemBrowser.apply(null,arguments);}
  function rarBadge(){return creatorUI.rarBadge.apply(null,arguments);}
  function renderItemResults(){return creatorUI.renderItemResults.apply(null,arguments);}

  function renderCurrency(){return creatorUI.renderCurrency.apply(null,arguments);}

  function renderInventory(){return creatorUI.renderInventory.apply(null,arguments);}

  /* ---------- spells ---------- */
  // the Ioun Stone of Mastery and its kind raise this, and everything built on it follows
  function profBonus(){
    if(CCRules&&CCRules.profBonus)return CCRules.profBonus(state.level,itemBonuses().prof);
    return Math.floor((state.level-1)/4)+2+itemBonuses().prof;
  }
  /* The ability a class uses for its save DCs. Spellcasters use their spellcasting
     ability; martial classes key their DC-bearing features off a set ability — the Monk's
     ki DC is Wisdom, and the MPMB sheet uses Constitution for Barbarian, Dexterity for
     Rogue, Strength for Fighter. */
  var DC_ABILITY_MARTIAL={Barbarian:"Constitution",Monk:"Wisdom",Rogue:"Dexterity",Fighter:"Strength"};
  // A save DC stated in a feature ("8 + your proficiency bonus + your Constitution modifier")
  // is authoritative — the Rune Knight's runes and Leonin's Daunting Roar use Constitution,
  // a Monk's ki uses Wisdom. "X or Y modifier" (Battle Master) resolves to the better one.
  function featureDcAbility(){
    var found=null,AB="Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma";
    var re=new RegExp("8\\s*\\+\\s*your proficiency bonus\\s*\\+\\s*your ("+AB+")(?:\\s+or\\s+("+AB+"))? modifier","i");
    featuresAndTraits().forEach(function(f){
      if(found)return;
      var m=re.exec(plainTags(entryText(f.entries||"")));
      if(!m)return;
      found=(m[2]&&abMod(totalScore(m[2]))>abMod(totalScore(m[1])))?m[2]:m[1];
      found=found.charAt(0).toUpperCase()+found.slice(1).toLowerCase();
    });
    return found;
  }
  function dcAbility(){
    var info=spellInfo();
    if(info&&info.ability)return info.ability;        // casters: spellcasting ability
    return featureDcAbility()||DC_ABILITY_MARTIAL[state.className]||"";  // else a feature's stated DC, else the class default
  }
  function abilitySaveDc(){
    var ab=dcAbility();
    return ab?rulesEngine.spellModifiers({proficiencyBonus:profBonus(),
      abilityModifier:abMod(totalScore(ab)),saveBonus:itemBonuses().spellDc}).saveDC:null;
  }
  function maxSpellLevel(caster,L){
    if(CCRules&&CCRules.maxSpellLevel)return CCRules.maxSpellLevel(caster,L);
    switch(caster){
    case "full":return Math.min(9,Math.ceil(L/2));
    case "pact":return Math.min(5,Math.ceil(L/2));
    case "1/2":return L<2?0:Math.min(5,Math.ceil(L/4));
    case "artificer":return Math.min(5,Math.ceil(L/4));
    default:return Math.min(9,Math.ceil(L/2));
    }
  }
  /* The Spellcaster Sidekick has no spellcasting ability of its own: you choose a role,
     and that decides both the ability and which class lists it draws spells from. Without
     the choice the class has no ability at all, which is why it needs asking for. */
  var SIDEKICK_ROLES=[
    {name:"Mage",ability:"Intelligence",lists:["Wizard"]},
    {name:"Healer",ability:"Wisdom",lists:["Cleric","Druid"]},
    {name:"Prodigy",ability:"Charisma",lists:["Bard","Warlock"]}
  ];
  function sidekickRole(){
    if(state.slug!=="spellcaster-sidekick-classic")return null;
    var picked=state.choices["sidekickRole"];
    for(var i=0;i<SIDEKICK_ROLES.length;i++)if(SIDEKICK_ROLES[i].name===picked)return SIDEKICK_ROLES[i];
    return null;
  }
  function sidekickRoleHtml(f){
    if(state.slug!=="spellcaster-sidekick-classic"||f.name!=="Spellcasting")return {html:"",count:0,pending:false};
    var cur=state.choices["sidekickRole"]||"";
    var html='<div class="origin-picker"><label>Role — this sets the spellcasting ability and the spell list</label>'+
      '<select class="sk-role"><option value="">— Choose a role —</option>'+
      SIDEKICK_ROLES.map(function(r){
        return '<option value="'+esc(r.name)+'"'+(cur===r.name?" selected":"")+">"+
          esc(r.name+" — "+r.lists.join(" and ")+" spells, "+r.ability)+"</option>";
      }).join("")+"</select></div>";
    return {html:html,count:1,pending:!cur};
  }
  function spellInfo(){
    var sc=state.slug&&window.CC_SPELLCAST?window.CC_SPELLCAST[state.slug]:null;
    if(!sc)return null;
    var role=sidekickRole();
    if(role){                                  // the role supplies what the class does not
      var copy={};for(var k in sc)copy[k]=sc[k];
      copy.ability=role.ability;sc=copy;
    }else if(!sc.ability)return null;           // nothing to work out until a role is picked
    var L=state.level,cantripsKnown=(sc.cantrips&&sc.cantrips[L-1])||0,maxLevel=maxSpellLevel(sc.caster,L),prepared=!sc.known,spellsCount;
    if(sc.known)spellsCount=sc.known[L-1]||0;
    else{var mod=abMod(totalScore(sc.ability));spellsCount=Math.max(1,mod+(sc.caster==="full"?L:Math.floor(L/2)));}
    return {sc:sc,ability:sc.ability,cantripsKnown:cantripsKnown,spellsCount:spellsCount,maxLevel:maxLevel,prepared:prepared};
  }
  /* A feat can widen the list you choose from rather than hand you a spell: Mark of
     Storm adds levitate and sleet storm to a wizard's options once the slots to cast
     them exist. The keys are the spell level each group unlocks at, which is the level
     of the spells in it, so the picker's own level limit already gates them correctly.
     Spells granted outright at a later class level are collected here too. */
  /* Names arrive title-cased from the generator, which turns "gust of wind" into
     "Gust Of Wind". The spell list is the authority on how a spell is written, so the
     canonical name is used wherever one is found. */
  function properSpellName(n){
    var s=spellByName(String(n));
    return (s&&s.name)?s.name:n;
  }
  function featSpellExtras(){
    var names={},later=[];
    allChosenFeats().forEach(function(rec){
      var sb=featSpellBlock(rec.ft,rec.base,rec.store);
      if(!sb)return;
      var exp=sb.expanded||{};
      for(var lvl in exp)(exp[lvl]||[]).forEach(function(n){names[String(n).toLowerCase()]=1;});
      (sb.later||[]).forEach(function(g){
        if(g.level>state.level)return;              // not reached yet
        later.push({from:rec.ft.name,names:g.names||[],rate:g.rate||"",kind:g.kind||""});
      });
    });
    return {expanded:names,later:later};
  }
  function classSpellList(minL,maxL){
    var ed=state.edition,role=sidekickRole();
    // a sidekick draws on the class lists its role names, having none of its own
    var names=role?role.lists:[state.className];
    var extra=featSpellExtras().expanded;
    return (window.CC_SPELLS||[]).filter(function(s){
      if(s.level<minL||s.level>maxL)return false;
      // a feat may have added this spell to your list even though the class has not
      if(extra[String(s.name).toLowerCase()])return true;
      if(!s.cls[ed])return false;
      for(var i=0;i<names.length;i++)if(s.cls[ed].indexOf(names[i])>=0)return true;
      return false;
    });
  }
  function spKey(s){return s.name+"|"+s.source;}
  function pruneSpells(){
    var info=spellInfo();
    if(!info){state.spells.cantrips=[];state.spells.spells=[];return;}
    var vc={};classSpellList(0,0).forEach(function(s){vc[spKey(s)]=1;});
    var vs={};classSpellList(1,info.maxLevel).forEach(function(s){vs[spKey(s)]=1;});
    state.spells.cantrips=state.spells.cantrips.filter(function(k){return vc[k];}).slice(0,info.cantripsKnown);
    state.spells.spells=state.spells.spells.filter(function(k){return vs[k];}).slice(0,info.spellsCount);
  }
  var _spellIndex=null;
  function spellByKey(k){if(!_spellIndex){_spellIndex={};(window.CC_SPELLS||[]).forEach(function(s){_spellIndex[spKey(s)]=s;});}return _spellIndex[k];}
  function spRowHtml(){return creatorUI.spRowHtml.apply(null,arguments);}
  function spellDetailHtml(){return creatorUI.spellDetailHtml.apply(null,arguments);}
  function showSpellDetail(){return creatorUI.showSpellDetail.apply(null,arguments);}
  function wireSpellRows(){return creatorUI.wireSpellRows.apply(null,arguments);}
  function renderSpells(){return creatorUI.renderSpells.apply(null,arguments);}
  function wireSpellChk(){return creatorUI.wireSpellChk.apply(null,arguments);}
  function renderSpellResults(){return creatorUI.renderSpellResults.apply(null,arguments);}

  /* ---------- character sheet ---------- */
  var SKILL_ABILITY={Acrobatics:"Dexterity","Animal Handling":"Wisdom",Arcana:"Intelligence",Athletics:"Strength",Deception:"Charisma",History:"Intelligence",Insight:"Wisdom",Intimidation:"Charisma",Investigation:"Intelligence",Medicine:"Wisdom",Nature:"Intelligence",Perception:"Wisdom",Performance:"Charisma",Persuasion:"Charisma",Religion:"Intelligence","Sleight of Hand":"Dexterity",Stealth:"Dexterity",Survival:"Wisdom"};
  function maxHP(){
    if(CCRules&&CCRules.maxHP)return CCRules.maxHP(state.hdFaces,state.level,abMod(totalScore("Constitution")),state.manualHp);
    if(state.manualHp!=null)return state.manualHp;
    var faces=state.hdFaces;if(!faces)return null;
    var con=abMod(totalScore("Constitution")),avg=Math.floor(faces/2)+1;
    return faces+con+(state.level-1)*(avg+con);
  }
  /* ---------- grants stated in feature/trait text ----------
     5etools does not store a feature's proficiency/language grants as data — it marks them
     inline with {@item ...}, {@language ...}, {@skill ...} tags (and plain words for weapon/
     armour categories). Reading those tags, rather than guessing from prose, lets every
     class and species pick up what its features grant without a per-case fix: the Rune
     Knight's smith's tools and Giant, a subclass's martial-weapon training, and so on. */
  function featureGrants(){
    var out={languages:[],tools:[],weapons:[],armor:[],skills:[]};
    var tools={},po=window.CC_PROF_OPTS||{},g;
    for(g in (po.tools||{}))(po.tools[g]||[]).forEach(function(t){tools[t.toLowerCase()]=t;});
    function add(a,v){if(v&&a.indexOf(v)<0)a.push(v);}
    function capWords(s){return String(s).replace(/\b\w/g,function(c){return c.toUpperCase();});}
    featuresAndTraits().forEach(function(f){
      var raw=entryText(f.entries||""),low=plainTags(raw).toLowerCase(),m;
      // languages: a {@language X} tag inside a speak/read/write/learn/know clause
      var lre=/\{@language\s+([^}|]+)/gi;
      while((m=lre.exec(raw))){
        var near=raw.substr(Math.max(0,m.index-70),170).toLowerCase();
        if(/speak|read|write|\blearn|you know/.test(near))add(out.languages,capWords(m[1].trim()));
      }
      // tools: a {@item X} that is a known tool, granted outright — "proficien" appears just
      // before it, and it is not an example ("such as") or a choice ("of your choice")
      var ire=/\{@item\s+([^}|]+)/gi;
      while((m=ire.exec(raw))){
        var key=m[1].trim().toLowerCase();
        if(!tools[key])continue;
        var ctx=raw.substr(Math.max(0,m.index-90),130).toLowerCase();
        // needs the actual grant phrase "proficiency with/in" (not "Proficiency Bonus"), and
        // must not be an example or a "of your choice" pick
        if(/proficien\w*\s+(?:with|in)\b/.test(ctx)&&ctx.indexOf("such as")<0&&ctx.indexOf("of your choice")<0&&ctx.indexOf("for example")<0)add(out.tools,tools[key]);
      }
      // weapon / armour categories, stated in plain words
      if(/proficiency with (?:all )?martial weapons/.test(low))add(out.weapons,"Martial weapons");
      if(/proficiency with (?:all )?simple weapons/.test(low))add(out.weapons,"Simple weapons");
      [["heavy armor","Heavy armor"],["medium armor","Medium armor"],["light armor","Light armor"],["shields","Shields"]].forEach(function(pr){
        if(new RegExp("(?:proficiency with|training with|proficiency in) (?:all )?"+pr[0]).test(low))add(out.armor,pr[1]);
      });
      // a skill granted outright (not "one of the following of your choice", which is a picker)
      if(low.indexOf("of your choice")<0){
        var sre=/proficiency in[^.]*?\{@skill\s+([^}|]+)/gi;
        while((m=sre.exec(raw)))add(out.skills,m[1].trim());
      }
    });
    return out;
  }
  // append feature-granted proficiencies to a class's stated list (skipping ones already there)
  function withFeatureProfs(base,extra){
    var shown=plainTags(base||"").toLowerCase(),b=(base&&shown!=="none"&&shown!=="")?base:"";
    var keep=(extra||[]).filter(function(x){return shown.indexOf(x.toLowerCase())<0;});
    if(!keep.length)return base;
    return (b?b+", ":"")+keep.join(", ");
  }
  function proficientSkills(){
    var set={},fd=derivedState.fdata;function add(s){if(s)set[s]=1;}
    if(fd&&fd.proficiencies&&fd.proficiencies.skills)for(var i=0;i<fd.proficiencies.skills.count;i++)add(state.choices["skill:"+i]);
    var bg=currentBg();
    if(bg&&bg.skills){(bg.skills.fixed||[]).forEach(add);
      if(bg.skills.choose)for(var i=0;i<bg.skills.choose.count;i++)add(state.bgChoices["skillChoose:"+i]);
      if(bg.skills.any)for(var i=0;i<bg.skills.any;i++)add(state.bgChoices["skillAny:"+i]);}
    featureSkillPicks().forEach(add);
    var race=currentRace();
    if(race&&race.skills){(race.skills.fixed||[]).forEach(add);
      if(race.skills.choose)for(var i=0;i<race.skills.choose.count;i++)add(state.raceChoices["race:skill:"+i]);
      if(race.skills.any)for(var i=0;i<race.skills.any;i++)add(state.raceChoices["race:skillany:"+i]);}
    featureGrants().skills.forEach(add);          // skills granted outright by a feature's text
    if(!_inFeatSlots)featGrantsAll().skills.forEach(add);   // and a skill a feat grants or lets you pick
    return set;
  }
  /* ---------- expertise ----------
     Rogue and Bard (and 2024 Ranger, Expert sidekick) double their proficiency bonus on
     chosen skills. Each Expertise feature grants two picks, taken from skills you are
     already proficient in. */
  function expertiseFeatures(){
    var out=[],fd=derivedState.fdata;
    if(!fd)return out;
    (fd.classFeatures||[]).forEach(function(f){
      if(f.level<=state.level&&f.name==="Expertise"&&optEnabled(f))out.push(f);
    });
    return out;
  }
  var EXPERTISE_PICKS=2;
  function expertiseSkills(){
    var set={};
    featGrantsAll().expertise.forEach(function(s){if(s)set[s]=1;});   // e.g. Skill Expert
    expertiseFeatures().forEach(function(f){
      for(var i=0;i<EXPERTISE_PICKS;i++){
        var v=state.choices["expertise:"+f.level+":"+i];
        if(v)set[v]=1;
      }
    });
    return set;
  }
  /* ---------- defences ----------
     Damage resistances come from the species data; "advantage on saving throws against X"
     and sleep immunity live in feature text, so they are read from there. */
  var DAMAGE_TYPES=["Acid","Bludgeoning","Cold","Fire","Force","Lightning","Necrotic","Piercing","Poison","Psychic","Radiant","Slashing","Thunder"];
  var CONDITIONS=["Blinded","Charmed","Deafened","Exhaustion","Frightened","Grappled","Incapacitated","Invisible","Paralyzed","Petrified","Poisoned","Prone","Restrained","Stunned","Unconscious"];
  var DEF_KINDS={resist:"Resistance to",immune:"Immunity to",vulnerable:"Vulnerability to",condImmune:"Condition immunity"};
  // defences a player adds by hand (a DM-granted cold immunity, say), like the custom
  // proficiencies and languages; each is {kind:resist|immune|vulnerable|condImmune|custom, value}
  function customDefs(){return state.customDefences||[];}
  function defLabel(d){
    if(d.kind==="resist")return "Resist "+d.value;
    if(d.kind==="immune")return "Immune "+d.value;
    if(d.kind==="vulnerable")return "Vulnerable "+d.value;
    if(d.kind==="condImmune")return "Immune "+d.value+" (cond.)";
    return d.value;
  }
  /* A resistance/sense a feature states is CONDITIONAL if a governing sentence — this one or up
     to three before it — activates it: a rage, a stance, a form, an action, or a timed buff.
     e.g. the base Rage feature's "While raging, you gain the following benefits:" sits a few
     bullets above its damage-resistance line. A feature that explicitly grants the benefit even
     when not raging (Path of the Infernal's fire resistance) is treated as permanent. */
  var COND_GOV=/while raging|while your rage is active|while active|your rage follows the rules|while in (?:this|that) form|while (?:you are |you're )?transformed|while you(?:'re| are)? using it|for \d+ (?:minute|hour)|gain(?:ing)? the following benefits for|benefits for \d|as (?:a|an) (?:bonus )?action|use your (?:action|reaction)|until the (?:end|start)|during that (?:time|turn)/i;
  var COND_NEG=/even while (?:you(?:'re| are)? )?not raging|even when not raging|while you(?:'re| are)? not raging/i;
  function condGovernor(sents,j,extra){
    for(var k=j;k>=0&&k>=j-3;k--){
      var s=sents[k];
      if(COND_NEG.test(s))return false;            // explicitly applies even when not raging
      if(COND_GOV.test(s)||(extra&&extra.test(s)))return true;
    }
    return false;
  }
  /* permanent damage resistances/immunities stated in a feature's text — Radiant Soul, Necrotic
     Husk, Inured to Undeath, Guarded Mind, Saint of Forge and Fire, Storm Soul, etc. A grant is
     taken only when every listed word is a real damage type (so "all" / "the <type> associated
     with..." are ignored) and no governing sentence makes it conditional. A trailing qualifier
     ("from nonmagical attacks") is kept so the limit stays visible. */
  function featureDamageDefences(){
    var out={resist:[],immune:[]},TYPES={};
    DAMAGE_TYPES.forEach(function(t){TYPES[t.toLowerCase()]=t;});
    function parseList(str){
      var parts=str.toLowerCase().replace(/\band\b/g,",").split(","),got=[],ok=true;
      parts.forEach(function(p){p=p.replace(/[^a-z]/g,"");if(!p)return;if(TYPES[p])got.push(TYPES[p]);else ok=false;});
      return (ok&&got.length)?got:null;
    }
    featuresAndTraits().forEach(function(f){
      var txt=plainTags(entryText(f.entries||"")),sents=txt.split(/\.\s+/),j;
      for(j=0;j<sents.length;j++){
        if(condGovernor(sents,j))continue;
        var s=sents[j];
        [["resist",/you (?:have|gain) resistance to ([a-z, ]+?) damage(?:\s+(from [a-z ]+?))?(?=[.,;]|$)/gi],
         ["immune",/you (?:have|gain|are) (?:immune|immunity) to ([a-z, ]+?) damage(?:\s+(from [a-z ]+?))?(?=[.,;]|$)/gi]
        ].forEach(function(pr){
          var re=pr[1],m;re.lastIndex=0;
          while((m=re.exec(s))){
            var types=parseList(m[1]);if(!types)continue;
            var qual=m[2]?m[2].replace(/\s+/g," ").trim():"";
            if(qual)out[pr[0]].push(types.join(", ")+" ("+qual+")");
            else types.forEach(function(t){out[pr[0]].push(t);});
          }
        });
      }
    });
    return out;
  }
  /* darkvision a feature grants as a permanent sense — Umbral Sight, Eyes of the Dark, Eyes of
     Night, Shadow monk Darkvision. Skips spell-list mentions ("cast darkness, darkvision"),
     action/toggle grants (The Third Eye), form grants (Improved Dragon Shape), and "one of the
     following" choices (Aspect of the Wilds). {base, bonus, from} — bonus is the "if you already
     have darkvision, its range increases by N" amount. */
  function featureDarkvision(){
    var out=[],extra=/one of the following|choose|wild shape|dragon shape/i;
    featuresAndTraits().forEach(function(f){
      var txt=plainTags(entryText(f.entries||""));
      // darkvision that comes with a shapechange is a form benefit, not a standing sense
      if(/dragon shape|wild shape|while (?:you are |you're )?transformed|you transform into/i.test(txt))return;
      var sents=txt.split(/\.\s+/),j;
      for(j=0;j<sents.length;j++){
        var s=sents[j],m=/you (?:have|gain) darkvision[^.]*?(\d+)\s*f(?:ee|oo)?t/i.exec(s);
        if(!m||condGovernor(sents,j,extra))continue;
        var bctx=s+" "+(sents[j+1]||""),bm=/increases by (\d+)\s*f(?:ee|oo)?t/i.exec(bctx);
        out.push({base:parseInt(m[1],10),bonus:bm?parseInt(bm[1],10):0,from:f.name});
      }
    });
    return out;
  }
  /* the senses shown on the sheet: species/lineage senses, plus any darkvision a feature grants
     (merged into a single range — a feature that extends existing darkvision adds its bonus). */
  function sensesList(){
    var race=currentRace(),lin=race?currentLineage(race):null;
    var base=(lin&&lin.senses&&lin.senses.length)?lin.senses.slice():(race?(race.senses||[]).slice():[]);
    var dv=featureDarkvision();
    if(!dv.length)return base;
    var rdv=0,idx=-1,i;
    for(i=0;i<base.length;i++){var mm=/darkvision\D*(\d+)/i.exec(base[i]);if(mm){rdv=parseInt(mm[1],10);idx=i;}}
    var best=rdv,seen={},froms=[];
    dv.forEach(function(g){
      var cand=g.bonus?(rdv?rdv+g.bonus:g.base):g.base;
      if(cand>best)best=cand;
      if(!seen[g.from]){seen[g.from]=1;froms.push(g.from);}
    });
    if(best<=rdv&&idx>=0)return base;               // features add nothing beyond racial darkvision
    var label="Darkvision "+best+" ft. ("+froms.join(", ")+")";
    if(idx>=0)base[idx]=label; else base=base.concat([label]);
    return base;
  }
  function defences(){
    var race=currentRace(),lin=race?currentLineage(race):null;
    function u(a,b){var o=(a||[]).slice();(b||[]).forEach(function(x){if(o.indexOf(x)<0)o.push(x);});return o;}
    var out={resist:[],immune:[],vulnerable:[],condImmune:[],adv:[]};
    if(race){out.resist=u(out.resist,race.resist);out.immune=u(out.immune,race.immune);
             out.vulnerable=u(out.vulnerable,race.vulnerable);out.condImmune=u(out.condImmune,race.condImmune);}
    if(lin){out.resist=u(out.resist,lin.resist);out.immune=u(out.immune,lin.immune);
            out.vulnerable=u(out.vulnerable,lin.vulnerable);out.condImmune=u(out.condImmune,lin.condImmune);}
    var seen={};
    featuresAndTraits().forEach(function(f){
      var txt=entryText(f.entries||"");
      var re=/advantage on (?:all )?saving throws against ([^.;]{3,80})/gi,m;
      while((m=re.exec(txt))){
        var s=plainTags(m[1]);                     // resolve {@condition ...} etc.
        s=s.split(/,? and /)[0];                   // stop before a second, unrelated clause
        s=s.replace(/\s+/g," ").replace(/[,;]\s*$/,"").trim();
        if(s&&!seen[s.toLowerCase()]){seen[s.toLowerCase()]=1;out.adv.push({text:"Advantage on saves against "+s,from:f.name});}
      }
      if(/magic can'?t put you to sleep/i.test(txt)&&!seen.sleep){
        seen.sleep=1;out.adv.push({text:"Magic can't put you to sleep",from:f.name});
      }
      if(/immune to (?:the )?([a-z ]{3,30}) condition/i.test(txt)){
        var c=/immune to (?:the )?([a-z ]{3,30}) condition/i.exec(txt)[1].trim();
        if(!seen["c"+c]){seen["c"+c]=1;out.condImmune.push(capital(c));}
      }
    });
    var fdd=featureDamageDefences();               // permanent resist/immune from feature text
    out.resist=u(out.resist,fdd.resist);
    out.immune=u(out.immune,fdd.immune);
    var ft=fxTotals();
    out.fx=[];
    if(ft.resist.length)out.fx.push({text:"Resistance to "+ft.resist.join(", ")+" damage",from:ft.sources.resist.join(", ")});
    ft.advAbility.forEach(function(a){
      out.fx.push({text:"Advantage on "+a+" checks and saving throws",from:ft.sources.adv.join(", ")});
    });
    fxActive().forEach(function(e){
      if(e.blocked)out.fx.push({text:e.name+" grants nothing while you wear heavy armour",from:e.name,off:true});
    });
    return out;
  }
  // granted defences merged with the hand-added ones, as printable lines (for the PDF)
  function defencesSummaryLines(){
    var d=defences(),cd=customDefs(),out=[];
    function extra(kind){return cd.filter(function(x){return x.kind===kind;}).map(function(x){return x.value;});}
    function u(a,b){var o=(a||[]).slice();b.forEach(function(x){if(o.indexOf(x)<0)o.push(x);});return o;}
    var r=u(d.resist,extra("resist")),im=u(d.immune,extra("immune")),vu=u(d.vulnerable,extra("vulnerable")),ci=u(d.condImmune,extra("condImmune"));
    if(r.length)out.push("Resistances: "+r.join(", "));
    if(im.length)out.push("Immunities: "+im.join(", "));
    if(vu.length)out.push("Vulnerabilities: "+vu.join(", "));
    if(ci.length)out.push("Condition Immunities: "+ci.join(", "));
    cd.forEach(function(x){if(x.kind==="custom")out.push(x.value);});
    return out;
  }
  function defencesHtml(){
    var d=defences(),h="";
    function line(l,v){return v.length?'<p class="prof-line"><b>'+l+':</b> '+esc(v.join(", "))+"</p>":"";}
    h+=line("Damage Resistances",d.resist);
    h+=line("Damage Immunities",d.immune);
    h+=line("Damage Vulnerabilities",d.vulnerable);
    h+=line("Condition Immunities",d.condImmune);
    d.adv.forEach(function(a){
      h+='<p class="prof-line def-adv" title="'+esc(a.from)+'"><span class="def-mark">●</span> '+esc(a.text)+"</p>";
    });
    (d.fx||[]).forEach(function(a){       // only while the effect is switched on
      h+='<p class="prof-line def-fx'+(a.off?" def-fx-off":"")+'" title="'+esc(a.from)+'"><span class="def-mark">●</span> '+esc(a.text)+
         (a.off?"":' <span class="fx-while">'+esc(a.from)+"</span>")+"</p>";
    });
    var granted=d.resist.length||d.immune.length||d.vulnerable.length||d.condImmune.length||d.adv.length||(d.fx&&d.fx.length);
    if(!granted&&!customDefs().length)h+='<p class="prof-line tag-note">None from your class or species — add any you gain below.</p>';
    // the editor: removable chips for hand-added defences, plus a picker and a custom field
    var chips=customDefs().map(function(x,i){return '<span class="lang-chip">'+esc(defLabel(x))+' <span class="def-x" data-i="'+i+'">&times;</span></span>';}).join("");
    var have={};customDefs().forEach(function(x){have[x.kind+"|"+String(x.value).toLowerCase()]=1;});
    var opts='<option value="">— Add a defence —</option>';
    ["resist","immune","vulnerable"].forEach(function(kind){
      var items=DAMAGE_TYPES.filter(function(v){return !have[kind+"|"+v.toLowerCase()];});
      if(items.length)opts+='<optgroup label="'+esc(DEF_KINDS[kind])+'">'+items.map(function(v){return '<option value="'+kind+"|"+esc(v)+'">'+esc(v)+"</option>";}).join("")+"</optgroup>";
    });
    var conds=CONDITIONS.filter(function(v){return !have["condImmune|"+v.toLowerCase()];});
    if(conds.length)opts+='<optgroup label="Condition immunity">'+conds.map(function(v){return '<option value="condImmune|'+esc(v)+'">'+esc(v)+"</option>";}).join("")+"</optgroup>";
    h+='<div class="lang-edit">'+chips+
       '<select id="defPick">'+opts+"</select>"+
       '<div class="lang-add"><input type="text" id="custDef" placeholder="…or type a custom one"><button class="btn" id="addDef">Add</button></div>'+
       "</div>";
    return h;
  }
  /* ---------- advantage / disadvantage on skills ----------
     A stealth penalty from worn armour is unconditional; feature-based advantage is
     usually situational, so it is flagged and the tooltip names the feature. */
  function skillAdvantage(){
    var out={};
    function note(sk,kind,from,cond){
      if(!out[sk])out[sk]={adv:[],dis:[]};
      var txt=from+(cond?" (situational)":"");
      if(out[sk][kind].indexOf(txt)<0)out[sk][kind].push(txt);
    }
    state.equipment.inventory.forEach(function(i){
      if(!i.equipped)return;
      var a=resolveArmor(i);if(!a)return;
      var info=itemInfo(i.name,i.source)||i;
      if(info.stealthDis)note("Stealth","dis",(info.name||i.name),false);
    });
    var ftot=fxTotals();
    ftot.advAbility.forEach(function(ab){              // e.g. Strength checks while raging
      var src=ftot.sources.adv.join(", ");
      for(var s in SKILL_ABILITY)if(SKILL_ABILITY[s]===ab)note(s,"adv",src,false);
    });
    featuresAndTraits().forEach(function(f){
      var txt=plainTags(entryText(f.entries||""));
      var re=/(advantage|disadvantage) on ([^.]{0,90})/gi,m;
      while((m=re.exec(txt))){
        var kind=m[1].toLowerCase()==="advantage"?"adv":"dis",seg=m[2];
        if(/saving throw/i.test(seg))continue;                    // shown in Defences instead
        for(var s in SKILL_ABILITY){
          if(seg.toLowerCase().indexOf(s.toLowerCase())>=0)note(s,kind,f.name,true);
        }
      }
    });
    return out;
  }
  function skillBonus(sk){
    var ps=proficientSkills(),ex=expertiseSkills(),p=0;
    if(ps[sk])p=(ex[sk]?profBonus()*2:profBonus());
    // a Stone of Good Luck applies to every ability check, so to every skill
    var base=abMod(totalScore(SKILL_ABILITY[sk]))+p+itemBonuses().abilCheck;
    if(CCRules&&CCRules.skillBonus){
      return CCRules.skillBonus(totalScore(SKILL_ABILITY[sk]), profBonus(), !!ps[sk], !!ex[sk], itemBonuses().abilCheck);
    }
    return base;
  }
  function passiveScore(sk){
    if(CCRules&&CCRules.passiveScore){
      var ps=proficientSkills(),ex=expertiseSkills();
      return CCRules.passiveScore(totalScore(SKILL_ABILITY[sk]), profBonus(), !!ps[sk], !!ex[sk], itemBonuses().abilCheck);
    }
    return 10+skillBonus(sk);
  }
  function expertiseHtml(f){
    var ps=proficientSkills(),pool=[];
    for(var s in ps)pool.push(s);
    pool.sort();
    var picked=0,html='<div class="origin-picker"><label>Expertise — double proficiency on two skills</label>';
    if(!pool.length)return {html:'<div class="choice-desc tag-note">Choose your skill proficiencies first, then pick which two gain Expertise.</div>',count:0,pending:false};
    for(var i=0;i<EXPERTISE_PICKS;i++){
      var key="expertise:"+f.level+":"+i,cur=state.choices[key]||"";
      if(cur)picked++;
      var others=[];
      for(var j=0;j<EXPERTISE_PICKS;j++){if(j!==i){var v=state.choices["expertise:"+f.level+":"+j];if(v)others.push(v);}}
      html+='<select class="exp-sel" data-key="'+esc(key)+'"><option value="">— Choose a proficient skill —</option>'+
        pool.map(function(s){
          return '<option value="'+esc(s)+'"'+(others.indexOf(s)>=0?" disabled":"")+(cur===s?" selected":"")+">"+esc(s)+"</option>";
        }).join("")+"</select>";
    }
    return {html:html+"</div>",count:EXPERTISE_PICKS,pending:picked<EXPERTISE_PICKS};
  }
  // proficiency where you have it, plus a Cloak of Protection and the like
  function saveBonus(a){
    if(CCRules&&CCRules.saveBonus){
      return CCRules.saveBonus(totalScore(a), profBonus(), !!savingProfs()[a], itemBonuses().save);
    }
    return abMod(totalScore(a))+(savingProfs()[a]?profBonus():0)+itemBonuses().save;
  }
  function savingProfs(){
    var set={},fd=derivedState.fdata,st=fd&&fd.proficiencies&&fd.proficiencies.savingThrows;
    if(st&&st!=="None")st.split(",").forEach(function(s){set[s.trim()]=1;});
    return set;
  }
  function languagesAll(){
    var out=[],seen={};function add(l){if(l&&!seen[l]){seen[l]=1;out.push(l);}}
    var race=currentRace(),rlin=race?currentLineage(race):null;
    if(race){
      var rl=mergedLanguages(race,rlin);
      (rl.fixed||[]).forEach(add);
      for(var i=0;i<(rl.anyStandard||0);i++)add(state.raceChoices["race:lang:"+i]);
      for(var i=0;i<(rl.any||0);i++)add(state.raceChoices["race:langany:"+i]);
    }
    var bg=currentBg();
    if(bg){(bg.langs.fixed||[]).forEach(add);
      for(var i=0;i<(bg.langs.anyStandard||0);i++)add(state.bgChoices["langStd:"+i]);
      for(var i=0;i<(bg.langs.any||0);i++)add(state.bgChoices["langAny:"+i]);
      if(bg.langs.choose)for(var i=0;i<bg.langs.choose.count;i++)add(state.bgChoices["langChoose:"+i]);}
    featureGrants().languages.forEach(add);       // languages a feature grants (e.g. Rune Knight → Giant)
    featureLangPicks().forEach(add);              // a language chosen from a feature's "of your choice"
    featGrantsAll().langs.forEach(add);           // a language a feat grants
    (state.customLanguages||[]).forEach(add);
    return out;
  }
  function shCard(title,body){return window.CCUIComponents.card(title,body);}
  function acStatHtml(){return sheetUI.acStatHtml.apply(null,arguments);}
  function topStat(v,l,why){return window.CCUIComponents.value(v,l,why);}
  // plain-language explanations for the derived header numbers
  function profWhy(){return "Proficiency bonus for level "+state.level+" = 2 + floor(("+state.level+" - 1) / 4) = +"+profBonus();}
  function initWhy(){
    var d=abMod(totalScore("Dexterity"));
    return "Initiative = Dexterity modifier ("+modStr(d)+"), from a Dexterity score of "+totalScore("Dexterity")+".";
  }
  /* ---------- walking speed ----------
     Base comes from the species (a lineage may override it, e.g. Wood Elf 35 ft.).
     Always-on class features then add to it, subject to their armour condition.
     Activated or temporary boosts (Blade Flourish, Dread Ambusher, Shifting, ...) are
     listed as situational notes instead of being added, so the number stays truthful. */
  var PASSIVE_SPEED={
    "Fast Movement":{bonus:10,notHeavy:true},            // Barbarian 5
    "Roving":{bonus:10,notHeavy:true},                   // Ranger 2024
    "Superior Mobility":{bonus:10},                      // Scout rogue
    "Unarmored Movement":{fromTable:true,noArmor:true,noShield:true}   // Monk, scales by level
  };
  function wornArmor(){
    var out={body:null,shield:false};
    state.equipment.inventory.forEach(function(i){
      if(!i.equipped)return;
      var a=resolveArmor(i);if(!a)return;
      if(a.armorKind==="shield")out.shield=true;else if(!out.body)out.body=a.armorKind;
    });
    return out;
  }
  function speedInfo(){
    var race=currentRace(),lin=race?currentLineage(race):null;
    var raw=(lin&&lin.speed)?lin.speed:(race?race.speed:"");
    var base=parseInt(raw,10)||30;
    var label=(lin&&lin.speed)?lin.name:(race?race.name:"Base");
    var parts=[[label,base]],total=base,notes=[],w=wornArmor(),seen={};
    var prog=(window.CC_SPEEDPROG&&window.CC_SPEEDPROG[state.slug])||null;
    state.equipment.inventory.forEach(function(i){          // armour you lack the Strength for
      if(!i.equipped)return;
      var a=resolveArmor(i);if(!a)return;
      var info=itemInfo(i.name,i.source)||i;
      if(info.strReq&&totalScore("Strength")<info.strReq){
        parts.push([(info.name||i.name)+" (needs Str "+info.strReq+")",-10]);total-=10;
      }
    });
    featuresAndTraits().forEach(function(f){
      var cfg=PASSIVE_SPEED[f.name];
      var txt=entryText(f.entries||"");
      if(!cfg){
        var m=/speed increases by (\d+) f/i.exec(txt);          // situational boost
        if(m&&!seen["n"+f.name]){
          seen["n"+f.name]=1;
          if(fxIsOn(f.name)&&fxQualifies(f))parts.push([f.name+" (active)",parseInt(m[1],10)]);   // switched on, so it counts
          else notes.push(f.name+" +"+m[1]+" ft. (situational)");
        }
        return;
      }
      if(seen[f.name])return;seen[f.name]=1;
      var amount=cfg.bonus;
      if(cfg.fromTable)amount=prog?(prog.values[state.level-1]||0):0;
      if(!amount)return;
      if(cfg.noArmor&&w.body){notes.push(f.name+" +"+amount+" ft. (needs no armour)");return;}
      if(cfg.noShield&&w.shield){notes.push(f.name+" +"+amount+" ft. (no shield allowed)");return;}
      if(cfg.notHeavy&&w.body==="heavy"){notes.push(f.name+" +"+amount+" ft. (not in heavy armour)");return;}
      parts.push([f.name,amount]);total+=amount;
    });
    total=0;parts.forEach(function(pp){total+=pp[1];});     // recount, active effects may have added
    /* Worn gear can set, add to, double or mirror a speed. Boots of Striding and Springing
       fix the walk at 30, Boots of Speed double it, and Winged Boots give a fly speed equal
       to the walk - that last one is another way to move, not more of this one, so it is
       reported alongside rather than added in. */
    var extras=[];
    itemBonuses().speed.forEach(function(s){
      if(s.kind!=="walk"){
        if(s.op==="equal")extras.push(capWord(s.kind)+" "+total+" ft. ("+s.from+")");
        else if(s.op==="static")extras.push(capWord(s.kind)+" "+s.val+" ft. ("+s.from+")");
        else if(s.op==="bonus")extras.push(capWord(s.kind)+" "+(total+s.val)+" ft. ("+s.from+")");
        return;
      }
      if(s.op==="static"){parts.push([s.from+" (sets speed to "+s.val+")",s.val-total]);total=s.val;}
      else if(s.op==="bonus"){parts.push([s.from,s.val]);total+=s.val;}
      else if(s.op==="multiply"){var was=total;total=Math.floor(total*s.val);parts.push([s.from+" (x"+s.val+")",total-was]);}
    });
    return {total:total,parts:parts,notes:notes,extras:extras,
            extra:[String(raw).replace(/^\s*\d+\s*ft\.?,?\s*/,"")].concat(extras).filter(Boolean).join(", ")};
  }
  function speedText(){var s=speedInfo();return s.total+" ft."+(s.extra?", "+s.extra:"");}
  function speedWhy(){
    var s=speedInfo();
    if(!currentRace())return "Walking speed 30 ft. (default). Choose a species to set this.";
    var str=s.parts.map(function(p){return p[0]+" "+p[1];}).join("  +  ")+"  =  "+s.total+" ft.";
    if(s.notes.length)str+="\nNot counted: "+s.notes.join("; ");
    return str;
  }

  // the leading name of an origin string ("Inquisitive — subclass feature…" -> "Inquisitive")
  function originShort(o){return o?String(o).split(/\s+[—-]\s+| \(/)[0].trim():"";}
  // showOrigin: render each entry's source as a small inline tag, so on the action economy
  // it is obvious at a glance which abilities come from a subclass or species
  function sheetCollapse(){return sheetUI.sheetCollapse.apply(null,arguments);}
  function spellItems(keys){
    var out=[];(keys||[]).forEach(function(k){var s=spellByKey(k);if(!s)return;
      var hdr=["{@b Casting Time:} "+(s.time||"—")+"  ·  {@b Range:} "+(s.range||"—"),
               "{@b Components:} "+(s.compFull||"—")+"  ·  {@b Duration:} "+(s.duration||"—")];
      var body=hdr.concat(s.entries||[]);
      if(s.higher&&s.higher.length)body=body.concat([{type:"entries",name:"At Higher Levels",entries:s.higher}]);
      var lvl=s.level===0?"Cantrip":ordinal(s.level)+" level";
      out.push({name:s.name+" — "+lvl+" "+s.school+(s.conc?" · Conc.":"")+(s.ritual?" · Ritual":""),entries:body});
    });return out;
  }

  function attunedCount(){return state.equipment.inventory.filter(function(i){return i.attuned&&itemAttune(i);}).length;}
  function longRest(){
    state.sheet.hpCurrent=maxHP();state.sheet.hpEdited=false;state.sheet.hpTemp="";
    state.sheet.deathSucc=0;state.sheet.deathFail=0;
    var res=state.sheet.res,hdTotal=state.level,usedHd=0,i;
    for(i=0;i<hdTotal;i++)if(res["hd:"+i])usedHd++;
    var regain=Math.max(1,Math.floor(hdTotal/2)),keepUsed=Math.max(0,usedHd-regain);
    var nr={};for(i=0;i<keepUsed;i++)nr["hd:"+i]=true;   // clear all slots/resources; regain half the spent hit dice
    state.sheet.res=nr;
    state.sheet.active={};state.sheet.conc="";           // nothing survives a long rest
    render();
  }
  function shortRest(){
    var info=spellInfo(),res=state.sheet.res,k,i;
    // Warlock Pact Magic slots recharge on a short rest
    if(info&&info.sc.slots&&info.sc.slots.type==="pact"){for(k in res)if(k.indexOf("slot:")===0)delete res[k];}
    // class resources that recharge on a short (or long) rest
    var sr=["Ki Points","Focus Points","Channel Divinity","Wild Shape"];
    if(state.level>=5)sr.push("Bardic Inspiration");   // Bard: Font of Inspiration (level 5+)
    for(k in res){for(i=0;i<sr.length;i++){if(k.indexOf(sr[i]+":")===0){delete res[k];break;}}}
    state.sheet.active={};state.sheet.conc="";           // an hour's rest ends any effect too
    render();
  }
  // summarise the player's actual choices for a feature (for the sheet's Features list)
  function choiceSummary(f){
    var fd=derivedState.fdata,name=f.name,L=f.level,i;
    if(name==="Ability Score Improvement"){
      var mode=state.choices["asi:"+L+":mode"];
      if(mode==="feat"){
        var ftn=state.choices["asi:"+L+":feat"];
        if(!ftn)return "Feat (not chosen yet)";
        var picks=featAsiPicks(L),extra=picks.map(function(p){return p.ability+" +"+p.amount;});
        return "Feat — "+ftn+(extra.length?" ("+extra.join(", ")+")":(featAsiPending(L)?" (ability increase not chosen)":""));
      }
      if(mode==="asi"){var dist=state.choices["asi:"+L+":dist"]||"2",n=dist==="11"?2:1,amt=dist==="11"?1:2,parts=[];for(i=0;i<n;i++){var a=state.choices["asi:"+L+":a"+i];if(a)parts.push(a+" +"+amt);}return parts.length?parts.join(", "):"Ability increase (not chosen yet)";}
      return "Not chosen yet";
    }
    if(fd&&fd.optionLists&&fd.optionLists[name]){var picks=[];for(i=0;i<20;i++){var v=state.choices[name+":"+i];if(v)picks.push(v);}if(picks.length)return picks.join(", ");}
    var tbl=state.choices["tbl:"+name+":0"];if(tbl)return tbl;
    return "";
  }
  function featEntriesWithChoice(f){
    var fd=derivedState.fdata,cs=choiceSummary(f),i;
    var isGroup=fd&&fd.optionLists&&fd.optionLists[f.name]&&f.name!=="Ability Score Improvement";
    var base=isGroup?stripOptions(f.entries):(f.entries||[]);
    var extra=[];
    if(isGroup){var pool=fd.optionLists[f.name];for(i=0;i<20;i++){var v=state.choices[f.name+":"+i];if(v){var o=pool.filter(function(x){return x.name===v;})[0];if(o&&o.entries&&o.entries.length)extra.push({type:"entries",name:o.name,entries:o.entries});}}}
    if(f.name==="Ability Score Improvement"&&state.choices["asi:"+f.level+":mode"]==="feat"){var ftn=state.choices["asi:"+f.level+":feat"];if(ftn){var ft=(window.CC_FEATS||[]).filter(function(x){return x.name===ftn;})[0];if(ft&&ft.entries&&ft.entries.length)extra.push({type:"entries",name:ftn,entries:ft.entries});}}
    var head=cs?["{@b Your selection:} "+cs]:[];
    return head.concat(base).concat(extra);
  }
  var _spellByName=null;
  function spellByName(n){if(!_spellByName){_spellByName={};(window.CC_SPELLS||[]).forEach(function(s){var k=s.name.toLowerCase();if(!_spellByName[k])_spellByName[k]=s;});}return n?(_spellByName[String(n).toLowerCase()]||null):null;}
  function entryText(e){
    if(typeof e==="string")return e+" ";
    if(!e)return "";
    if(e instanceof Array){var s="",i;for(i=0;i<e.length;i++)s+=entryText(e[i]);return s;}
    if(typeof e==="object"){var s="",k;for(k in e){if(k==="type"||k==="name"||k==="source")continue;s+=entryText(e[k]);}return s;}
    return "";
  }
  /* Readable plain text for an entry tree - used by the PDF/PowerPoint export.
     entryText() above concatenates every value it finds, which is right for classifying
     a feature but leaks layout keys ("list-hang-notitle") into anything shown to a
     reader. This walks the structure properly instead, and resolves {@tags}. */
  function unesc(s){
    return String(s).replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&mdash;/g,"-")
                    .replace(/&ndash;/g,"-").replace(/&nbsp;/g," ")
                    .replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&amp;/g,"&");
  }
  function entryPlain(e){
    if(e==null)return "";
    if(typeof e==="string")return unesc(plainTags(e));
    if(e instanceof Array){
      var parts=[],i;
      for(i=0;i<e.length;i++){var t=entryPlain(e[i]);if(t)parts.push(t);}
      return parts.join("\n");
    }
    if(typeof e!=="object")return "";
    var ty=e.type;
    if(ty==="refClassFeature"||ty==="refSubclassFeature")return "";   // expanded elsewhere
    if(ty==="image")return "";
    if(ty==="list"){
      var out=[],its=e.items||[];
      for(var j=0;j<its.length;j++){var s=entryPlain(its[j]);if(s)out.push("- "+s.replace(/\n/g,"\n  "));}
      return out.join("\n");
    }
    if(ty==="table"){
      var rows=[],lab=e.colLabels||[];
      if(lab.length)rows.push(lab.map(function(c){return unesc(plainTags(String(c)));}).join("  |  "));
      (e.rows||[]).forEach(function(r){
        if(r instanceof Array)rows.push(r.map(function(c){return entryPlain(c).replace(/\n/g," ");}).join("  |  "));
      });
      return (e.caption?unesc(plainTags(e.caption))+"\n":"")+rows.join("\n");
    }
    // entries / item / section / inset / quote: a heading plus its body
    var body=entryPlain(e.entries||e.entry||e.items||[]);
    var nm=e.name?unesc(plainTags(String(e.name))):"";
    if(nm&&body)return nm+". "+body;
    return nm||body;
  }
  // Text used to classify a feature's action economy. Skips "choose one of these"
  // sub-option menus (lists/items/options): a reaction buried in one optional
  // sub-choice must not label the whole parent feature a Reaction.
  function actionText(e){
    if(typeof e==="string")return e+" ";
    if(!e)return "";
    if(e instanceof Array){var s="",i;for(i=0;i<e.length;i++)s+=actionText(e[i]);return s;}
    if(typeof e==="object"){
      var t=e.type;
      if(t==="list"||t==="item"||t==="options")return "";
      if(t==="refClassFeature"||t==="refSubclassFeature")return "";   // pointer, resolved separately
      var s="",k;for(k in e){if(k==="type"||k==="name"||k==="source")continue;s+=actionText(e[k]);}
      return s;
    }
    return "";
  }
  // Optional class features (Tasha's) are opt-in; they default to enabled.
  function optKey(f){return "optOff:"+f.name+"@"+f.level;}
  function optEnabled(f){return !f.optional||state.choices[optKey(f)]!=="1";}
  /* The in-play options a player picks and then reaches for every turn: Metamagic for a
     Sorcerer, Invocations for a Warlock, Maneuvers for a Battle Master. They come from the
     "choose from a pool" features, plus any optional feature that spends the class's own
     resource (a Sorcerer's Magical Guidance), so they can sit in one card of their own
     instead of being hunted for in Features & Traits. */
  function classOptions(){
    var fd=derivedState.fdata;if(!fd)return {items:[],pools:[]};
    var lists=fd.optionLists||{},out=[],seen={},pools=[],i;
    // Read each option pool by its choices. A choice only exists once the player has made
    // it at the right level, so this catches pools on the class or the subclass alike.
    for(var poolName in lists){
      var got=0;
      for(i=0;i<20;i++){
        var v=state.choices[poolName+":"+i];
        if(!v||seen["p"+v])continue;seen["p"+v]=1;got++;
        var opt=lists[poolName].filter(function(x){return x.name===v;})[0];
        out.push({name:v,entries:(opt&&opt.entries)||[],origin:poolName});
      }
      var disp=poolName.replace(/\s+Options$/,"");       // merge "Metamagic Options" into "Metamagic"
      if(got&&pools.indexOf(disp)<0)pools.push(disp);    // only name a pool the player drew from
    }
    // an optional feature that spends the class resource, e.g. Magical Guidance (sorcery points)
    var res=(window.CC_RESOURCES&&window.CC_RESOURCES[state.slug])||[];
    var words=res.map(function(r){return r.name.toLowerCase().replace(/s$/,"");});
    (fd.classFeatures||[]).forEach(function(f){
      if(f.level>state.level||!f.optional||!optEnabled(f)||lists[f.name]||seen["f"+f.name])return;
      var txt=entryText(f.entries||"").toLowerCase();
      var spends=/\b(?:spend|expend)/.test(txt)&&words.some(function(w){return w&&txt.indexOf(w)>=0;});
      if(!spends)return;
      seen["f"+f.name]=1;
      out.push({name:f.name,entries:f.entries||[],origin:state.className+" feature, level "+f.level});
    });
    return {items:out,pools:pools};
  }
  // Every feature/trait the character actually has: race + lineage + class + chosen
  // subclass (up to the current level), with nested feature references expanded.
  function featuresAndTraits(){
    var race=currentRace(),lin=race?currentLineage(race):null,fd=derivedState.fdata,list=[];
    // shallow copy so we can record an origin without touching the shared data
    function tag(f,origin){var o={},k;for(k in f)o[k]=f[k];o._origin=origin;return o;}
    function withSrc(nm,src){return (src&&String(nm).indexOf("("+src+")")<0)?nm+" ("+src+")":nm;}
    if(race)(race.traits||[]).forEach(function(x){list.push(tag(x,race.name+" ("+race.source+") — species trait"));});
        if(lin)(lin.traits||[]).forEach(function(x){list.push(tag(x,withSrc(lin.name,lin.source)+" — lineage trait"));});
    if(fd){
      (fd.classFeatures||[]).forEach(function(f){
        if(f.level>state.level||!optEnabled(f))return;
        list.push(tag(f,state.className+" — class feature, level "+f.level+(f.optional?" (optional, "+srcAbbr(f.source)+")":"")));
      });
      var chosen=state.subclassName?(fd.subclasses||[]).filter(function(s){return s.name===state.subclassName;})[0]:null;
      if(chosen)(chosen.features||[]).forEach(function(f){
        if(f.level>state.level)return;
        list.push(tag(f,withSrc(chosen.name,chosen.source)+" — subclass feature, level "+f.level));
      });
    }
    return list.concat(expandFeatureRefs(list));
  }
  /* A feature's entries can point at another feature instead of holding its text
     ({"type":"refSubclassFeature"}), which is how Path of the Beast carries Form of
     the Beast. Resolve those into real features so they are listed and searched like
     any other, inheriting the origin of the feature that referenced them. */
  function expandFeatureRefs(list){
    var lookup=(derivedState.fdata&&derivedState.fdata.refLookup)||{},out=[],seen={};
    function tag(f,origin){var o={},k;for(k in f)o[k]=f[k];o._origin=origin;return o;}
    function walk(e,origin){
      if(!e)return;
      if(e instanceof Array){for(var i=0;i<e.length;i++)walk(e[i],origin);return;}
      if(typeof e!=="object")return;
      var key=e.classFeature||e.subclassFeature;
      if((e.type==="refClassFeature"||e.type==="refSubclassFeature")&&key&&lookup[key]&&!seen[key]){
        seen[key]=1;out.push(tag(lookup[key],origin));walk(lookup[key].entries,origin);return;
      }
      for(var k in e){if(k!=="type"&&k!=="name")walk(e[k],origin);}
    }
    (list||[]).forEach(function(x){walk(x.entries,x._origin||"");});
    return out;
  }
  // features that trigger when you hit with an attack — riders like Hand of Harm, Divine
  // Smite or Stunning Strike, which carry no action/bonus/reaction wording of their own
  var ATTACK_HIT=/when you hit (?:a creature|a target|it|them|the target|another creature)?\s*with (?:an?|your|a)?\s*(?:unarmed strike|weapon|melee|ranged|attack)/i;
  // classify features/traits (+ racial bonus-action spells) by action economy; keep entries for descriptions
  function actionEconomy(){
    var out={action:[],bonus:[],reaction:[],attack:[]},seen={},inBucket={};
    function push(list,key,it){if(seen[key])return;seen[key]=1;list.push({name:it.name,entries:it.entries||[],origin:it._origin||""});}
    // a feature can belong to several buckets (e.g. Storm Guide: an action AND a bonus action)
    function classify(t){
      var txt=actionText(t.entries||"").toLowerCase();
      if(/\b(?:an|your) action\b/.test(txt)){push(out.action,"a"+t.name,t);inBucket[t.name]=1;}
      if(txt.indexOf("bonus action")>=0){push(out.bonus,"b"+t.name,t);inBucket[t.name]=1;}
      if(txt.indexOf("as a reaction")>=0||txt.indexOf("your reaction")>=0){push(out.reaction,"r"+t.name,t);inBucket[t.name]=1;}
    }
    var feats=featuresAndTraits();
    feats.forEach(classify);
    var race=currentRace(),lin=race?currentLineage(race):null;
    var rsp=allRacialSpells();
    rsp.forEach(function(sp){var s=spellByName(sp.name);if(s&&s.time&&s.time.indexOf("bonus")>=0){var c={};for(var kk in s)c[kk]=s[kk];c._origin=(race?race.name:"species")+" — innate spell";push(out.bonus,"b"+s.name,c);}});
    /* A prepared or known spell cast as a reaction or a bonus action belongs in the action
       economy as much as a feature does - Shield, Silvery Barbs and Feather Fall are easy
       to miss otherwise, since they appear under neither actions nor attacks. Spells cast
       with a full action are left out: the attack table already lists the ones that matter,
       and the rest would bury the list. */
    [].concat(state.spells.cantrips||[],state.spells.spells||[]).forEach(function(k){
      var s=spellByKey(k);
      if(!s||!s.time)return;
      var c={};for(var kk in s)c[kk]=s[kk];
      c._origin=state.className+" spell"+(s.level?", level "+s.level:" cantrip");
      if(/reaction/i.test(s.time))push(out.reaction,"r"+s.name,c);
      else if(/bonus/i.test(s.time))push(out.bonus,"b"+s.name,c);
    });
    // attack options: the on-hit riders themselves, then any feature that augments one by
    // name (Physician's Touch improves Hand of Harm), skipping anything already shown above
    var riderNames={};
    feats.forEach(function(t){
      if(ATTACK_HIT.test(plainTags(actionText(t.entries||"")))){riderNames[t.name]=1;if(!inBucket[t.name])push(out.attack,"x"+t.name,t);}
    });
    feats.forEach(function(t){
      if(riderNames[t.name]||inBucket[t.name])return;
      var txt=plainTags(actionText(t.entries||""));
      for(var nm in riderNames){if(nm.length>4&&txt.indexOf(nm)>=0){push(out.attack,"x"+t.name,t);break;}}
    });
    return out;
  }
  /* ---------- active effects ----------
     Rage, Bladesong, Giant's Might and the like are switched on in play and then last
     until they end. Both halves are read from the feature's own text: it counts as an
     effect when the text says it is activated and that it lasts, and what it grants is
     parsed from the same text. So a toggle is not a label - while it is on, the numbers
     on the sheet are recalculated with it. */
  var FX_ON=/\b(?:as an? (?:bonus )?action|use (?:a|an|your) (?:bonus )?action|when you (?:enter|use|activate))/i;
  var FX_LASTS=/\b(?:for 1 minute|for 10 minutes|for 1 hour|lasts? (?:for )?\d|while (?:raging|it lasts)|until (?:your |the |it )?(?:rage ends|next turn|start of your next turn|end of your next turn|ends?|you (?:end|dismiss|drop))|until it ends)/i;
  function fxMods(name,txt){
    var m={dmg:0,dmgDice:"",ac:0,acAbility:"",speed:0,resist:[],advAbility:[],notHeavy:false},x;
    // level-correct damage bonus from the class table (Rage Damage), else a flat one in the text
    condMods().forEach(function(cm){
      if(name.toLowerCase().indexOf(cm.kind.toLowerCase())<0)return;
      var v=cm.values[state.level-1];
      if(typeof v==="number")m.dmg=v;
    });
    if(!m.dmg&&(x=/\+(\d+) bonus to the damage roll/i.exec(txt)))m.dmg=parseInt(x[1],10);
    // some grant dice instead of a flat bonus, which cannot fold into one number
    if((x=/(?:extra|additional) (\d+d\d+) damage/i.exec(txt))||(x=/deal an extra (\d+d\d+)/i.exec(txt)))m.dmgDice=x[1];
    /* That die can be raised by a feature gained later, and the clause lives in the other
       feature rather than this one: the Rune Knight's Great Stature says the extra damage
       from Giant's Might increases to 1d8, and Runic Juggernaut to 1d10. So the character's
       features are searched for an upgrade naming this effect. They are already filtered to
       the levels reached, which gates the upgrade for free; a clause inside the effect's own
       text carries its own level and is checked against it. */
    if(m.dmgDice){
      var esc_nm=String(name).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
      var upRe=new RegExp("(?:your|the)\\s+"+esc_nm+"\\s+feature\\s+increases\\s+to\\s+(\\d+d\\d+)","i");
      featuresAndTraits().forEach(function(f){
        var um=upRe.exec(plainTags(entryText(f.entries||"")));
        if(um)m.dmgDice=biggerDie(m.dmgDice,um[1]);
      });
      var selfRe=/increases? to (\d+d\d+) when you reach (\d+)(?:st|nd|rd|th) level/gi,sm;
      while((sm=selfRe.exec(txt)))
        if(state.level>=parseInt(sm[2],10))m.dmgDice=biggerDie(m.dmgDice,sm[1]);
    }
    if((x=/bonus to (?:your )?AC equal to your (strength|dexterity|constitution|intelligence|wisdom|charisma) modifier/i.exec(txt)))m.acAbility=ABIL_WORD[x[1].toLowerCase()];
    else if((x=/\+(\d+) bonus to (?:your )?AC/i.exec(txt))||(x=/(?:your )?AC increases by (\d+)/i.exec(txt)))m.ac=parseInt(x[1],10);
    if((x=/(?:walking )?speed increases by (\d+) f/i.exec(txt)))m.speed=parseInt(x[1],10);
    if((x=/resistance to ([a-z,\s]+?) damage/i.exec(txt)))
      m.resist=x[1].split(/,|\band\b/).map(function(s){return capital(s.trim());}).filter(function(s){return s;});
    var re=/advantage on (strength|dexterity|constitution|intelligence|wisdom|charisma) (?:checks|saving throws)/gi,mm;
    while((mm=re.exec(txt))){var a=ABIL_WORD[mm[1].toLowerCase()];if(m.advAbility.indexOf(a)<0)m.advAbility.push(a);}
    m.notHeavy=/if you aren'?t wearing heavy armor/i.test(txt);
    return m;
  }
  /* A feature's own text, skipping the named options it offers. The Shifter's Shifting
     trait lists all four lineages' benefits, so reading them all would hand a Longtooth
     shifter Swiftstride's speed; the lineage's own trait carries the right one. Plain
     bullet lists are kept, because that is where Rage states what it grants. */
  function fxText(e){
    if(typeof e==="string")return e+" ";
    if(!e)return "";
    if(e instanceof Array){var s="";for(var i=0;i<e.length;i++)s+=fxText(e[i]);return s;}
    if(typeof e==="object"){
      if(e.type==="table")return "";                       // a roll table, not a rule
      if(e.name&&(e.type==="item"||e.type==="entries"&&e.isOption))return "";  // one option among several
      var s="",k;for(k in e){if(k==="type"||k==="name"||k==="source")continue;s+=fxText(e[k]);}
      return s;
    }
    return "";
  }
  // "Turn the Unholy" is activated and lasts a minute, but the minute happens to the
  // enemy. An effect is only yours if the text says what you gain from it.
  var FX_SELF=/\byou (?:also |now |magically |then )*(?:gain|have|add|can add|are|deal|give|know|become)\b|\byour [a-z ]{0,14}(?:AC|speed|attacks?|damage)\b/i;
  function fxQualifies(f){
    if(!f||!f.name)return false;
    var txt=plainTags(fxText(f.entries||""));
    return FX_ON.test(txt)&&FX_LASTS.test(txt)&&FX_SELF.test(txt);
  }
  // every effect this character could switch on
  function fxAvailable(){
    var all=[],seen={};
    featuresAndTraits().forEach(function(f){
      if(!f.name||seen[f.name]||!fxQualifies(f))return;
      var txt=plainTags(fxText(f.entries||""));
      all.push({key:f.name,name:f.name,origin:f._origin||"",mods:fxMods(f.name,txt)});
    });
    /* A lineage restates its species' feature under a fuller name ("Shifting" and
       "Shifting (Longtooth)"). Offer one toggle: the one that actually grants something,
       and otherwise the more specific name. */
    var byBase={};
    all.forEach(function(e){
      var base=e.name.replace(/\s*\([^)]*\)\s*$/,""),cur=byBase[base];
      if(!cur){byBase[base]=e;return;}
      function score(x){var m=x.mods;return (m.dmg||m.ac||m.acAbility||m.speed||m.resist.length||m.advAbility.length)?2:0;}
      if(score(e)>score(cur)||(score(e)===score(cur)&&e.name.length>cur.name.length))byBase[base]=e;
    });
    var out=[];
    all.forEach(function(e){if(byBase[e.name.replace(/\s*\([^)]*\)\s*$/,"")]===e)out.push(e);});
    return out;
  }
  function fxIsOn(key){return !!(state.sheet.active&&state.sheet.active[key]);}
  // the effects that are on right now, with anything they cannot grant filtered out
  function fxActive(){
    var heavy=wornArmor().body==="heavy";
    return fxAvailable().filter(function(e){return fxIsOn(e.key);}).map(function(e){
      var c={key:e.key,name:e.name,origin:e.origin,blocked:e.mods.notHeavy&&heavy,mods:e.mods};
      return c;
    });
  }
  // summed modifiers from every active effect that is actually granting them
  function fxTotals(){
    var effects=fxActive(),scores={};
    effects.forEach(function(e){if(e.mods.acAbility)scores[e.mods.acAbility]=totalScore(e.mods.acAbility);});
    return rulesEngine.aggregateEffects({effects:effects,abilityScores:scores});
  }
  // the spell being concentrated on, if it is still one the character knows
  function concSpell(){
    var k=state.sheet.conc;if(!k)return null;
    var s=spellByKey(k);
    return (s&&s.conc)?s:null;
  }
  function concOptions(){
    var out=[],seen={};
    state.spells.cantrips.concat(state.spells.spells).forEach(function(k){
      var s=spellByKey(k);
      if(s&&s.conc&&!seen[k]){seen[k]=1;out.push({key:k,label:s.name+(s.level?" ("+ordinal(s.level)+")":" (Cantrip)")});}
    });
    var rsp=allRacialSpells();
    rsp.forEach(function(sp){var s=spellByName(sp.name);if(!s||!s.conc)return;var k=s.name+"|"+s.source;
      if(!seen[k]){seen[k]=1;out.push({key:k,label:s.name+" (innate)"});}});
    out.sort(function(a,b){return a.label.localeCompare(b.label);});
    return out;
  }

  /* ---------- conditional damage ----------
     Rage damage, Sneak Attack and the Martial Arts die are situational, so they are
     shown as notes on the attacks they can apply to rather than folded into the total. */
  function condMods(){return (window.CC_CONDMODS&&window.CC_CONDMODS[state.slug])||[];}
  // damage an active effect adds to this kind of attack; already folded into the total
  function fxDmgFor(kind){
    return rulesEngine.effectDamage(kind,fxTotals().dmg);
  }
  // dice an active effect adds; shown as a note because it cannot fold into the total
  function fxDiceNotes(kind){
    if(!(kind&&kind.melee))return [];
    var out=[];
    fxActive().forEach(function(e){
      if(!e.blocked&&e.mods.dmgDice)out.push("+"+e.mods.dmgDice+" "+e.name+" (active)");
    });
    return out;
  }
  function condNotesFor(kind){
    var out=[],lv=state.level-1;
    condMods().forEach(function(m){
      var v=m.values[lv];
      if(v===null||v===undefined||v===0)return;
      if(m.kind==="rage"&&kind.melee&&kind.str){
        if(fxDmgFor(kind))return;               // switched on, so it shows in the damage column instead
        out.push("+"+v+" while raging");
      }
      if(m.kind==="sneak"&&(kind.finesse||kind.ranged))out.push("+"+v+" Sneak Attack (1/turn)");
      if(m.kind==="martialArts"&&(kind.unarmed||kind.monkWeapon))out.push("Martial Arts die "+v);
    });
    return out;
  }
  function withCond(notes,kind){
    var c=fxDiceNotes(kind).concat(condNotesFor(kind));
    if(!c.length)return notes;
    return (notes?notes+" · ":"")+c.join(" · ");
  }
  function dmgAbbr(c){return {P:"piercing",S:"slashing",B:"bludgeoning"}[c]||c||"";}
  /* A Monk's Martial Arts turns the flat "1" of an unarmed strike into the Martial Arts
     die and lets Dexterity stand in for Strength on the attack and damage. It works only
     while unarmored and not wielding a shield, which is the Monk's normal state. Returns
     the die for this level (e.g. "1d6"), or "" when it does not apply. */
  function martialArtsDie(){
    var lv=state.level-1,die="";
    condMods().forEach(function(m){if(m.kind==="martialArts"){var v=m.values[lv];if(v)die=v;}});
    if(!die)return "";
    var w=wornArmor();
    return rulesEngine.martialArtsDie({die:die,body:w.body,shield:w.shield});
  }
  /* Whether a weapon counts as a Monk weapon, which Martial Arts lets a Monk wield with
     Dexterity and the Martial Arts die. 2014: shortswords and simple melee weapons without
     the two-handed or heavy property. 2024: any simple melee weapon, or a martial melee
     weapon with the Light property. */
  function isMonkWeapon(w){return rulesEngine.isMonkWeapon(w,state.edition);}
  function biggerDie(a,b){return rulesEngine.biggerDie(a,b);}
  // Attacks granted by a feature's sub-options, e.g. Path of the Beast's Bite / Claws / Tail.
  function featureAttacks(){
    var out=[],seen={};
    featuresAndTraits().forEach(function(f){
      (f.entries||[]).forEach(function(e){
        if(!e||typeof e!=="object"||e.type!=="list")return;
        (e.items||[]).forEach(function(it){
          if(!it||typeof it!=="object"||!it.name)return;
          var txt=entryText(it.entries||it.entry||"");
          var m=/(\d+d\d+)\}?\s*(acid|bludgeoning|cold|fire|force|lightning|necrotic|piercing|poison|psychic|radiant|slashing|thunder)\s*damage/i.exec(txt);
          if(!m)return;
          var key=f.name+":"+it.name;
          if(seen[key])return;seen[key]=1;
          out.push({name:it.name,parent:f.name,origin:f._origin||"",dmg:m[1],dmgType:m[2].toLowerCase(),
                    reach:/reach/i.test(txt),finesse:/finesse/i.test(txt),
                    entries:(it.entries&&it.entries.length)?it.entries:(it.entry?[it.entry]:[])});
        });
      });
    });
    return out;
  }
  /* Fighting styles that change the numbers: Dueling (+2 damage with a one-handed melee
     weapon and no other weapon), Archery (+2 to ranged attack rolls), Defense (+1 AC in
     armor), Thrown Weapon Fighting (+2 thrown damage). Reroll-style ones (Great/Two-Weapon
     Fighting) can't fold into a single number, so they show as a note. */
  function fightingStyles(){
    var out=[],i,v;for(i=0;i<20;i++){v=state.choices["Fighting Style:"+i];if(v&&out.indexOf(v)<0)out.push(v);}return out;
  }
  function hasStyle(nm){var s=fightingStyles(),i;for(i=0;i<s.length;i++)if(s[i].indexOf(nm)>=0)return true;return false;}
  function scaledDie(sc,L){return rulesEngine.scaledDie(sc,L);}
  function capital(s){return s?s.charAt(0).toUpperCase()+s.slice(1):"";}
  /* The attack table on the sheet: equipped weapons, the unarmed strike, feature attacks
     (Bite/Claws) and damaging spells, each already carrying its ability modifier, magic
     bonus, fighting style, Martial Arts die and active effects. Returned as data so the
     sheet and the PowerPoint export show exactly the same rows. */
  /* The Features & Traits list exactly as the sheet shows it: every class, subclass,
     referenced, species and lineage feature, carrying the player's own selections
     (chosen Metamagic options, the feat taken instead of an ASI, and so on). Shared
     with the PowerPoint export so the printed page matches the expanded card. */
  function featureCards(){
    var fd=derivedState.fdata;if(!fd)return [];
    var race=currentRace(),lin=race?currentLineage(race):null;
    var featItems=[],seenCh={},refSrc=[];
    (fd.classFeatures||[]).forEach(function(f){
      if(f.level>state.level||!optEnabled(f))return;    // optional features can be switched off
      var isGroup=fd.optionLists&&fd.optionLists[f.name]&&f.name!=="Ability Score Improvement";
      if(isGroup){if(seenCh[f.name])return;seenCh[f.name]=1;}  // show a repeating choice feature (e.g. Metamagic) once
      var nm=f.name+(f.optional?" (optional)":"")+(f.name==="Ability Score Improvement"?" ("+ordinal(f.level)+" level)":"");
      var og=state.className+" — class feature, level "+f.level+(f.optional?" (optional, "+sourceName(f.source)+")":"");
      featItems.push({name:nm,entries:featEntriesWithChoice(f),origin:og});
      refSrc.push({entries:f.entries,_origin:og});
    });
    var chosen=state.subclassName?(fd.subclasses||[]).filter(function(s){return s.name===state.subclassName;})[0]:null;
    if(chosen)(chosen.features||[]).forEach(function(f){
      if(f.level>state.level)return;
      var og=state.subclassName+" — subclass feature, level "+f.level+" ("+sourceName(chosen.source)+")";
      featItems.push({name:f.name+" ["+state.subclassName+"]",entries:featEntriesWithChoice(f),origin:og});
      refSrc.push({entries:f.entries,_origin:og});
    });
    // features a listed feature only points at, e.g. Form of the Beast inside Path of the Beast
    expandFeatureRefs(refSrc).forEach(function(f){
      featItems.push({name:f.name+(state.subclassName&&f._origin.indexOf("subclass")>=0?" ["+state.subclassName+"]":""),
                      entries:f.entries,origin:f._origin});
    });
    if(race)(race.traits||[]).forEach(function(t){featItems.push({name:t.name,entries:t.entries,origin:race.name+" ("+sourceName(race.source)+") — species trait"});});
    if(lin)(lin.traits||[]).forEach(function(t){featItems.push({name:t.name,entries:t.entries,origin:lin.name+" — lineage trait"});});
    (function(){                                  // the feat a species hands out
      var g=raceFeatGrant();if(!g)return;
      for(var i=0;i<g.count;i++){
        var ft=featByName(raceFeatName(i));
        if(ft)featItems.push({name:"Feat: "+ft.name,entries:ft.entries||[],
          origin:(lin?lin.name:(race?race.name:"Species"))+" — feat from your species"});
      }
    })();
    // spells a feat grants, so they are on the sheet and the printout
    allChosenFeats().forEach(function(rec){
      var got=[],p=featPicks(rec.ft,rec.base,rec.store);
      var sb=featSpellBlock(rec.ft,rec.base,rec.store);
      if(sb)(sb.fixed||[]).forEach(function(v){got.push(properSpellName(v));});
      (p.spells||[]).forEach(function(v){got.push(properSpellName(v));});
      var lines=[];
      if(got.length)lines.push("You gain "+got.join(", ")+".");
      // spells the feat grants only once you reach a level, and how often they may be cast
      if(sb)(sb.later||[]).forEach(function(g){
        if(g.level>state.level)return;
        lines.push("From level "+g.level+": "+
                   (g.names||[]).map(properSpellName).join(", ")+
                   (g.rate?" ("+g.rate+")":"")+".");
      });
      // and the spells it merely adds to your list, which you still have to learn
      if(sb&&sb.expanded){
        var add=[];
        for(var lv in sb.expanded)(sb.expanded[lv]||[]).forEach(function(n){add.push(properSpellName(n));});
        if(add.length)lines.push("Added to your spell list, to learn or prepare as your own: "+
                                 add.join(", ")+".");
      }
      if(!lines.length)return;
      featItems.push({name:rec.ft.name+" spells",entries:lines,
        origin:rec.ft.name+" - spells from the feat"});
    });
    // the options a feat let you choose (Metamagic Adept's two Metamagic options, and so on)
    allChosenFeats().forEach(function(rec){
      var p=featPicks(rec.ft,rec.base,rec.store);
      (rec.ft.optProg||[]).forEach(function(prog){
        p.options.forEach(function(nm){
          var o=optFeatureList(prog.types,rec.ft.edition).filter(function(x){return x.name===nm;})[0];
          if(o)featItems.push({name:nm+" ["+prog.name+"]",entries:o.entries||[],
            origin:rec.ft.name+" — "+prog.name+" option"});
        });
      });
    });
    return featItems;
  }
  function attackRows(){
    var prof=profBonus(),strM=abMod(totalScore("Strength")),dexM=abMod(totalScore("Dexterity"));
    var info=spellInfo(),spell=info?rulesEngine.spellModifiers({proficiencyBonus:prof,
      abilityModifier:abMod(totalScore(info.ability))}):null,spAtk=spell?spell.attack:null,spDC=spell?spell.saveDC:null;
    var out=[];
    // same call shape as the sheet's renderer, but it collects the row instead of drawing it
    function row(name,sub,range,hit,dmg,notes,why,desc){
      out.push({name:name,sub:sub,range:range,hit:hit,dmg:dmg,notes:notes||"",why:why||"",desc:desc||[]});
      return "";
    }
    function spellDesc(s){
      var hdr=["{@b Casting Time:} "+(s.time||"—")+"  ·  {@b Range:} "+(s.range||"—"),
               "{@b Components:} "+(s.compFull||"—")+"  ·  {@b Duration:} "+(s.duration||"—")];
      var body=hdr.concat(s.entries||[]);
      if(s.higher&&s.higher.length)body=body.concat([{type:"entries",name:"At Higher Levels",entries:s.higher}]);
      return body;
    }
    var maDie=martialArtsDie();
    var rows="";
    state.equipment.inventory.forEach(function(it){
      if(it.cat!=="Weapon")return;
      if(!it.equipped)return;             // only weapons you are actually wielding
      var w=resolveWeapon(it);
      if(!w)return;                       // e.g. a magic variant with no base weapon chosen yet
      if(w.attRequired&&!it.attuned)return;   // requires attunement, and you are not attuned
      var result=rulesEngine.weaponAttack({weapon:w,edition:state.edition,martialArtsDie:maDie,
        strModifier:strM,dexModifier:dexM,proficiencyBonus:prof,effectDamage:fxTotals().dmg,
        weaponCriticalThreshold:(itemInfo(it.name,it.source)||{}).critThreshold,itemCriticalThreshold:itemBonuses().crit,
        styles:{dueling:hasStyle("Dueling"),thrown:hasStyle("Thrown Weapon Fighting"),
          archery:hasStyle("Archery"),greatWeapon:hasStyle("Great Weapon Fighting")}});
      var props=w.props||[],finesse=result.finesse,thrown=result.thrown,melee=result.melee;
      var monkW=result.monkWeapon,usesStr=result.usesStrength;
      var range=w.wtype==="R"?(w.range?w.range+" ft.":"Ranged"):(thrown&&w.range?"5 ft. / "+w.range:"5 ft.");
      var styleNotes=[];
      if(result.styles.dueling)styleNotes.push("+2 Dueling (wielding it alone)");
      if(result.styles.thrown)styleNotes.push("+2 Thrown Weapon Fighting");
      if(result.styles.archery)styleNotes.push("+2 Archery (to hit)");
      if(result.styles.greatWeapon)styleNotes.push("reroll 1s & 2s (Great Weapon Fighting)");
      var dbonus=result.damageModifier,die=result.die;
      var dstr=die+(dbonus>0?"+"+dbonus:(dbonus<0?""+dbonus:""))+" "+dmgAbbr(w.dmgType);
      var notes=props.join(", ");
      if(w.bonus)notes=(notes?notes+" · ":"")+"magic +"+w.bonus;
      if(monkW&&die!==w.dmg)notes=(notes?notes+" · ":"")+"Martial Arts die ("+w.dmg+" base)";
      if(styleNotes.length)notes=(notes?notes+" · ":"")+styleNotes.join(" · ");
      // the die and Dex are already applied for a monk weapon, so suppress the reminder note
      notes=withCond(notes,{melee:melee,ranged:!melee,str:usesStr,finesse:finesse,monkWeapon:false});
      if(w.att==="optional"&&!it.attuned)notes=(notes?notes+" · ":"")+"not attuned — no magic bonus";
      // a lowered critical range comes from the weapon itself or from something else worn
      var critAt=result.criticalThreshold;
      if(critAt<20)notes=(notes?notes+" · ":"")+"crits on "+critAt+"–20";
      var sub=w.wtype==="R"?"Ranged Weapon":(monkW?"Monk Weapon":"Melee Weapon");
      rows+=row(w.name,sub,range,modStr(result.attack),dstr,notes,
                "Equipped item"+(it.source?" — "+sourceName(it.source):""),itemEntriesFull(it));
    });
    var unarmed=rulesEngine.unarmedAttack({martialArtsDie:maDie,strModifier:strM,dexModifier:dexM,
      proficiencyBonus:prof,effectDamage:fxDmgFor({melee:true,str:true})});
    if(maDie){
      // Monk: the Martial Arts die replaces the flat 1, and Dexterity may stand in for Strength
      var uMod=unarmed.damageModifier;
      rows+=row("Unarmed Strike","Melee (Martial Arts)","5 ft.",modStr(unarmed.attack),
                maDie+(uMod>0?"+"+uMod:(uMod<0?""+uMod:""))+" bludgeoning",
                withCond("",{melee:true,str:true}),   // no unarmed note; the die is in the damage column
                "Monk — Martial Arts",
                ["A punch, kick, head-butt or similar blow. Your Martial Arts feature lets you "+
                 "roll the "+maDie+" Martial Arts die in place of the normal unarmed damage and "+
                 "use your Dexterity modifier instead of Strength for the attack and damage rolls. "+
                 "It applies while you are unarmored and not wielding a shield."]);
    }else{
      rows+=row("Unarmed Strike","Melee","5 ft.",modStr(unarmed.attack),unarmed.flatDamage+" bludgeoning",
                withCond("",{melee:true,str:true,unarmed:true}),
                "Available to every character",    // unarmed damage is always at least 1
                ["A punch, kick, head-butt or similar blow, made in place of a weapon attack. "+
                 "Every character is proficient with it, and it deals bludgeoning damage equal to "+
                 "1 + your Strength modifier — never less than 1."]);
    }
    featureAttacks().forEach(function(a){                 // e.g. Bite / Claws / Tail from Form of the Beast
      var feature=rulesEngine.featureAttack({finesse:a.finesse,strModifier:strM,dexModifier:dexM,
        proficiencyBonus:prof,effectDamage:fxTotals().dmg});
      var dm=feature.damageModifier;
      rows+=row(a.name,a.parent,a.reach?"10 ft. (reach)":"5 ft.",modStr(feature.attack),
                a.dmg+(dm>0?"+"+dm:(dm<0?""+dm:""))+" "+a.dmgType,
                withCond(a.reach?"Reach":"",{melee:true,str:feature.usesStrength,finesse:a.finesse,unarmed:true}),
                a.origin?(a.parent+" — "+a.origin):a.parent,
                a.entries.length?["{@i From "+a.parent+".}"].concat(a.entries):[]);
    });
    if(info){
      state.spells.cantrips.forEach(function(k){
        var s=spellByKey(k);if(!s||!s.scaling)return;
        var die=scaledDie(s.scaling,state.level);
        var hit=s.atk?modStr(spAtk):(s.save?"DC "+spDC:"—");
        rows+=row(s.name,"Cantrip",s.range||"—",hit,die+" "+(s.dmgType||""),(s.save?"Save: "+capital(s.save):"")+(s.conc?" · Conc.":""),
                  state.className+" cantrip — "+sourceName(s.source),spellDesc(s));
      });
      state.spells.spells.forEach(function(k){  // leveled damage/attack spells
        var s=spellByKey(k);if(!s||!s.dmg||(!s.atk&&!s.save))return;
        var hit=s.atk?modStr(spAtk):"DC "+spDC;
        rows+=row(s.name,ordinal(s.level)+"-level spell",s.range||"—",hit,s.dmg+" "+(s.dmgType||""),(s.save?"Save: "+capital(s.save):"")+(s.conc?" · Conc.":""),
                  state.className+" spell — "+sourceName(s.source),spellDesc(s));
      });
    }
    return out;
  }
  // how many attacks the Attack action grants (Extra Attack stacks)
  function attacksPerAction(){
    var extra=0;(derivedState.fdata&&derivedState.fdata.classFeatures||[]).forEach(function(f){if(f.level<=state.level&&/Extra Attack/i.test(f.name))extra++;});
    return 1+extra;
  }
  function actionsCardHtml(){return sheetUI.actionsCardHtml.apply(null,arguments);}
  /* The status bar is a readout, not a control: it lists only what is on right now, so
     it costs nothing when nothing is. Clicking a pill switches that effect off again. */
  function fxBarHtml(){return sheetUI.fxBarHtml.apply(null,arguments);}
  function deathSavesHtml(){return sheetUI.deathSavesHtml.apply(null,arguments);}
  function spellSlotsHtml(){return sheetUI.spellSlotsHtml.apply(null,arguments);}
  function renderInvResults(){return sheetUI.renderInvResults.apply(null,arguments);}
  function renderSheet(){return sheetUI.renderSheet.apply(null,arguments);}
  function renderSheetInner(){return sheetUI.renderSheetInner.apply(null,arguments);}

  /* ---------- save / load / export ---------- */

  function processPortrait(file){
    var rd=new FileReader();
    rd.onload=function(){
      var img=new Image();
      img.onload=function(){
        var s=Math.min(1,256/Math.max(img.width,img.height));
        var w=Math.max(1,Math.round(img.width*s)),h=Math.max(1,Math.round(img.height*s));
        var c=document.createElement("canvas");c.width=w;c.height=h;
        c.getContext("2d").drawImage(img,0,0,w,h);
        try{state.portrait=c.toDataURL("image/png");}catch(e){alert("Could not read that image.");return;}
        render();
      };
      img.onerror=function(){alert("That file isn't a readable image.");};
      img.src=rd.result;
    };
    rd.readAsDataURL(file);
  }
  function serializeChar(){return characterModel.serialize(state);}
  function toast(msg){
    var el=$("toast");
    if(!el){el=document.createElement("div");el.id="toast";el.className="toast";document.body.appendChild(el);}
    el.textContent=msg;el.className="toast show";
    if(window._toastT)clearTimeout(window._toastT);
    window._toastT=setTimeout(function(){el.className="toast";},2200);
  }
  function downloadBlob(data,filename,mime){
    var blob=new Blob([data],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=filename;document.body.appendChild(a);a.click();
    setTimeout(function(){URL.revokeObjectURL(url);if(a.parentNode)a.parentNode.removeChild(a);},150);
  }
  /* ---------- saving ----------
     When the browser supports the File System Access API we keep a handle to the file
     that was opened (or first saved to), so later saves overwrite it in place instead of
     dropping another copy in Downloads. "Save as..." always asks for a location. */
  /* ---------- recent characters ----------
     A handle from the file picker survives being stored in IndexedDB, so the opening
     screen can list the characters actually worked on and reopen one in a click. The
     browser still gates the file itself, which is why opening a recent asks permission
     once per session; granting it also restores Save-in-place for that file.
     Only handles are kept, never a copy of the character, so what opens is always what
     is on disk. Without the File System Access API the list stays hidden. */
  var RC_DB="cc-recents",RC_STORE="chars",RC_MAX=8;
  function rcOpen(){
    return new Promise(function(res,rej){
      if(!window.indexedDB){rej(new Error("no IndexedDB"));return;}
      var rq=indexedDB.open(RC_DB,1);
      rq.onupgradeneeded=function(){
        var db=rq.result;
        if(!db.objectStoreNames.contains(RC_STORE))db.createObjectStore(RC_STORE,{keyPath:"id",autoIncrement:true});
      };
      rq.onsuccess=function(){res(rq.result);};
      rq.onerror=function(){rej(rq.error);};
    });
  }
  function rcAll(){
    return rcOpen().then(function(db){return new Promise(function(res,rej){
      var rq=db.transaction(RC_STORE,"readonly").objectStore(RC_STORE).getAll();
      rq.onsuccess=function(){res(rq.result||[]);};
      rq.onerror=function(){rej(rq.error);};
    });});
  }
  function rcPut(rec){
    return rcOpen().then(function(db){return new Promise(function(res,rej){
      var tx=db.transaction(RC_STORE,"readwrite"),rq=tx.objectStore(RC_STORE).put(rec);
      rq.onsuccess=function(){res(rq.result);};
      tx.onerror=function(){rej(tx.error);};
    });});
  }
  function rcDel(ids){
    if(!ids||!ids.length)return Promise.resolve();
    return rcOpen().then(function(db){return new Promise(function(res,rej){
      var tx=db.transaction(RC_STORE,"readwrite"),st=tx.objectStore(RC_STORE);
      ids.forEach(function(id){st["delete"](id);});
      tx.oncomplete=function(){res();};
      tx.onerror=function(){rej(tx.error);};
    });});
  }
  // Remember the file that is open, replacing any earlier entry for that same file.
  function rcRemember(handle){
    if(!handle||!canFilePicker()||!window.indexedDB||!window.Promise)return;
    var rec={handle:handle,file:handle.name,name:state.name||"Unnamed",
             cls:state.className||"",level:state.level,sub:state.subclassName||"",
             edition:state.edition,portrait:state.portrait||null,when:(new Date()).getTime()};
    return rcAll().then(function(list){
      var same=list.map(function(r){
        if(r.handle&&r.handle.isSameEntry)return r.handle.isSameEntry(handle)["catch"](function(){return false;});
        return Promise.resolve(r.file===rec.file);
      });
      return Promise.all(same).then(function(flags){
        var drop=[];
        list.forEach(function(r,i){if(flags[i])drop.push(r.id);});
        var keep=list.filter(function(r){return drop.indexOf(r.id)<0;});
        keep.sort(function(a,b){return b.when-a.when;});
        keep.slice(RC_MAX-1).forEach(function(r){drop.push(r.id);});   // trim the oldest
        return rcDel(drop).then(function(){return rcPut(rec);});
      });
    })["catch"](function(){});      // a convenience must never break a save
  }
  function rcWhen(ms){
    var mins=Math.round(((new Date()).getTime()-ms)/60000);
    if(mins<1)return "just now";
    if(mins<60)return mins+(mins===1?" minute ago":" minutes ago");
    var hrs=Math.round(mins/60);
    if(hrs<24)return hrs+(hrs===1?" hour ago":" hours ago");
    var days=Math.round(hrs/24);
    if(days<30)return days+(days===1?" day ago":" days ago");
    return (new Date(ms)).toLocaleDateString();
  }
  function rcCardHtml(r){
    var art=r.portrait?'<img src="'+esc(r.portrait)+'" alt="">':'<span class="rc-die">&#9670;</span>';
    var bits=[];
    if(r.cls)bits.push("Level "+r.level+" "+r.cls);
    if(r.sub)bits.push(r.sub);
    var why=r.file+"  ·  "+editionLabel(r.edition)+"  ·  opened "+rcWhen(r.when);
    return '<div class="rc" data-id="'+r.id+'" title="'+esc(why)+'" role="button" tabindex="0">'+
      '<span class="rc-art">'+art+'</span>'+
      '<span class="rc-txt"><span class="rc-name">'+esc(r.name)+'</span>'+
      '<span class="rc-sub">'+esc(bits.join("  ·  ")||r.file)+'</span>'+
      '<span class="rc-ago">'+esc(rcWhen(r.when))+'</span></span>'+
      '<span class="rc-x" data-x="'+r.id+'" title="Forget this character (the file itself is not deleted)">&times;</span>'+
      "</div>";
  }
  function renderRecents(){
    var wrap=$("recentWrap"),host=$("recentList");
    if(!wrap||!host)return;
    function hide(){wrap.classList.add("hidden");}
    if(!canFilePicker()||!window.indexedDB||!window.Promise){hide();return;}
    rcAll().then(function(list){
      list.sort(function(a,b){return b.when-a.when;});
      if(!list.length){hide();return;}
      host.innerHTML=list.map(rcCardHtml).join("");
      wrap.classList.remove("hidden");
      Array.prototype.forEach.call(host.querySelectorAll(".rc"),function(el){
        function go(){openRecent(+el.getAttribute("data-id"));}
        el.addEventListener("click",go);
        el.addEventListener("keydown",function(e){if(e.keyCode===13||e.keyCode===32){e.preventDefault();go();}});
      });
      Array.prototype.forEach.call(host.querySelectorAll(".rc-x"),function(x){
        x.addEventListener("click",function(e){
          e.stopPropagation();                       // forgetting must not also open it
          rcDel([+x.getAttribute("data-x")]).then(renderRecents);
        });
      });
    })["catch"](hide);
  }
  function openRecent(id){
    rcAll().then(function(list){
      var r=null;
      list.forEach(function(x){if(x.id===id)r=x;});
      if(!r||!r.handle)return;
      return grantWrite(r.handle).then(function(ok){
        // read access is enough to open it; without write access Save asks for a location
        if(!ok)toast("Opened read-only — Save will ask where to put it");
        return r.handle.getFile().then(function(f){
          loadCharFile(f,ok?r.handle:null);
          r.when=(new Date()).getTime();
          return rcPut(r);
        });
      })["catch"](function(e){
        var gone=e&&(e.name==="NotFoundError"||e.name==="NotReadableError");
        if(gone){
          rcDel([r.id]).then(renderRecents);
          toast(r.file+" is no longer there — removed from the list");
        }else toast("Could not open "+r.file);
      });
    })["catch"](function(){});
  }
  var charFileHandle=null;
  function canFilePicker(){return !!(window.showOpenFilePicker&&window.showSaveFilePicker);}
  function charFileName(){return (state.name||"character").replace(/[^\w \-]/g,"")+".json";}
  function grantWrite(h){
    if(!h.queryPermission)return Promise.resolve(true);
    return h.queryPermission({mode:"readwrite"}).then(function(p){
      if(p==="granted")return true;
      if(!h.requestPermission)return false;
      return h.requestPermission({mode:"readwrite"}).then(function(p2){return p2==="granted";});
    });
  }
  function writeHandle(h,text){
    return h.createWritable().then(function(w){
      return w.write(text).then(function(){return w.close();});
    });
  }
  /* Both pickers open where characters already live: the folder holding this character's
     own file, or failing that the most recently used one. startIn takes a file handle and
     means "that file's folder", so once a character has been saved into Characters the
     dialog lands there every time, with no extra folder permission to grant. The shared
     id gives the browser its own memory of the last folder used for characters, which
     covers the very first save. */
  var PICKER_ID="cc-characters";
  var CHAR_TYPES=[{description:"Character file",accept:{"application/json":[".json"]}}];
  var NL=String.fromCharCode(10);
  function saveDirHint(){
    if(charFileHandle)return Promise.resolve(charFileHandle);
    if(!window.indexedDB)return Promise.resolve(null);
    return rcAll().then(function(list){
      list.sort(function(a,b){return b.when-a.when;});
      return (list[0]&&list[0].handle)||null;
    })["catch"](function(){return null;});
  }
  function pickAndSave(json){
    return saveDirHint().then(function(hint){
      var opts={suggestedName:charFileName(),id:PICKER_ID,types:CHAR_TYPES};
      if(hint)opts.startIn=hint;
      return window.showSaveFilePicker(opts);
    }).then(function(h){
      charFileHandle=h;
      return writeHandle(h,json).then(function(){toast("Saved to "+h.name);rcRemember(h);});
    })["catch"](function(e){
      if(e&&e.name==="AbortError")return;
      downloadBlob(json,charFileName(),"application/json");toast("Saved to your downloads");
    });
  }
  /* Saving never overwrites silently. A character with no file yet goes straight to the
     picker; one that has a file is asked about it, and declining leads to the picker so
     it can be saved somewhere else. */
  function saveChar(){
    if(!state.className){alert("Build a character first (pick a class).");return;}
    var json=JSON.stringify(serializeChar(),null,2);
    if(!canFilePicker()){downloadBlob(json,charFileName(),"application/json");toast("Saved to your downloads");return;}
    if(!charFileHandle){pickAndSave(json);return;}
    var msg="Overwrite "+charFileHandle.name+"?"+NL+NL+"Cancel to save it somewhere else instead.";
    if(!confirm(msg)){pickAndSave(json);return;}
    grantWrite(charFileHandle).then(function(ok){
      if(!ok)return pickAndSave(json);
      return writeHandle(charFileHandle,json).then(function(){toast("Saved to "+charFileHandle.name);rcRemember(charFileHandle);});
    })["catch"](function(){return pickAndSave(json);});
  }
  // Loading through the picker gives us a handle we can overwrite later.
  function loadViaPicker(fallbackInputId){
    if(!canFilePicker()){$(fallbackInputId).click();return;}
    saveDirHint().then(function(hint){
      var opts={multiple:false,id:PICKER_ID,types:CHAR_TYPES};
      if(hint)opts.startIn=hint;
      return window.showOpenFilePicker(opts);
    })
      .then(function(hs){
        var h=hs[0];
        return h.getFile().then(function(f){loadCharFile(f,h);});
      })["catch"](function(e){
        if(e&&e.name==="AbortError")return;
        $(fallbackInputId).click();
      });
  }
  function loadCharObj(o,fromServer,handle){
    if(!window.CCCharacterJSON)throw new Error("Character validation unavailable. Reload the application before importing.");
    window.CCCharacterJSON.validate(o);
    var fresh=characterModel.normalize(o),requested=JSON.stringify(serializeChar());
    var generation=featureLoadGeneration,ticket=++importGeneration,synchronous=true;
    function finish(fd){
      if(generation!==featureLoadGeneration||ticket!==importGeneration)return;
      if(fresh.slug&&!fd){
        var error=new Error("Game data for this character could not be loaded. Your current character was kept.");
        if(synchronous)throw error;
        alert(error.message);return;
      }
      if(!synchronous&&!fromServer&&serverLibrary&&serverLibrary.isBusy()){
        serverLibrary.canLeave();return;
      }
      if(!synchronous&&requested!==JSON.stringify(serializeChar())&&
         !confirm("Discard the changes made while this character was loading?"))return;
      var previous=serializeChar(),oldView=JSON.parse(JSON.stringify(uiState));
      var oldData=derivedState.fdata,oldHandle=charFileHandle;
      var wasHome=uiState.screen==="edition";
      featureLoadGeneration++;
      replaceState(state,fresh);replaceState(uiState,freshView());derivedState.fdata=fd;
      try{
        synchronizeGameplay();
        $("editionTag").textContent=editionLabel(state.edition);
        populateClasses();populateBackgrounds();populateRaces();
        $("charName").value=state.name||"";$("classSelect").value=state.slug||"";
        populateLevels();$("levelSelect").value=state.level;
        $("featTitle").textContent=state.className?state.className+" Features":"Class Features";
        showBuild(state.slug?"sheet":"class");
        charFileHandle=handle||null;
        if(!fromServer&&serverLibrary)serverLibrary.detach();
        rcRemember(charFileHandle);
      }catch(error){
        featureLoadGeneration++;
        replaceState(state,characterModel.normalize(previous));replaceState(uiState,oldView);
        derivedState.fdata=oldData;charFileHandle=oldHandle;
        $("charName").value=state.name||"";$("classSelect").value=state.slug||"";$("levelSelect").value=state.level;
        $("editionTag").textContent=editionLabel(state.edition);
        $("featTitle").textContent=state.className?state.className+" Features":"Class Features";
        try{if(wasHome)showEdition();else showBuild(uiState.currentStep);}catch(ignored){}
        if(synchronous)throw error;
        alert("Could not load character: "+(error.message||error));
      }
    }
    // References are staged without changing the current character. Reset,
    // navigation or a newer selection invalidates this pending import.
    if(fresh.slug)loadFeatureData(fresh.slug,finish);else finish(null);
    synchronous=false;
  }
  function loadCharFile(file,handle){
    if(file.size>2097152){alert("Character file exceeds the 2 MiB limit. Your current character was kept.");return;}
    var rd=new FileReader(),generation=featureLoadGeneration,ticket=++fileReadGeneration;
    rd.onload=function(){try{
      if(generation!==featureLoadGeneration||ticket!==fileReadGeneration)return;
      if(!window.CCCharacterJSON)throw new Error("Character validation unavailable. Reload the application before importing.");
      var value=window.CCCharacterJSON.parse(rd.result);
      if(!value||value._app!=="dnd-cc"){alert("That doesn't look like a saved character file.");return;}
      if(serverLibrary&&!serverLibrary.canLeave())return;
      loadCharObj(value,false,handle);
    }catch(e){alert("Could not read file: "+(e.message||e));}};
    rd.onerror=function(){if(generation===featureLoadGeneration&&ticket===fileReadGeneration)alert("Could not read the character file. Your current character was kept.");};
    rd.readAsText(file);
  }

  /* ---------- optional shared server library ---------- */
  function initServerLibrary(){
    if(!window.CCServerLibrary)return;
    var libraryView=window.CCLibraryUI.create({document:document,ui:uiState,actions:{
      isBusy:function(){return serverLibrary?serverLibrary.isBusy():false;},
      open:function(id){serverLibrary.open(id);},remove:function(item){serverLibrary.remove(item);}
    }});
    serverLibrary=window.CCServerLibrary.create({
      serialize:serializeChar,
      confirm:function(message){return confirm(message);},
      confirmDelete:libraryView.confirmDelete,
      prepare:function(character){
        return new Promise(function(resolve,reject){
          if(!character.slug){resolve();return;}
          if(!classBySlug(character.slug)){reject(new Error("Game data for this character's class is missing. Your current character was kept."));return;}
          var timer=window.setTimeout(function(){reject(new Error("Game data for this character timed out. Your current character was kept."));},15000);
          loadFeatureData(character.slug,function(fd){
            window.clearTimeout(timer);
            if(fd)resolve();else reject(new Error("Game data for this character could not be loaded. Your current character was kept."));
          });
        });
      },
      load:function(character){
        try{loadCharObj(character,true);}
        catch(error){throw new Error("Invalid response from the character server. Your current character was kept.");}
      },
      onStatus:libraryView.onStatus,
      onBusy:libraryView.onBusy,
      onList:libraryView.onList
    });
    $("serverRefresh").addEventListener("click",function(){serverLibrary.refresh();});
    $("serverSave").addEventListener("click",function(){serverLibrary.save(false);});
    $("serverSaveNew").addEventListener("click",function(){serverLibrary.save(true);});
    $("serverConflictNew").addEventListener("click",function(){serverLibrary.save(true);});
    $("serverReload").addEventListener("click",function(){serverLibrary.reload();});
    if(window.addEventListener)window.addEventListener("beforeunload",function(event){
      if(serverLibrary.isBusy()||serverLibrary.dirty()){event.preventDefault();event.returnValue="";}
    });
  }

  function base64ToBytes(b64){var bin=atob(b64),arr=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return arr;}
  function featureNamesList(){
    var fd=derivedState.fdata,out=[];if(!fd)return out;
    var race=currentRace(),lin=race?currentLineage(race):null;
    (fd.classFeatures||[]).forEach(function(f){if(f.level<=state.level)out.push(f.name);});
    var chosen=state.subclassName?(fd.subclasses||[]).filter(function(s){return s.name===state.subclassName;})[0]:null;
    if(chosen)(chosen.features||[]).forEach(function(f){if(f.level<=state.level)out.push(f.name+" ["+state.subclassName+"]");});
    if(race)(race.traits||[]).forEach(function(t){out.push(t.name);});
    if(lin)(lin.traits||[]).forEach(function(t){out.push(t.name);});
    (fd.classFeatures||[]).forEach(function(f){if(f.name==="Ability Score Improvement"&&f.level<=state.level&&state.choices["asi:"+f.level+":mode"]==="feat"){var ft=state.choices["asi:"+f.level+":feat"];if(ft)out.push("Feat: "+ft);}});
    return out;
  }
  function fillPdfForm(form){
    var F=window.CC_PDF_FIELDS;
    function setT(name,val){try{form.getTextField(name).setText(val==null?"":String(val));}catch(e){}}
    function check(name){try{form.getCheckBox(name).check();}catch(e){}}
    var prof=profBonus(),race=currentRace(),lin=race?currentLineage(race):null;
    setT("CharacterName",state.name);
    setT("ClassLevel",state.className+" "+state.level+(state.subclassName?" ("+state.subclassName+")":""));
    setT("Background",state.bgIsCustom?state.bgCustomName:(currentBg()?currentBg().name:""));
    setT("Race ",speciesLabel());
    setT("Alignment",state.details.alignment);
    setT("XP",state.sheet.xp);setT("Inspiration",state.sheet.inspiration?"Yes":"");
    ABILITIES.forEach(function(a){var t=totalScore(a);setT(F.abilityFields[a],t);setT(F.abilityMods[a],modStr(abMod(t)));});
    var sp=savingProfs();
    ABILITIES.forEach(function(a){setT(F.saveFields[a],modStr(saveBonus(a)));if(sp[a])check(F.saveChecks[a]);});
    var ps=proficientSkills();
    for(var sk in F.skillFields){setT(F.skillFields[sk],modStr(skillBonus(sk)));if(ps[sk])check(F.skillChecks[sk]);}
    setT("Passive",passiveScore("Perception"));
    setT("ProfBonus","+"+prof);setT("AC",computeAC());setT("Initiative",modStr(abMod(totalScore("Dexterity"))));
    setT("Speed",speedText());
    var mhp=maxHP();setT("HPMax",mhp);setT("HPCurrent",state.sheet.hpEdited?state.sheet.hpCurrent:mhp);setT("HPTemp",state.sheet.hpTemp);
    setT("HDTotal",state.level+"d"+state.hdFaces);
    var pf=(derivedState.fdata&&derivedState.fdata.proficiencies)||{};
    // fold any added proficiencies in after the granted ones
    var _fg=featureGrants();
    function profLine(txt,key){
      var granted=(_fg[key]||[]).concat(key==="tools"?featureToolPicks():[],featGrantsAll()[key]||[]);
      var base=withFeatureProfs(txt||"None",granted);
      return plainTags(base)+(customProfs(key).length?", "+customProfs(key).join(", "):"");
    }
    setT("ProficienciesLang","Armor: "+profLine(pf.armor,"armor")+"\nWeapons: "+profLine(pf.weapons,"weapons")+"\nTools: "+profLine(pf.tools,"tools")+"\nLanguages: "+languagesAll().join(", "));
    var best=Math.max(abMod(totalScore("Strength")),abMod(totalScore("Dexterity")));
    var wpns=state.equipment.inventory.filter(function(i){return i.equipped&&i.cat==="Weapon"&&i.dmg;});
    var wf=[["Wpn Name","Wpn1 AtkBonus","Wpn1 Damage"],["Wpn Name 2","Wpn2 AtkBonus ","Wpn2 Damage "],["Wpn Name 3","Wpn3 AtkBonus  ","Wpn3 Damage "]];
    for(var i=0;i<3&&i<wpns.length;i++){setT(wf[i][0],wpns[i].name);setT(wf[i][1],modStr(best+prof));setT(wf[i][2],wpns[i].dmg+"+"+best+(wpns[i].dmgType?" "+wpns[i].dmgType:""));}
    var c=state.equipment.currency;setT("CP",c.cp);setT("SP",c.sp);setT("EP",c.ep);setT("GP",c.gp);setT("PP",c.pp);
    setT("Equipment",state.equipment.inventory.map(function(it){return it.name+(it.qty>1?" x"+it.qty:"");}).join("\n"));
    var feats=featureNamesList(),dl=defencesSummaryLines();
    var featText=(dl.length?feats.concat(["","Defences:"]).concat(dl):feats).join("\n");
    setT("Features and Traits",featText);setT("Feat+Traits",featText);
    var info=spellInfo();
    if(info){
      setT("Spellcasting Class 2",state.className);setT("SpellcastingAbility 2",F.abilityFields[info.ability]||info.ability);
      setT("SpellSaveDC  2",8+prof+abMod(totalScore(info.ability)));setT("SpellAtkBonus 2",modStr(prof+abMod(totalScore(info.ability))));
      var sl=info.sc.slots;
      if(sl&&sl.type==="slots"){var row=sl.rows[state.level-1]||[];for(var L=1;L<=9;L++)if(row[L-1])setT("SlotsTotal "+(18+L),row[L-1]);}
      else if(sl&&sl.type==="pact"){var pc=sl.count[state.level-1]||0,plv=sl.level[state.level-1]||0;if(pc)setT("SlotsTotal "+(18+plv),pc);}
      fillSpellNames(setT,"0",state.spells.cantrips.map(function(k){var s=spellByKey(k);return s?s.name:"";}));
      var byLvl={};state.spells.spells.forEach(function(k){var s=spellByKey(k);if(s)(byLvl[s.level]=byLvl[s.level]||[]).push(s.name);});
      for(var L2=1;L2<=9;L2++)if(byLvl[L2])fillSpellNames(setT,String(L2),byLvl[L2]);
    }
  }
  function fillSpellNames(setT,lvlKey,names){
    var fields=(window.CC_PDF_FIELDS.spellFields[lvlKey])||[];
    for(var i=0;i<names.length&&i<fields.length;i++)if(names[i])setT(fields[i],names[i]);
  }
  /* ---------- export tags ----------
     Every value the character-sheet template asks for, keyed by its tag name. Both the
     in-app PDF export and the PowerPoint pipeline (tools/cc_fetch.js) read this, so the
     printed sheet and the generated deck can never drift apart. */
  function exportTags(){
    var T={},i;
    function sign(n){return (n>=0?"+":"")+n;}
    function sg(a){return sign(abMod(totalScore(a)));}
    var AB=["Strength","Dexterity","Constitution","Intelligence","Wisdom","Charisma"],
        UP="ABCDEF",LO="abcdef";
    for(i=0;i<6;i++){T[UP.charAt(i)]=sg(AB[i]);T[LO.charAt(i)]=totalScore(AB[i]);}
    var prof=profBonus(),bg=currentBg();
    T.character_name=state.name||"";
    T["class"]=state.className||"";
    T.subclass=state.subclassName||"";
    T.level=state.level;
    T.background=state.bgIsCustom?(state.bgCustomName||""):(bg?bg.name:"");
    T.species=speciesLabel();
    T.alignment=(state.details&&state.details.alignment)||"";
    T.AC=computeAC();
    T.PF="+"+prof;
    T.WS=speedText();
    T.MHP=maxHP();
    T.INI=sg("Dexterity");
    var conm=abMod(totalScore("Constitution"));
    T.HIT_DIE=state.level+"d"+state.hdFaces+(conm>=0?" + "+conm:" - "+(-conm));
    var dcAb=dcAbility();
    T.ability_dc=dcAb||"";
    T.a_dc=dcAb?abilitySaveDc():"";
    // saving throws and skills: a dot for proficiency, plus the total
    var sp=savingProfs(),KEYS=["str","dex","con","int","wis","cha"];
    for(i=0;i<6;i++){
      var pr=!!sp[AB[i]];
      T["st_"+KEYS[i]]=pr?"1":"0";
      T["stv_"+KEYS[i]]=sign(saveBonus(AB[i]));
    }
    var SK=[["a","Acrobatics"],["b","Animal Handling"],["c","Arcana"],["d","Athletics"],
            ["e","Deception"],["f","History"],["g","Insight"],["h","Intimidation"],
            ["i","Investigation"],["j","Medicine"],["k","Nature"],["l","Perception"],
            ["m","Performance"],["n","Persuasion"],["o","Religion"],["p","Sleight of Hand"],
            ["q","Stealth"],["r","Survival"]];
    var ps=proficientSkills();
    for(i=0;i<SK.length;i++){
      T["chk_"+SK[i][0]]=ps[SK[i][1]]?"1":"0";
      T["chkv_"+SK[i][0]]=sign(skillBonus(SK[i][1]));
    }
    T.senses=(sensesList()||[]).concat(["Passive Perception "+passiveScore("Perception")]).join("\n");
    var dl=defencesSummaryLines();
    T.defences=dl.length?dl.join("\n"):"-";
    var pf=(derivedState.fdata&&derivedState.fdata.proficiencies)||{},fg=featureGrants();
    function profLine(txt,key){
      var granted=(fg[key]||[]).concat(key==="tools"?featureToolPicks():[],featGrantsAll()[key]||[]);
      return plainTags(withFeatureProfs(txt||"None",granted));
    }
    T.prof_and_languages="Armor: "+profLine(pf.armor,"armor")+
      "\nWeapons: "+profLine(pf.weapons,"weapons")+
      "\nTools: "+profLine(pf.tools,"tools")+
      "\nLanguages: "+(languagesAll().join(", ")||"-");
    var inv=(state.equipment&&state.equipment.inventory)||[];
    T.items=inv.map(function(it){return it.name+(it.qty>1?" x"+it.qty:"")+(it.equipped?" (equipped)":"");}).join("\n");
    var cur=(state.equipment&&state.equipment.currency)||{};
    T.gp=cur.gp||0;T.sp=cur.sp||0;
    // action economy: the sheet's own attack rows, then the feature-driven lists
    var ae=actionEconomy();
    function names(list){return list.map(function(x){return x.name;});}
    var lines=["Attacks per Action: "+attacksPerAction()];
    attackRows().forEach(function(r){lines.push(r.name+"  "+r.hit+"  "+r.dmg+"  ("+(r.range||"-")+")");});
    var fa=names(ae.action);
    if(fa.length)lines=lines.concat([""],fa);
    T.actions=lines.join("\n");
    T.bonus_actions=names(ae.bonus).join("\n")||"-";
    T.reactions=names(ae.reaction).join("\n")||"-";   // spells included, see actionEconomy
    T.other_actions=names(ae.attack).map(function(n){return "On hit: "+n;}).join("\n")||"-";
    // features & traits, exactly as the sheet's expanded card shows them
    var blocks=featureCards().map(function(c){
      var body=entryPlain(c.entries||[]).replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n");
      return c.name+(c.origin?"  ["+c.origin+"]":"")+(body?"\n"+body:"");
    });
    if(dl.length)blocks.push("Defences\n"+dl.join("\n"));
    T.features_and_traits=blocks.join("\n\n");
    // spells, grouped by level, with the slots available at this level
    var info=spellInfo(),byLvl={};
    for(i=0;i<=9;i++)byLvl[i]=[];
    if(info){
      [].concat((state.spells&&state.spells.cantrips)||[],(state.spells&&state.spells.spells)||[]).forEach(function(k){
        var s=spellByKey(k);
        if(!s){byLvl[0].push(String(k).split("|")[0]);return;}
        function pt(x){return plainTags(String(x||"-"));}
        var meta=["Cast: "+pt(s.time),"Range: "+pt(s.range),
                  "Components: "+pt(s.compFull||s.comp),"Duration: "+pt(s.duration)].join("   /   ");
        var flags=[];
        if(s.conc)flags.push("Concentration");
        if(s.ritual)flags.push("Ritual");
        if(s.save)flags.push("Save: "+s.save);
        if(s.atk)flags.push("Attack roll");
        var desc=entryPlain(s.entries||[]).replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n");
        var hi=(s.higher&&s.higher.length)?entryPlain(s.higher).replace(/[ \t]+/g," "):"";
        var out=[s.name+"  ("+(s.school||"")+(s.level===0?" cantrip":"")+")"+(flags.length?"  - "+flags.join(", "):""),meta];
        if(desc)out.push(desc);
        if(hi)out.push("At Higher Levels: "+hi);
        byLvl[s.level].push(out.join("\n"));
      });
    }
    T.spell_list_cantrips=byLvl[0].join("\n\n");
    for(i=1;i<=9;i++)T["spell_list_level"+i]=byLvl[i].join("\n\n");
    var slots={};
    if(info&&info.sc&&info.sc.slots){
      var sl=info.sc.slots;
      if(sl.type==="slots"){
        var row=sl.rows[state.level-1]||[];
        for(i=1;i<=9;i++)if(row[i-1])slots[i]=row[i-1];
      }else if(sl.type==="pact"){
        var pc=sl.count[state.level-1]||0,plv=sl.level[state.level-1]||0;
        if(pc)slots[plv]=pc;
      }
    }
    for(i=1;i<=9;i++)T["nbr_of_available_level_"+i+"_slots"]=slots[i]||"";
    return T;
  }
  /* Fill the sheet built from the PowerPoint template. Each form field carries a small
     text template ("ACTIONS\n{actions}\n\nBONUS ACTIONS\n{bonus_actions}"), so headings
     and values land together in one box. */
  function fillSheetForm(form){
    var F=window.CC_SHEET_FIELDS,T=exportTags(),name;
    for(name in F){
      var spec=F[name];
      if(spec.cb){
        try{if(T[spec.tags[0]]==="1")form.getCheckBox(name).check();else form.getCheckBox(name).uncheck();}catch(e){}
        continue;
      }
      var txt=String(spec.t).replace(/\{([A-Za-z_0-9]+)\}/g,function(m,tag){
        return T.hasOwnProperty(tag)?String(T[tag]):"";
      });
      try{
        var fld=form.getTextField(name);
        if(spec.ml){try{fld.enableMultiline();}catch(e){}}
        try{fld.setAlignment(spec.q===1?1:(spec.q===2?2:0));}catch(e){}
        fld.setText(txt);
      }catch(e){}
    }
  }
  /* ---------- printable sheet ----------
     Opens a plain, self-contained page holding everything the character has - the stats,
     the attack table, every spell and every feature in full - and asks the browser to
     print it. The browser paginates and can "Save as PDF", which beats filling a
     fixed-size form: nothing is clipped and the text stays selectable. */
  var PRINT_CSS=
    "@page{size:A4;margin:11mm}"+
    "*{box-sizing:border-box}"+
    "body{font:10pt/1.35 'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111;margin:0}"+
    "h1{font-size:20pt;margin:0 0 2px}"+
    ".sub{color:#555;font-size:10pt;margin-bottom:10px}"+
    "h2{font-size:10pt;text-transform:uppercase;letter-spacing:.06em;color:#a50d24;"+
      "border-bottom:1px solid #d8d0c2;margin:14px 0 7px;padding-bottom:3px;"+
      "page-break-after:avoid;break-after:avoid}"+
    ".phead{display:flex;gap:14px;align-items:center;margin-bottom:2px}"+
    ".phead>div{min-width:0}"+
    ".phead img{width:86px;height:86px;flex:0 0 86px;object-fit:cover;border-radius:8px;"+
      "border:1px solid #d8d0c2}"+
    ".tiles{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}"+
    ".tile{border:1px solid #d8d0c2;border-radius:6px;padding:5px 9px;min-width:62px;text-align:center}"+
    ".tile b{display:block;font-size:7.5pt;text-transform:uppercase;letter-spacing:.05em;color:#666;font-weight:700}"+
    ".tile span{font-size:13pt;font-weight:700}"+
    ".cols{display:flex;gap:14px;align-items:flex-start}"+
    ".cols>div{flex:1;min-width:0}"+
    "table{border-collapse:collapse;width:100%;font-size:9pt}"+
    "th,td{border:1px solid #ddd;padding:2px 5px;text-align:left}"+
    "th{background:#f2efe9;font-size:7.5pt;text-transform:uppercase;letter-spacing:.04em;color:#555}"+
    "td.n{text-align:center;width:44px}"+
    ".kv{font-size:9pt;margin:0 0 6px}"+
    ".kv b{display:block;font-size:7.5pt;text-transform:uppercase;letter-spacing:.05em;color:#666}"+
    ".blk{margin:0 0 9px;page-break-inside:avoid;break-inside:avoid}"+
    ".blk h3{font-size:10pt;margin:0 0 2px}"+
    ".blk .org{font-size:8pt;color:#777;font-style:italic;margin-bottom:2px}"+
    ".blk p{margin:0 0 4px}.blk ul{margin:0 0 4px;padding-left:16px}"+
    ".meta{font-size:8.5pt;color:#444;margin:0 0 3px}"+
    ".sub-h{font-weight:700}.tag-dmg{font-weight:700}.tag-roll{font-weight:700}"+
    ".tag-link{color:inherit}.tag-note{color:#666;font-style:italic}"+
    ".lvl{font-size:9pt;font-weight:700;margin:9px 0 4px;color:#333;"+
      "page-break-after:avoid;break-after:avoid}"+
    ".none{color:#777;font-style:italic}";

  function printSheet(){
    if(!state.className){alert("Build a character first.");return;}
    var w=window.open("","_blank");
    if(!w){alert("The print view was blocked. Allow pop-ups for this page and try again.");return;}
    w.document.open();w.document.write(printSheetHtml(true));w.document.close();
  }
  // the whole printable document as a string, so it can be checked without a browser
  function printSheetHtml(autoPrint){
    var T=exportTags(),prof=profBonus();
    function esc2(s){return esc(String(s==null?"":s));}
    function lines(txt){                      // plain multi-line value -> HTML
      var v=String(txt==null?"":txt);
      if(!v||v==="-")return '<span class="none">None</span>';
      return esc2(v).replace(/\n/g,"<br>");
    }
    var h="";
    var bits=[state.className+(state.subclassName?" ("+state.subclassName+")":"")+" "+state.level,
              T.species,T.background,T.alignment].filter(function(x){return x;});
    // the portrait, when the character has one, sits beside the name
    var head="<h1>"+esc2(state.name||"Unnamed")+"</h1>"+
             '<div class="sub">'+esc2(bits.join("  ·  "))+"</div>";
    h+=state.portrait
      ? '<div class="phead"><img src="'+esc(state.portrait)+'" alt=""><div>'+head+"</div></div>"
      : head;
    // headline numbers
    var tiles=[["AC",T.AC],["Hit Points",T.MHP],["Speed",T.WS],["Initiative",T.INI],
               ["Prof. Bonus",T.PF],["Hit Dice",T.HIT_DIE]];
    if(T.ability_dc)tiles.push([T.ability_dc+" Save DC",T.a_dc]);
    h+='<div class="tiles">'+tiles.map(function(t){
      return '<div class="tile"><b>'+esc2(t[0])+"</b><span>"+esc2(t[1])+"</span></div>";
    }).join("")+"</div>";
    // abilities + saves, and skills, side by side
    var AB=["Strength","Dexterity","Constitution","Intelligence","Wisdom","Charisma"],
        KEYS=["str","dex","con","int","wis","cha"],UP="ABCDEF",LO="abcdef";
    var abRows="";
    for(var i=0;i<6;i++){
      abRows+="<tr><td>"+AB[i]+'</td><td class="n">'+esc2(T[LO.charAt(i)])+'</td><td class="n">'+esc2(T[UP.charAt(i)])+
              '</td><td class="n">'+esc2(T["stv_"+KEYS[i]])+(T["st_"+KEYS[i]]==="1"?" ●":"")+"</td></tr>";
    }
    var SK=[["a","Acrobatics"],["b","Animal Handling"],["c","Arcana"],["d","Athletics"],["e","Deception"],
            ["f","History"],["g","Insight"],["h","Intimidation"],["i","Investigation"],["j","Medicine"],
            ["k","Nature"],["l","Perception"],["m","Performance"],["n","Persuasion"],["o","Religion"],
            ["p","Sleight of Hand"],["q","Stealth"],["r","Survival"]];
    var skRows=SK.map(function(s){
      return "<tr><td>"+s[1]+'</td><td class="n">'+esc2(T["chkv_"+s[0]])+(T["chk_"+s[0]]==="1"?" ●":"")+"</td></tr>";
    }).join("");
    h+='<div class="cols"><div>';
    h+="<h2>Abilities &amp; Saves</h2><table><tr><th>Ability</th><th>Score</th><th>Mod</th><th>Save</th></tr>"+abRows+"</table>";
    h+='<h2>Senses</h2><p class="kv">'+lines(T.senses)+"</p>";
    h+='<h2>Defences</h2><p class="kv">'+lines(T.defences)+"</p>";
    h+="</div><div>";
    h+="<h2>Skills</h2><table><tr><th>Skill</th><th>Bonus</th></tr>"+skRows+"</table>";
    h+="</div><div>";
    h+='<h2>Proficiencies &amp; Languages</h2><p class="kv">'+lines(T.prof_and_languages)+"</p>";
    h+='<h2>Equipment</h2><p class="kv">'+lines(T.items)+"</p>";
    h+='<p class="kv"><b>Currency</b>'+esc2(T.gp)+" gp, "+esc2(T.sp)+" sp</p>";
    h+="</div></div>";
    // actions: the same attack rows the sheet shows, then the feature-driven lists
    h+="<h2>Actions</h2>";
    var rows=attackRows();
    if(rows.length){
      h+="<p class=\"meta\">Attacks per Action: <b>"+attacksPerAction()+"</b></p>";
      h+="<table><tr><th>Attack</th><th>Range</th><th>Hit / DC</th><th>Damage</th><th>Notes</th></tr>"+
        rows.map(function(r){
          return "<tr><td>"+esc2(r.name)+(r.sub?' <span class="tag-note">'+esc2(r.sub)+"</span>":"")+
            "</td><td>"+esc2(r.range||"—")+"</td><td>"+esc2(r.hit)+"</td><td>"+esc2(r.dmg)+
            "</td><td>"+esc2(r.notes||"")+"</td></tr>";
        }).join("")+"</table>";
    }
    var ae=actionEconomy();
    function aeList(title,list){
      if(!list.length)return "";
      return '<p class="kv"><b>'+title+"</b>"+list.map(function(x){return esc2(x.name);}).join(", ")+"</p>";
    }
    h+='<div style="margin-top:6px">'+aeList("Other actions",ae.action)+aeList("Bonus actions",ae.bonus)+
       aeList("Reactions",ae.reaction)+aeList("On a hit",ae.attack)+"</div>";
    if(T.reactions&&T.reactions!=="-")h+='<p class="kv"><b>Reactions (incl. spells)</b>'+lines(T.reactions)+"</p>";
    // spells, in full, grouped by level
    var info=spellInfo();
    if(info){
      h+="<h2>Spells</h2>";
      h+='<p class="meta">'+esc2(state.className)+" · "+esc2(info.ability)+" · save DC "+
         (8+prof+abMod(totalScore(info.ability)))+" · attack "+modStr(prof+abMod(totalScore(info.ability)))+"</p>";
      var byL={},any=false;
      [].concat(state.spells.cantrips||[],state.spells.spells||[]).forEach(function(k){
        var s=spellByKey(k);if(!s)return;
        (byL[s.level]=byL[s.level]||[]).push(s);any=true;
      });
      if(!any)h+='<p class="none">No spells chosen.</p>';
      for(var L=0;L<=9;L++){
        if(!byL[L])continue;
        var slot=L>0?T["nbr_of_available_level_"+L+"_slots"]:"";
        h+='<div class="lvl">'+(L===0?"Cantrips":ordinal(L)+"-level spells")+(slot?"  —  "+esc2(slot)+" slots":"")+"</div>";
        byL[L].forEach(function(s){
          var flags=[];
          if(s.conc)flags.push("Concentration");
          if(s.ritual)flags.push("Ritual");
          h+='<div class="blk"><h3>'+esc2(s.name)+"</h3>";
          h+='<div class="meta">'+esc2((s.school||"")+(flags.length?" · "+flags.join(", "):""))+"</div>";
          h+='<div class="meta">'+renderTags("{@b Casting Time:} "+(s.time||"—")+"  ·  {@b Range:} "+(s.range||"—")+
             "  ·  {@b Components:} "+(s.compFull||"—")+"  ·  {@b Duration:} "+(s.duration||"—"))+"</div>";
          h+=(s.entries||[]).map(renderEntry).join("");
          if(s.higher&&s.higher.length)h+=renderEntry({type:"entries",name:"At Higher Levels",entries:s.higher});
          h+="</div>";
        });
      }
    }
    // every feature and trait, in full
    h+="<h2>Features &amp; Traits</h2>";
    featureCards().forEach(function(c){
      h+='<div class="blk"><h3>'+esc2(c.name)+"</h3>"+
         (c.origin?'<div class="org">'+esc2(c.origin)+"</div>":"")+
         (c.entries||[]).map(renderEntry).join("")+"</div>";
    });
    return "<!doctype html><html><head><meta charset=\"utf-8\"><title>"+
      esc2(state.name||"Character")+" — Character Sheet</title><style>"+PRINT_CSS+"</style></head><body>"+
      h+(autoPrint?"<script>window.onload=function(){setTimeout(function(){window.print();},250);};<\/script>":"")+
      "</body></html>";
  }

  function exportPdf(){
    if(!window.PDFLib){alert("pdf-lib is missing.\n\nDownload pdf-lib.min.js into resources/ (see README).");return;}
    // the sheet built from character_creator_template.pptx, falling back to the WotC form
    var ownSheet=!!(window.CC_SHEET_TEMPLATE&&window.CC_SHEET_FIELDS);
    if(!ownSheet&&!window.CC_PDF_TEMPLATE){alert("No PDF sheet template found.\n\nRun:\n  python tools/cc_make_pdf_template.py");return;}
    if(!state.className){alert("Build a character first.");return;}
    var btn=$("pdfBtn");btn.classList.add("busy");btn.disabled=true;
    function done(){btn.classList.remove("busy");btn.disabled=false;}
    PDFLib.PDFDocument.load(base64ToBytes(ownSheet?window.CC_SHEET_TEMPLATE:window.CC_PDF_TEMPLATE)).then(function(doc){
      if(ownSheet)fillSheetForm(doc.getForm());else fillPdfForm(doc.getForm());
      try{doc.getForm().updateFieldAppearances();}catch(e){}
      if(state.portrait){
        return doc.embedPng(state.portrait).then(function(png){
          try{doc.getForm().getButton("CHARACTER IMAGE").setImage(png);}catch(e){}
          return doc.save();
        })["catch"](function(){return doc.save();});
      }
      return doc.save();
    }).then(function(out){
      downloadBlob(out,(state.name||"character").replace(/[^\w \-]/g,"")+".pdf","application/pdf");done();
    })["catch"](function(e){alert("PDF export failed: "+(e.message||e));done();});
  }

  function ordinal(n){var s=["th","st","nd","rd"],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0]);}

  function uiContext(pure){return {character:state,ui:uiState,derived:derivedState,window:window,document:document,
    actions:{chooseEdition:chooseEdition,home:returnHome,save:saveChar,load:function(){loadViaPicker("fileLoadStart");},print:printSheet,invalidateLoads:function(){featureLoadGeneration++;},refreshLibrary:function(){if(serverLibrary)serverLibrary.refresh();},alert:function(message){alert(message);},confirm:function(message){return confirm(message);}},adapters:{
      autoHp:autoHp,isSidekickClass:isSidekickClass,spellPresentation:spellPresentation,resourceView:resourceView,shortRestNames:shortRestNames,
      abMod:function(){return abMod.apply(null,arguments);},
      abilityBonusMap:function(){return abilityBonusMap.apply(null,arguments);},
      abilitySaveDc:function(){return abilitySaveDc.apply(null,arguments);},
      acBreakdown:function(){return acBreakdown.apply(null,arguments);},
      acInfo:function(){return acInfo.apply(null,arguments);},
      actionEconomy:function(){return actionEconomy.apply(null,arguments);},
      addByName:function(){return addByName.apply(null,arguments);},
      addItemObj:function(){return addItemObj.apply(null,arguments);},
      allRacialSpells:function(){return allRacialSpells.apply(null,arguments);},
      asiChoiceHtml:function(){return asiChoiceHtml.apply(null,arguments);},
      asiResolved:function(){return asiResolved.apply(null,arguments);},
      attackRows:function(){return attackRows.apply(null,arguments);},
      attacksPerAction:function(){return attacksPerAction.apply(null,arguments);},
      attuneNote:function(){return attuneNote.apply(null,arguments);},
      attunedCount:function(){return attunedCount.apply(null,arguments);},
      baseArmorsFor:function(){return baseArmorsFor.apply(null,arguments);},
      baseScore:function(){return baseScore.apply(null,arguments);},
      baseWeaponsFor:function(){return baseWeaponsFor.apply(null,arguments);},
      bgProficienciesHtml:function(){return bgProficienciesHtml.apply(null,arguments);},
      bonusSum:function(){return bonusSum.apply(null,arguments);},
      capital:function(){return capital.apply(null,arguments);},
      choiceSelectsHtml:function(){return choiceSelectsHtml.apply(null,arguments);},
      classOptions:function(){return classOptions.apply(null,arguments);},
      classSpellList:function(){return classSpellList.apply(null,arguments);},
      computeAC:function(){return computeAC.apply(null,arguments);},
      concOptions:function(){return concOptions.apply(null,arguments);},
      concSpell:function(){return concSpell.apply(null,arguments);},
      currencyGP:function(){return currencyGP.apply(null,arguments);},
      currentBg:function(){return currentBg.apply(null,arguments);},
      currentLineage:function(){return currentLineage.apply(null,arguments);},
      currentRace:function(){return currentRace.apply(null,arguments);},
      customAsiHtml:function(){return customAsiHtml.apply(null,arguments);},
      customAsiPending:function(){return customAsiPending.apply(null,arguments);},
      dcAbility:function(){return dcAbility.apply(null,arguments);},
      defences:function(){return defences.apply(null,arguments);},
      defencesHtml:function(){return defencesHtml.apply(null,arguments);},
      dmgAbbr:function(){return dmgAbbr.apply(null,arguments);},
      entryText:function(){return entryText.apply(null,arguments);},
      equipInfo:function(){return equipInfo.apply(null,arguments);},
      esc:function(){return esc.apply(null,arguments);},
      expertiseHtml:function(){return expertiseHtml.apply(null,arguments);},
      expertiseSkills:function(){return expertiseSkills.apply(null,arguments);},
      featGrantsAll:function(){return featGrantsAll.apply(null,arguments);},
      featResourceBonus:function(){return featResourceBonus.apply(null,arguments);},
      featureCards:function(){return featureCards.apply(null,arguments);},
      featureGrants:function(){return featureGrants.apply(null,arguments);},
      featureProfChoiceHtml:function(){return featureProfChoiceHtml.apply(null,arguments);},
      featureSkillHtml:function(){return featureSkillHtml.apply(null,arguments);},
      featureToolPicks:function(){return featureToolPicks.apply(null,arguments);},
      freshView:function(){return freshView.apply(null,arguments);},
      fxActive:function(){return fxActive.apply(null,arguments);},
      fxAvailable:function(){return fxAvailable.apply(null,arguments);},
      fxIsOn:function(){return fxIsOn.apply(null,arguments);},
      groupFilled:function(){return groupFilled.apply(null,arguments);},
      hitPointsBody:function(){return hitPointsBody.apply(null,arguments);},
      initWhy:function(){return initWhy.apply(null,arguments);},
      isVariantArmor:function(){return isVariantArmor.apply(null,arguments);},
      isVariantWeapon:function(){return isVariantWeapon.apply(null,arguments);},
      itemAllowed:function(){return itemAllowed.apply(null,arguments);},
      itemAttune:function(){return itemAttune.apply(null,arguments);},
      itemBonuses:function(){return itemBonuses.apply(null,arguments);},
      itemEffectsHtml:function(){return itemEffectsHtml.apply(null,arguments);},
      itemEntriesFull:function(){return itemEntriesFull.apply(null,arguments);},
      itemInfo:function(){return itemInfo.apply(null,arguments);},
      langPool:function(){return langPool.apply(null,arguments);},
      languagesAll:function(){return languagesAll.apply(null,arguments);},
      longRest:function(){return longRest.apply(null,arguments);},
      maxHP:function(){return maxHP.apply(null,arguments);},
      mergedLanguages:function(){return mergedLanguages.apply(null,arguments);},
      modStr:function(){return modStr.apply(null,arguments);},
      needsCustomAsi:function(){return needsCustomAsi.apply(null,arguments);},
      officialLanguages:function(){return officialLanguages.apply(null,arguments);},
      optEnabled:function(){return optEnabled.apply(null,arguments);},
      optKey:function(){return optKey.apply(null,arguments);},
      optProgMap:function(){return optProgMap.apply(null,arguments);},
      ordinal:function(){return ordinal.apply(null,arguments);},
      originPickerHtml:function(){return originPickerHtml.apply(null,arguments);},
      originShort:function(){return originShort.apply(null,arguments);},
      orphanProgressions:function(){return orphanProgressions.apply(null,arguments);},
      passiveScore:function(){return passiveScore.apply(null,arguments);},
      pbRemaining:function(){return pbRemaining.apply(null,arguments);},
      plainTags:function(){return plainTags.apply(null,arguments);},
      profBlock:function(){return profBlock.apply(null,arguments);},
      profBonus:function(){return profBonus.apply(null,arguments);},
      profWhy:function(){return profWhy.apply(null,arguments);},
      proficienciesBody:function(){return proficienciesBody.apply(null,arguments);},
      proficientSkills:function(){return proficientSkills.apply(null,arguments);},
      progAt:function(){return progAt.apply(null,arguments);},
      pruneChoices:function(){return pruneChoices.apply(null,arguments);},
      raceChoiceCount:function(){return raceChoiceCount.apply(null,arguments);},
      raceFeatHtml:function(){return raceFeatHtml.apply(null,arguments);},
      raceFeatPending:function(){return raceFeatPending.apply(null,arguments);},
      raceSelectHtml:function(){return raceSelectHtml.apply(null,arguments);},
      render:function(){return (pure?render:renderAfterChange).apply(null,arguments);},
      renderEntry:function(){return renderEntry.apply(null,arguments);},
      renderRecents:function(){return renderRecents.apply(null,arguments);},
      renderTags:function(){return renderTags.apply(null,arguments);},
      resolveArmor:function(){return resolveArmor.apply(null,arguments);},
      rollDiceStr:function(){return rollDiceStr.apply(null,arguments);},
      rollSix:function(){return rollSix.apply(null,arguments);},
      saveBonus:function(){return saveBonus.apply(null,arguments);},
      savingProfs:function(){return savingProfs.apply(null,arguments);},
      sensesList:function(){return sensesList.apply(null,arguments);},
      shCard:function(){return shCard.apply(null,arguments);},
      shortRest:function(){return shortRest.apply(null,arguments);},
      sidekickRole:function(){return sidekickRole.apply(null,arguments);},
      sidekickRoleHtml:function(){return sidekickRoleHtml.apply(null,arguments);},
      skillAdvantage:function(){return skillAdvantage.apply(null,arguments);},
      skillBonus:function(){return skillBonus.apply(null,arguments);},
      sourceName:function(){return sourceName.apply(null,arguments);},
      spKey:function(){return spKey.apply(null,arguments);},
      speciesLabel:function(){return speciesLabel.apply(null,arguments);},
      speedText:function(){return speedText.apply(null,arguments);},
      speedWhy:function(){return speedWhy.apply(null,arguments);},
      spellByKey:function(){return spellByKey.apply(null,arguments);},
      spellByName:function(){return spellByName.apply(null,arguments);},
      spellInfo:function(){return spellInfo.apply(null,arguments);},
      spellItems:function(){return spellItems.apply(null,arguments);},
      spellPicksAll:function(){return spellPicksAll.apply(null,arguments);},
      srcTag:function(){return srcTag.apply(null,arguments);},
      stripOptions:function(){return stripOptions.apply(null,arguments);},
      tableChoiceCfg:function(){return tableChoiceCfg.apply(null,arguments);},
      tableChoiceHtml:function(){return tableChoiceHtml.apply(null,arguments);},
      topStat:function(){return topStat.apply(null,arguments);},
      totalScore:function(){return totalScore.apply(null,arguments);},
      withFeatureProfs:function(){return withFeatureProfs.apply(null,arguments);}
    },constants:{ABILITIES:ABILITIES,ABIL_ABBR:ABIL_ABBR,ALIGNMENTS:ALIGNMENTS,ALL:ALL,ALL_SKILLS:ALL_SKILLS,CONDITION_INFO:CONDITION_INFO,ICON:ICON,ITEM_TYPES:ITEM_TYPES,LIFESTYLES:LIFESTYLES,POINT_BUY_COST:POINT_BUY_COST,SKILL_ABILITY:SKILL_ABILITY,STANDARD_ARRAY:STANDARD_ARRAY}};}
  function initializeUI(){
    ruleTextUI=window.CCRuleTextUI.create(uiContext());
    creatorUI=window.CCCreatorUI.create(uiContext());
    sheetUI=window.CCCharacterSheetUI.create(uiContext());
    navigationUI=window.CCNavigationUI.create(uiContext(true));
    navigationUI.mount();
  }
  initializeUI();

  /* ---------- events ---------- */
  function chooseEdition(ed){
      if(serverLibrary&&!serverLibrary.canLeave())return;
      resetCharacter();                      // always start an edition with a clean slate
      state.edition=ed;
      $("editionTag").textContent=editionLabel(ed);
      populateClasses();populateBackgrounds();populateRaces();
      showBuild();renderAfterChange();
  }
  function returnHome(){
    if(serverLibrary&&!serverLibrary.canLeave())return;
    resetCharacter();                       // "start over" must forget the loaded/built character
    $("stepsMenu").classList.remove("open");
    showEdition();
  }
  $("charName").addEventListener("input",function(e){state.name=e.target.value;});
  $("charPortrait").addEventListener("click",function(){$("portraitFile").click();});
  $("portraitFile").addEventListener("change",function(e){if(e.target.files&&e.target.files[0])processPortrait(e.target.files[0]);e.target.value="";});

  $("classSelect").addEventListener("change",function(e){
    featureLoadGeneration++;
    var slug=e.target.value;
    if(!slug){state.className=null;state.slug=null;derivedState.fdata=null;renderAfterChange();return;}
    var c=classesForEdition(state.edition).filter(function(x){return x.slug===slug;})[0];
    state.className=c.name;state.source=c.source;state.slug=slug;
    /* A sidekick is an existing creature gaining class levels, so its hit die comes from
       its own stat block rather than the class. Default to d8, a Medium creature, and let
       it be changed below. */
    state.hdFaces=c.hdFaces||(c.isSidekick?8:null);
    state.manualHp=null;state.subclassName=null;derivedState.fdata=null;state.choices={};uiState.openPanels={};
    state.equipment.starting={};state.equipment.startingAdded=false;
    state.spells={cantrips:[],spells:[]};uiState.spells=freshView().spells;
    state.sheet=freshSheet();
    populateLevels();
    $("featTitle").textContent=c.name+" Features";
    loadSelectedFeatureData(slug,function(fd){derivedState.fdata=fd;renderAfterChange();});
    renderAfterChange();
  });
  $("levelSelect").addEventListener("change",function(e){
    var old=state.level;state.level=parseInt(e.target.value,10)||1;
    if(state.manualHp!=null&&state.hdFaces){
      var per=Math.floor(state.hdFaces/2)+1;
      state.manualHp=Math.max(1,state.manualHp+per*(state.level-old));
    }
    if(state.level<old)pruneChoices();
    pruneSpells();
    renderAfterChange();
  });

  $("manageHpBtn").addEventListener("click",function(){
    if(!state.className)return;
    var row=$("hpEditRow"),opening=row.classList.contains("hidden");
    row.classList.toggle("hidden");
    if(opening){$("hpInput").value=(state.manualHp!=null)?state.manualHp:autoHp(state.hdFaces,state.level);$("hpInput").focus();}
  });
  $("hpSave").addEventListener("click",function(){var v=parseInt($("hpInput").value,10);if(!isNaN(v)&&v>0)state.manualHp=v;$("hpEditRow").classList.add("hidden");renderAfterChange();});
  $("hpReset").addEventListener("click",function(){state.manualHp=null;$("hpEditRow").classList.add("hidden");renderAfterChange();});

  $("expandAll").addEventListener("click",function(){Array.prototype.forEach.call($("featureList").querySelectorAll(".feature"),function(f){f.classList.remove("collapsed");});});
  $("collapseAll").addEventListener("click",function(){Array.prototype.forEach.call($("featureList").querySelectorAll(".feature"),function(f){f.classList.add("collapsed");});});

  $("raceSelect").addEventListener("change",function(e){
    var v=e.target.value;state.raceChoices={};
    if(!v){state.race=null;state.raceLineage=null;}
    else{var p=v.split("|");state.race={name:p[0],source:p[1]};state.raceLineage=p[2]||null;}
    renderAfterChange();
  });
  $("fileLoadStart").addEventListener("change",function(e){if(e.target.files&&e.target.files[0])loadCharFile(e.target.files[0]);e.target.value="";});
  $("abilityMethod").addEventListener("change",function(e){
    state.abilities.method=e.target.value;
    state.abilities.assign={};state.abilities.rolled=null;
    renderAbilities();
  });

  // background events
  $("bgSelect").addEventListener("change",function(e){
    var v=e.target.value;
    state.bgChoices={};
    if(v==="custom"){state.bgIsCustom=true;state.background=null;}
    else if(!v){state.bgIsCustom=false;state.background=null;}
    else{state.bgIsCustom=false;var p=v.split("|");state.background={name:p[0],source:p[1]};}
    renderAfterChange();
  });
  $("bgCustomName").addEventListener("input",function(e){state.bgCustomName=e.target.value;});
  $("bgCustomDesc").addEventListener("input",function(e){state.bgCustomDesc=e.target.value;});

  // The resources/data-*.js files are generated from a local 5etools mirror and are not
  // distributed with the source. Explain that instead of showing an empty, broken UI.
  function dataMissing(){
    return !(window.CC_CLASSES&&window.CC_CLASSES.length)||!(window.CC_SPELLS&&window.CC_SPELLS.length);
  }
  if(dataMissing()){
    var w=document.querySelector(".wrap");
    if(w)w.innerHTML='<div class="data-missing">'+
      '<h1>Game data not found</h1>'+
      '<p>This is the source-only copy of the Character Creator. The game data files '+
      '(<code>resources/data-*.js</code>) are generated from your own local '+
      '<a href="https://5e.tools" target="_blank" rel="noopener">5etools</a> data mirror and are '+
      'not redistributed here, because they contain Dungeons&nbsp;&amp;&nbsp;Dragons content '+
      'owned by Wizards of the Coast.</p>'+
      '<p>Get 5etools from <a href="https://5e.tools/index.html" target="_blank" rel="noopener">5e.tools</a>, '+
      'then point the generator at its <code>data</code> folder:</p>'+
      '<pre>python tools/regen_all.py "path/to/5etools/data"</pre>'+
      '<p>See the <code>README.md</code> for details, then reload this page.</p>'+
      '</div>';
    return;
  }
  initServerLibrary();
  populateLevels();showEdition();showDataVersion();
})();
