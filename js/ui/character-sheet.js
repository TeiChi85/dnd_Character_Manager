(function(root){
  "use strict";
  function create(context){
    var state=context.character,uiState=context.ui,derivedState=context.derived;
    var spellPresentation=context.adapters.spellPresentation,resourceView=context.adapters.resourceView,shortRestNames=context.adapters.shortRestNames;
    var window=context.window,document=context.document;
    var alert=context.actions.alert,confirm=context.actions.confirm;
    function $(id){return document.getElementById(id);}
    var abMod=context.adapters.abMod;
    var abilitySaveDc=context.adapters.abilitySaveDc;
    var acBreakdown=context.adapters.acBreakdown;
    var acInfo=context.adapters.acInfo;
    var actionEconomy=context.adapters.actionEconomy;
    var addItemObj=context.adapters.addItemObj;
    var allRacialSpells=context.adapters.allRacialSpells;
    var attackRows=context.adapters.attackRows;
    var attacksPerAction=context.adapters.attacksPerAction;
    var attuneNote=context.adapters.attuneNote;
    var attunedCount=context.adapters.attunedCount;
    var baseArmorsFor=context.adapters.baseArmorsFor;
    var baseWeaponsFor=context.adapters.baseWeaponsFor;
    var classOptions=context.adapters.classOptions;
    var computeAC=context.adapters.computeAC;
    var concOptions=context.adapters.concOptions;
    var concSpell=context.adapters.concSpell;
    var currencyGP=context.adapters.currencyGP;
    var currentBg=context.adapters.currentBg;
    var currentLineage=context.adapters.currentLineage;
    var currentRace=context.adapters.currentRace;
    var dcAbility=context.adapters.dcAbility;
    var defences=context.adapters.defences;
    var defencesHtml=context.adapters.defencesHtml;
    var dmgAbbr=context.adapters.dmgAbbr;
    var equipInfo=context.adapters.equipInfo;
    var esc=context.adapters.esc;
    var expertiseSkills=context.adapters.expertiseSkills;
    var featGrantsAll=context.adapters.featGrantsAll;
    var featResourceBonus=context.adapters.featResourceBonus;
    var featureCards=context.adapters.featureCards;
    var featureGrants=context.adapters.featureGrants;
    var featureToolPicks=context.adapters.featureToolPicks;
    var fxActive=context.adapters.fxActive;
    var fxAvailable=context.adapters.fxAvailable;
    var fxIsOn=context.adapters.fxIsOn;
    var initWhy=context.adapters.initWhy;
    var isVariantArmor=context.adapters.isVariantArmor;
    var isVariantWeapon=context.adapters.isVariantWeapon;
    var itemAllowed=context.adapters.itemAllowed;
    var itemAttune=context.adapters.itemAttune;
    var itemEffectsHtml=context.adapters.itemEffectsHtml;
    var itemEntriesFull=context.adapters.itemEntriesFull;
    var itemInfo=context.adapters.itemInfo;
    var languagesAll=context.adapters.languagesAll;
    var longRest=context.adapters.longRest;
    var maxHP=context.adapters.maxHP;
    var modStr=context.adapters.modStr;
    var officialLanguages=context.adapters.officialLanguages;
    var originShort=context.adapters.originShort;
    var passiveScore=context.adapters.passiveScore;
    var profBlock=context.adapters.profBlock;
    var profBonus=context.adapters.profBonus;
    var profWhy=context.adapters.profWhy;
    var proficientSkills=context.adapters.proficientSkills;
    var render=context.adapters.render;
    var renderEntry=context.adapters.renderEntry;
    var resolveArmor=context.adapters.resolveArmor;
    var saveBonus=context.adapters.saveBonus;
    var savingProfs=context.adapters.savingProfs;
    var sensesList=context.adapters.sensesList;
    var shCard=context.adapters.shCard;
    var shortRest=context.adapters.shortRest;
    var skillAdvantage=context.adapters.skillAdvantage;
    var skillBonus=context.adapters.skillBonus;
    var speciesLabel=context.adapters.speciesLabel;
    var speedText=context.adapters.speedText;
    var speedWhy=context.adapters.speedWhy;
    var spellByKey=context.adapters.spellByKey;
    var spellByName=context.adapters.spellByName;
    var spellInfo=context.adapters.spellInfo;
    var spellItems=context.adapters.spellItems;
    var srcTag=context.adapters.srcTag;
    var topStat=context.adapters.topStat;
    var totalScore=context.adapters.totalScore;
    var withFeatureProfs=context.adapters.withFeatureProfs;
    var ABILITIES=context.constants.ABILITIES;
    var ABIL_ABBR=context.constants.ABIL_ABBR;
    var ICON=context.constants.ICON;
    var SKILL_ABILITY=context.constants.SKILL_ABILITY;
  function acStatHtml(ac){
    var i=acInfo(),custom=i.overridden||(parseInt(state.sheet.acOther,10)||0);
    return '<div class="top-stat has-why ac-stat'+(custom?" ac-custom":"")+'" id="acStat" title="Armor Class: '+esc(acBreakdown())+'">'+
      '<div class="tv">'+ac+(custom?' <span class="ac-mark">&#9998;</span>':"")+'</div><div class="tl">Armor Class</div></div>';
  }
  function sheetCollapse(items,prefix,showOrigin){
    if(!items||!items.length)return '<span class="res-sub">None.</span>';
    return items.map(function(it,i){
      var d=(it.entries&&it.entries.length)?it.entries.map(renderEntry).join(""):'<p class="res-sub">No description.</p>';
      var why=it.origin?' title="'+esc(it.origin)+'"':"";
      var tag=(showOrigin&&it.origin)?'<span class="sc-src">'+esc(originShort(it.origin))+"</span>":"";
      var box=it.fx?'<span class="fx-box'+(fxIsOn(it.fx)?" on":"")+'" data-fx-set="'+esc(it.fx)+'" title="'+
                    esc(fxIsOn(it.fx)?"Active — click to end":"Click when you use this")+'"></span>':"";
      return '<div class="sc-item'+(it.fx&&fxIsOn(it.fx)?" fx-live":"")+'"><div class="sc-h'+(it.origin?" has-origin":"")+'"'+why+' data-tgt="'+prefix+i+'">'+box+esc(it.name)+tag+'<span class="sc-chev">&#9662;</span></div><div class="sc-d">'+d+"</div></div>";
    }).join("");
  }
  function actionsCardHtml(){
    // A row may carry its full rules text; when it does it gets a chevron and expands
    // in place, like the Bonus Actions list. The origin stays as the hover tooltip.
    function row(name,sub,range,hit,dmg,notes,why,desc){
      var has=desc&&desc.length;
      var h='<tr class="atk-row'+(has?" has-desc":"")+(why?" has-origin":"")+'"'+(why?' title="'+esc(why)+'"':"")+'><td><div class="atk-name">'+esc(name)+
        (has?' <span class="atk-chev">&#9662;</span>':"")+"</div>"+
        (sub?'<div class="atk-sub">'+esc(sub)+"</div>":"")+"</td><td>"+esc(range||"—")+
        '</td><td class="atk-hit">'+hit+"</td><td>"+esc(dmg)+'</td><td class="atk-notes">'+esc(notes||"")+"</td></tr>";
      if(has)h+='<tr class="atk-desc"><td colspan="5"><div class="atk-desc-in">'+desc.map(renderEntry).join("")+"</div></td></tr>";
      return h;
    }
    var rows=attackRows().map(function(r){return row(r.name,r.sub,r.range,r.hit,r.dmg,r.notes,r.why,r.desc);}).join("");
    var apa=attacksPerAction();
    var html='<div class="apa">Attacks per Action: <b>'+apa+"</b></div>";
    html+='<table class="atk-table"><thead><tr><th>Attack</th><th>Range</th><th>Hit / DC</th><th>Damage</th><th>Notes</th></tr></thead><tbody>'+rows+"</tbody></table>";
    var ae=actionEconomy();
    if(ae.attack.length)html+='<div class="ae-sec"><div class="ae-h">Attack Options (on a hit)</div>'+sheetCollapse(ae.attack,"ao",true)+"</div>";
    if(ae.action.length)html+='<div class="ae-sec"><div class="ae-h">Other Actions</div>'+sheetCollapse(ae.action,"oa",true)+"</div>";
    if(ae.bonus.length)html+='<div class="ae-sec"><div class="ae-h">Bonus Actions</div>'+sheetCollapse(ae.bonus,"ba",true)+"</div>";
    if(ae.reaction.length)html+='<div class="ae-sec"><div class="ae-h">Reactions</div>'+sheetCollapse(ae.reaction,"ra",true)+"</div>";
    html+='<div class="combat-actions"><div class="ca-h">Actions in Combat</div>Attack · Dash · Disengage · Dodge · Grapple · Help · Hide · Influence · Magic · Ready · Search · Shove · Utilize</div>';
    return html;
  }
  function fxBarHtml(){
    var on=fxActive(),cs=concSpell(),pills="";
    if(!on.length&&!cs)return "";
    on.forEach(function(e){
      var m=e.mods,what=[];
      if(!e.blocked){
        if(m.dmg)what.push("+"+m.dmg+" damage");
        if(m.dmgDice)what.push("+"+m.dmgDice+" damage");
        if(m.ac||m.acAbility)what.push("+"+(m.ac+(m.acAbility?abMod(totalScore(m.acAbility)):0))+" AC");
        if(m.speed)what.push("+"+m.speed+" ft. speed");
        if(m.resist.length)what.push("resist "+m.resist.join("/").toLowerCase());
        m.advAbility.forEach(function(a){what.push("adv. "+ABIL_ABBR[a]);});
      }else what.push("no benefit in heavy armour");
      pills+='<span class="fx-pill'+(e.blocked?" fx-blocked":"")+'" data-fx="'+esc(e.key)+'" title="'+
             esc((e.origin?e.origin+" — ":"")+"Click to end")+'">'+esc(e.name.toUpperCase())+
             (what.length?' <span class="fx-what">'+esc(what.join(" · "))+"</span>":"")+"</span>";
    });
    if(cs)pills+='<span class="fx-pill fx-conc" data-fx-conc="1" title="'+
      esc("Concentration ends if you cast another concentration spell, are incapacitated, or fail a Constitution save (DC 10, or half the damage taken, whichever is higher). Click to end")+
      '">CONCENTRATING <span class="fx-what">'+esc(cs.name)+"</span></span>";
    return '<div class="fx-bar">'+pills+"</div>";
  }
  function deathSavesHtml(){
    var s=state.sheet.deathSucc||0,f=state.sheet.deathFail||0;
    function dots(kind,n){var h="";for(var i=0;i<3;i++)h+='<span class="death-dot '+kind+(i<n?" on":"")+'" data-kind="'+kind+'" data-i="'+i+'"></span>';return h;}
    var note=(state.sheet.hpEdited&&state.sheet.hpCurrent<=0)?'<div class="death-note">You are at 0 HP — roll death saves!</div>':"";
    return note+'<div class="death-row"><span class="death-lbl">Successes</span>'+dots("succ",s)+'</div><div class="death-row"><span class="death-lbl">Failures</span>'+dots("fail",f)+"</div>";
  }
  function spellSlotsHtml(info){
    var sl=info&&info.sc.slots,html="";
    function line(lv,n,lbl){var pips="";for(var i=0;i<n;i++){var k="slot:"+lv+":"+i;pips+='<span class="pip'+(state.sheet.res[k]?" used":"")+'" data-k="'+k+'"></span>';}return '<div class="slot-line"><span class="slot-lvl">'+lbl+'</span><div class="pips">'+pips+"</div></div>";}
    if(sl&&sl.type==="slots"){var row=sl.rows[state.level-1]||[];for(var L=1;L<=9;L++){if(row[L-1])html+=line(L,row[L-1],"Lvl "+L);}}
    else if(sl&&sl.type==="pact"){var pc=sl.count[state.level-1]||0,plv=sl.level[state.level-1]||0;if(pc)html+=line(plv,pc,"Lvl "+plv+" (Pact)");}
    return html;
  }
  function renderInvResults(host){
    var box=host?host.querySelector("#invResults"):$("invResults");if(!box)return;
    var q=(uiState.sheet.invQ||"").toLowerCase();
    if(!q){box.innerHTML="";return;}
    var full=(window.CC_ITEMS||[]).filter(function(it){return itemAllowed(it)&&it.name.toLowerCase().indexOf(q)>=0;});
    var list=full.slice(0,150);
    var html=list.length?list.map(function(it){
      var full=itemEntriesFull(it),hasDesc=full.length;
      var desc=hasDesc?'<div class="inv-desc">'+full.map(renderEntry).join("")+"</div>":"";
      return '<div class="inv-res-item"><div class="inv-res-row"><span class="res-name-click">'+esc(it.name)+(hasDesc?' <span class="inv-chev">&#9662;</span>':"")+' <span class="meta">'+esc(it.cat+(it.rarity&&it.rarity!=="none"?" · "+it.rarity:""))+" · "+srcTag(it.source)+'</span></span><button class="add sh-additem" data-name="'+esc(it.name)+'" data-source="'+esc(it.source)+'">ADD</button></div>'+desc+"</div>";
    }).join(""):'<div class="results-note">No matches.</div>';
    if(full.length>list.length)html+='<div class="results-note">Showing '+list.length+' of '+full.length+' — refine your search.</div>';
    box.innerHTML=html;
    Array.prototype.forEach.call(box.querySelectorAll(".sh-additem"),function(b){b.addEventListener("click",function(){var it=(window.CC_ITEMS||[]).filter(function(x){return x.name===b.getAttribute("data-name")&&x.source===b.getAttribute("data-source");})[0];if(it){addItemObj(it);render();}});});
    Array.prototype.forEach.call(box.querySelectorAll(".res-name-click"),function(n){n.addEventListener("click",function(){n.parentNode.parentNode.classList.toggle("open");});});
  }
  function renderSheet(){
    var host=$("sheetPanel");if(!host)return;
    if(!state.className){host.innerHTML='<p class="sec-note">Pick a class (step 1) to build the sheet.</p>';return;}
    if(!derivedState.fdata){host.innerHTML='<p class="sec-note">Loading class data…</p>';return;}
    try{renderSheetInner(host);}
    catch(e){host.innerHTML='<div class="sheet-card"><h3>Sheet error (please report this text)</h3><div class="cbody"><pre style="white-space:pre-wrap;font-size:12px">'+esc((e&&e.stack)||(e&&e.message)||String(e))+"</pre></div></div>";}
  }
  function headerHTML(view){
    var prof=view.prof,ac=view.ac,init=view.init,mhp=view.mhp;
    var sub=((speciesLabel())+" "+state.className+" "+state.level).trim();
    if(state.subclassName)sub+="  ·  "+state.subclassName;

    var html='<div class="sheet-head"><div class="sheet-portrait" id="sheetPortrait">'+(state.portrait?'<img src="'+esc(state.portrait)+'">':"&#9670;")+'</div><div><div class="sheet-name">'+esc(state.name||"Unnamed")+'</div><div class="sheet-sub">'+esc(sub)+"</div></div>"+
      '<div class="sheet-top">'+topStat("+"+prof,"Prof Bonus",profWhy())+topStat(esc(speedText()),"Speed",speedWhy())+topStat(modStr(init),"Initiative",initWhy())+acStatHtml(ac)+
      (abilitySaveDc()!=null?topStat(abilitySaveDc(),"Save DC",dcAbility()+" save DC = 8 + proficiency ("+prof+") + "+dcAbility()+" modifier ("+modStr(abMod(totalScore(dcAbility())))+"). Enemies roll against this for your class and racial abilities that force a save."):"")+
      '<div class="top-stat insp-box" id="inspBox"><div class="tv">'+(state.sheet.inspiration?ICON.starOn:ICON.star)+'</div><div class="tl">Inspiration</div></div>'+
      '<div class="top-stat sheet-hp"><div class="tv"><input type="number" id="hpCur" value="'+esc(state.sheet.hpEdited?state.sheet.hpCurrent:mhp)+'"> / '+(mhp==null?"—":mhp)+'</div><div class="tl">Hit Points</div></div>'+
      '<div class="top-stat"><div class="tv"><input type="number" id="hpTemp" class="stat-inp" value="'+esc(state.sheet.hpTemp||"")+'"></div><div class="tl">Temp HP</div></div>'+
      '<div class="top-stat"><div class="tv"><input type="number" id="xpInput" class="stat-inp xp-inp" value="'+esc(state.sheet.xp||"")+'"></div><div class="tl">XP</div></div></div></div>'+
      fxBarHtml()+
      '<div class="ac-edit'+(uiState.sheet.acEditOpen?"":" hidden")+'" id="acEditRow">'+
        '<span class="ac-edit-lbl">Customise Armor Class</span>'+
        '<label>Other modifier <input type="number" id="acOther" value="'+esc(state.sheet.acOther||"")+'" placeholder="0"></label>'+
        '<label>Override total <input type="number" id="acOverride" value="'+esc(state.sheet.acOverride||"")+'" placeholder="auto"></label>'+
        '<button class="btn" id="acApply">Apply</button>'+
        '<button class="btn ghost" id="acReset">Reset</button>'+
        '<button class="btn ghost" id="acClose">Close</button>'+
        '<span class="res-sub" id="acWhy">'+esc(acBreakdown())+'</span>'+
      '</div>';

    return html;
  }
  function trainingHTML(view){
    // LEFT
    var abilCells=ABILITIES.map(function(a){var t=totalScore(a);return '<div class="abil-cell"><div class="aname">'+ABIL_ABBR[a]+'</div><div class="amod">'+modStr(abMod(t))+'</div><div class="ascore">'+t+"</div></div>";}).join("");
    var sp=savingProfs();
    var saveRows=ABILITIES.map(function(a){var m=saveBonus(a);return '<div class="line-row"><span class="dot'+(sp[a]?" on":"")+'"></span><span class="ab">'+ABIL_ABBR[a]+'</span><span>'+a+'</span><span class="lv">'+modStr(m)+"</span></div>";}).join("");
    var senses=sensesList();
    var fd=derivedState.fdata,pf=fd.proficiencies||{},langs=languagesAll();
    var langChips=(state.customLanguages||[]).map(function(l,i){return '<span class="lang-chip">'+esc(l)+' <span class="lang-x" data-i="'+i+'">&times;</span></span>';}).join("");
    var known={};langs.forEach(function(l){known[String(l).toLowerCase()]=1;});
    var GROUPS=[["standard","Standard"],["exotic","Exotic"],["secret","Secret"],["other","Regional & other"]];
    var langOpts='<option value="">— Add an official language —</option>';
    GROUPS.forEach(function(g){
      var items=officialLanguages().filter(function(x){return x.type===g[0]&&!known[x.name.toLowerCase()];});
      if(!items.length)return;
      langOpts+='<optgroup label="'+esc(g[1])+'">'+items.map(function(x){
        return '<option value="'+esc(x.name)+'">'+esc(x.name)+"</option>";
      }).join("")+"</optgroup>";
    });
    var fg=featureGrants();
    var _fga=featGrantsAll();
    var toolExtra=fg.tools.concat(featureToolPicks(),_fga.tools);   // feature grants, feature picks, feat grants
    var profBody=profBlock("Armor","armor",withFeatureProfs(pf.armor,fg.armor.concat(_fga.armor)))+profBlock("Weapons","weapons",withFeatureProfs(pf.weapons,fg.weapons.concat(_fga.weapons)))+profBlock("Tools","tools",withFeatureProfs(pf.tools,toolExtra))+
      '<div class="prof-blk"><div class="pl">Languages</div>'+esc(langs.join(", ")||"—")+
      '<div class="lang-edit">'+langChips+
        '<select id="langPick">'+langOpts+'</select>'+
        '<div class="lang-add"><input type="text" id="custLang" placeholder="…or type a custom one"><button class="btn" id="addLang">Add</button></div>'+
      "</div></div>";
    var left=shCard("Ability Scores",'<div class="abil-block">'+abilCells+"</div>")+shCard("Saving Throws",saveRows)+shCard("Senses",senses.length?senses.join("<br>"):"Normal vision")+shCard("Proficiencies & Languages",profBody);

    return left;
  }
  function skillsHTML(view){
    // MIDDLE: skills + passives
    var ps=proficientSkills();
    var ex=expertiseSkills(),advDis=skillAdvantage();
    var skillRows=Object.keys(SKILL_ABILITY).sort().map(function(sk){
      var ab=SKILL_ABILITY[sk];
      var ad=advDis[sk],mk="";
      if(ad&&ad.adv.length)mk+=' <span class="adv-tag" title="'+esc("Advantage: "+ad.adv.join("; "))+'">A</span>';
      if(ad&&ad.dis.length)mk+=' <span class="dis-tag" title="'+esc("Disadvantage: "+ad.dis.join("; "))+'">D</span>';
      return '<div class="line-row"><span class="dot'+(ps[sk]?" on":"")+(ex[sk]?" exp":"")+'"'+(ex[sk]?' title="Expertise — proficiency doubled"':"")+'></span><span class="ab">'+ABIL_ABBR[ab]+'</span><span>'+sk+(ex[sk]?' <span class="exp-tag">EX</span>':"")+mk+'</span><span class="lv">'+modStr(skillBonus(sk))+"</span></div>";
    }).join("");
    function passive(sk){return passiveScore(sk);}
    var passBody='<div class="passive-row"><span>Passive Perception</span><b>'+passive("Perception")+'</b></div><div class="passive-row"><span>Passive Investigation</span><b>'+passive("Investigation")+'</b></div><div class="passive-row"><span>Passive Insight</span><b>'+passive("Insight")+"</b></div>";
    var mid=shCard("Skills",skillRows)+shCard("Passive Senses",passBody);

    return mid;
  }
  function resourcesHTML(view){
    // RIGHT: resources, attacks, spells, inventory, features, background
    var resBody=resourceView().map(function(row){var r=row.resource,n=row.count;if(!n)return "";var pips="";for(var i=0;i<n;i++){var k=r.name+":"+i;pips+='<span class="pip'+(state.sheet.res[k]?" used":"")+'" data-k="'+esc(k)+'"></span>';}var fk="";fxAvailable().forEach(function(e){if(!fk&&r.name.toLowerCase().indexOf(e.key.toLowerCase())===0)fk=e.key;});
      var rbox=fk?'<span class="fx-box'+(fxIsOn(fk)?" on":"")+'" data-fx-set="'+esc(fk)+'" title="'+esc(fxIsOn(fk)?"Active — click to end":"Click when you use this")+'"></span>':"";
      return '<div style="margin-bottom:10px"><div class="res-name">'+rbox+esc(r.name)+' <span class="res-sub">('+n+')</span></div><div class="pips">'+pips+"</div></div>";}).join("");
    var cRes=shCard("Class Resources",resBody);
    // Metamagic / Invocations / Maneuvers — the options a caster or martial applies in play
    var co=classOptions();
    var coTitle=co.pools.length===1?co.pools[0]:"Class Options";
    // show each option's source pool (Runes, Fighting Style…) when the card mixes several
    var cOpts=co.items.length?shCard(coTitle,sheetCollapse(co.items,"co",co.pools.length>1)):"";
    return cRes+cOpts;
  }
  function combatHTML(view){
    // actions (weapon attacks, attack cantrips, unarmed, actions in combat)
    var cAtk=shCard("Actions",actionsCardHtml());
    return cAtk;
  }
  function spellsHTML(view){
    var info=view.info;
    // spells
    var info=spellInfo(),spBody="";
    if(info){
      // slot counts are shown in the Spell Slots card above, so they are not repeated here
      if(state.spells.cantrips.length)spBody+='<div class="spell-lvl-h">Cantrips</div>'+sheetCollapse(spellItems(state.spells.cantrips),"sc");
      var byLvl={};state.spells.spells.forEach(function(k){var s=spellByKey(k);if(s){(byLvl[s.level]=byLvl[s.level]||[]).push(k);}});
      Object.keys(byLvl).sort().forEach(function(lv){spBody+='<div class="spell-lvl-h">Level '+lv+'</div>'+sheetCollapse(spellItems(byLvl[lv]),"s"+lv);});
      var spell=spellPresentation(info,false);
      spBody+='<div class="res-sub" style="margin-top:6px">DC '+spell.saveDC+" · attack "+modStr(spell.attack)+"</div>";
    }
    // racial / innate spells (from species/lineage), shown even for non-casters
    var rsp=allRacialSpells();
    if(rsp.length){
      var rk=[],rseen={};rsp.forEach(function(sp){var s=spellByName(sp.name);if(s&&!rseen[s.name]){rseen[s.name]=1;rk.push(s.name+"|"+s.source);}});
      if(rk.length)spBody+='<div class="spell-lvl-h">Racial / Innate</div>'+sheetCollapse(spellItems(rk),"rc");
    }
    // spells a feat grants (Fey Touched, Magic Initiate, Ritual Caster...)
    var fsp=featGrantsAll().spells,fk=[],fseen={};
    fsp.forEach(function(n){var s=spellByName(n);if(s&&!fseen[s.name]){fseen[s.name]=1;fk.push(s.name+"|"+s.source);}});
    if(fk.length)spBody+='<div class="spell-lvl-h">From your feats</div>'+sheetCollapse(spellItems(fk),"fs");
    var copts=concOptions();
    if(copts.length){
      var cur=state.sheet.conc||"";
      spBody+='<div class="conc-pick"><label for="concSel">Concentrating on</label><select id="concSel">'+
        '<option value=""'+(cur?"":" selected")+">— nothing —</option>"+
        copts.map(function(c){return '<option value="'+esc(c.key)+'"'+(c.key===cur?" selected":"")+">"+esc(c.label)+"</option>";}).join("")+
        "</select>"+(concSpell()?'<div class="conc-note">Ends if you cast another concentration spell, are incapacitated, or fail a DC 10 Constitution save (or half the damage taken, whichever is higher).</div>':"")+"</div>";
    }
    var cSpells=shCard("Spells",spBody);
    var cSlots=shCard("Spell Slots",spellSlotsHtml(info));
    return cSlots+cSpells;
  }
  function inventoryHTML(view){
    var inv=state.equipment.inventory;
    // currency (editable)
    var c=state.equipment.currency,coinDefs=[["pp","PP"],["gp","GP"],["ep","EP"],["sp","SP"],["cp","CP"]];
    var curBody='<div class="cur-inline">'+coinDefs.map(function(k){return '<label class="cur-cell">'+k[1]+'<input type="number" min="0" class="sh-cur" data-k="'+k[0]+'" value="'+(c[k[0]]||0)+'"></label>';}).join("")+'</div><div class="res-sub" style="margin-top:6px">Total: <b id="shGp">'+(Math.round(currencyGP()*100)/100)+'</b> gp</div>';
    var cCur=shCard("Currency",curBody);
    // Inventory normalization runs in the controller after gameplay changes.
    var invBody='<div class="res-sub" style="margin-bottom:8px">Attunement: <b>'+attunedCount()+' / 3</b></div>'+itemEffectsHtml();
    if(inv.length){
      invBody+=inv.map(function(it,i){
        var att=itemAttune(it);
        var badge=(att&&it.attuned)?' <span class="attune-star">&#10022; attuned</span>':"";
        var info=itemInfo(it.name,it.source),full=itemEntriesFull(it),hasDesc=full.length;
        var meta=it.cat+(it.dmg?" · "+it.dmg+" "+(it.dmgType||""):"")+(it.ac&&it.armorKind!=="shield"?" · AC "+it.ac:"")+(it.armorKind==="shield"?" · +"+(it.ac||2)+" AC":"")+(it.rarity&&it.rarity!=="none"?" · "+it.rarity:"")+(att?" · "+attuneNote(att):"");
        var qb=(it.qty>1?'<span class="qty-badge">&times;'+esc(it.qty)+"</span> ":"");
        var ctrl='<input type="number" min="1" class="sh-qty" data-i="'+i+'" title="Quantity" value="'+esc(it.qty||1)+'">';
        var ra=resolveArmor(it);
        var eqi=equipInfo(it);
        if(eqi.ok)ctrl+='<button class="equip-btn sh-equip'+(it.equipped?" on":"")+'" data-i="'+i+'">'+eqi.verb+"</button>";
        if(att)ctrl+='<button class="equip-btn sh-attune'+(it.attuned?" on":"")+'" data-i="'+i+'" title="'+esc(attuneNote(att))+'">'+(it.attuned?"Attuned":"Attune")+"</button>";
        ctrl+='<button class="rm-btn sh-rm" data-i="'+i+'">&times;</button>';
        var desc=hasDesc?'<div class="inv-desc">'+full.map(renderEntry).join("")+"</div>":"";
        // magic weapon variants (Frost Brand, +1 Weapon, ...) need a base weapon to become an attack
        var basePick="";
        if(isVariantWeapon(it)){
          var reqs=it.requires||(info||{}).requires,pool=baseWeaponsFor(reqs);
          basePick='<div class="base-pick">Applies to: <select class="sh-base" data-i="'+i+'"><option value="">— choose a base weapon —</option>'+
            pool.map(function(b){return '<option value="'+esc(b.name)+'"'+(it.base===b.name?" selected":"")+'>'+esc(b.name+" ("+b.dmg+" "+dmgAbbr(b.dmgType)+")")+"</option>";}).join("")+"</select></div>";
        }else if(isVariantArmor(it)){
          var apool=baseArmorsFor(it);
          basePick='<div class="base-pick">Applies to: <select class="sh-base" data-i="'+i+'"><option value="">— choose base armour —</option>'+
            apool.map(function(b){return '<option value="'+esc(b.name)+'"'+(it.base===b.name?" selected":"")+'>'+esc(b.name+" (AC "+b.ac+", "+b.armorKind+")")+"</option>";}).join("")+"</select></div>";
        }
        return '<div class="inv-item'+(hasDesc?" has-desc":"")+'"><div class="inv-row"><div class="inv-main" data-i="'+i+'"><div class="nm">'+qb+esc(it.name)+badge+(hasDesc?' <span class="inv-chev">&#9662;</span>':"")+'</div><div class="meta">'+esc(meta)+(it.source?" · "+srcTag(it.source):"")+'</div></div><div class="ctrl">'+ctrl+"</div></div>"+basePick+desc+"</div>";
      }).join("");
    }else invBody+='<span class="res-sub">No items yet.</span>';
    invBody+='<div class="hr" style="margin:14px 0 10px"></div><div class="res-sub" style="margin-bottom:6px"><b>Add items</b></div>';
    invBody+='<input type="text" id="invSearch" placeholder="Search all items…" value="'+esc(uiState.sheet.invQ||"")+'"><div id="invResults" class="inv-results"></div>';
    invBody+='<div class="lang-add" style="margin:8px 0"><input type="text" id="invCustom" placeholder="Add a custom item…" value="'+esc(uiState.sheet.invAdd)+'"><button class="btn" id="addCustomItem">Add</button></div>';
    var cInv=shCard("Inventory",invBody);
    return cCur+cInv;
  }
  function featuresHTML(view){
    var featItems=featureCards();
    var fxKeys={};fxAvailable().forEach(function(e){fxKeys[e.key]=1;});
    featItems.forEach(function(fi){                 // a checkbox beside anything you switch on in play
      var bare=fi.name.replace(/\s*\[[^\]]*\]\s*$/,"").replace(/\s*\(optional\)\s*$/,"");
      if(fxKeys[bare])fi.fx=bare;
    });
    var cFeat=shCard("Features & Traits",sheetCollapse(featItems,"f"));
    return cFeat;
  }
  function backgroundHTML(view){
    // background
    var bg=currentBg(),det=state.details,bgBody="";
    if(state.bgIsCustom)bgBody+="<b>"+esc(state.bgCustomName||"Custom Background")+"</b>";
    else if(bg)bgBody+="<b>"+esc(bg.name)+"</b>"+(bg.feature?" — "+esc(bg.feature.name):"");
    bgBody+='<div class="passive-row"><span>Alignment</span><b>'+esc(det.alignment||"—")+'</b></div><div class="passive-row"><span>Faith</span><b>'+esc(det.faith||"—")+'</b></div><div class="passive-row"><span>Lifestyle</span><b>'+esc(det.lifestyle||"—")+"</b></div>";
    var cBg=shCard("Background & Details",bgBody);
    return cBg;
  }
  function restHTML(view){
    var info=view.info;
    var cDeath=shCard("Death Saves",deathSavesHtml());
    var hdpips="";for(var hi=0;hi<state.level;hi++){var hk="hd:"+hi;hdpips+='<span class="pip'+(state.sheet.res[hk]?" used":"")+'" data-k="'+hk+'"></span>';}
    var srNames=shortRestNames(info);
    var restNote='<div class="res-sub" style="margin-top:8px"><b>Short rest:</b> '+(srNames.length?esc(srNames.join(", ")):"nothing to regain (spend hit dice below)")+
      '<br><b>Long rest:</b> full HP, all slots &amp; resources, half your hit dice</div>';
    // each die spent on a short rest restores its roll plus your Constitution modifier
    var hdCon=abMod(totalScore("Constitution")),hdSign=(hdCon<0?" - "+Math.abs(hdCon):" + "+hdCon);
    var hdLabel="Hit Dice "+state.level+"d"+state.hdFaces+hdSign;
    var hdWhy="Each die you spend on a short rest restores 1d"+state.hdFaces+hdSign+" hit points — your Constitution modifier applies to every die.";
    var cRest=shCard("Rest & Hit Dice",'<div class="rest-btns"><button class="btn ghost sm" id="shortRest">Short Rest</button><button class="btn sm" id="longRest">Long Rest</button></div><div class="hd-lbl has-origin" title="'+esc(hdWhy)+'">'+esc(hdLabel)+'</div><div class="pips">'+hdpips+"</div>"+restNote);

    return cRest+cDeath;
  }
  function defencesHTML(){return shCard("Defences",defencesHtml());}
  function sheetView(){return {prof:profBonus(),ac:computeAC(),init:abMod(totalScore("Dexterity")),mhp:maxHP(),info:spellInfo()};}
  var sections={header:headerHTML,training:trainingHTML,skills:skillsHTML,resources:resourcesHTML,combat:combatHTML,spells:spellsHTML,inventory:inventoryHTML,features:featuresHTML,background:backgroundHTML,rest:restHTML,defences:defencesHTML};
  // A section owns its target DOM. Replacing it drops its former local listeners.
  function renderSection(name,host){
    if(!sections[name])throw new Error("Unknown sheet section: "+name);
    if(!state.className||!derivedState.fdata){
      host.innerHTML='<p class="sec-note">'+(!state.className?"Pick a class (step 1) to build the sheet.":"Loading class data…")+'</p>';return;
    }
    host.innerHTML=sections[name](sheetView());
    bindSheetEvents(host);
    if(name==="inventory")renderInvResults(host);
  }
  function renderSheetInner(host){
    var view=sheetView(),fxOn=fxActive(),frameCls="sheet-frame";
    if(fxOn.length)frameCls+=" fx-active";
    if(concSpell())frameCls+=" fx-conc-on";
    host.className=frameCls;
    host.innerHTML=headerHTML(view)+'<div class="sheet-grid"><div>'+trainingHTML(view)+"</div><div>"+skillsHTML(view)+defencesHTML(view)+"</div><div>"+resourcesHTML(view)+spellsHTML(view)+"</div><div>"+combatHTML(view)+inventoryHTML(view)+'</div><div class="col5"><div class="col5-pair">'+restHTML(view)+"</div>"+featuresHTML(view)+backgroundHTML(view)+"</div></div>";
    bindSheetEvents(host);renderInvResults(host);
  }
  function bindSheetEvents(host){
    var spx=host.querySelector("#sheetPortrait");if(spx)spx.addEventListener("click",function(){$("portraitFile").click();});
    var hc=host.querySelector("#hpCur");if(hc)hc.addEventListener("input",function(){state.sheet.hpEdited=true;state.sheet.hpCurrent=parseInt(hc.value,10)||0;});
    var ht=host.querySelector("#hpTemp");if(ht)ht.addEventListener("input",function(){state.sheet.hpTemp=ht.value;});
    var xp=host.querySelector("#xpInput");if(xp)xp.addEventListener("input",function(){state.sheet.xp=xp.value;});
    var acS=host.querySelector("#acStat"),acRow=host.querySelector("#acEditRow");
    if(acS&&acRow)acS.addEventListener("click",function(){
      uiState.sheet.acEditOpen=!uiState.sheet.acEditOpen;
      acRow.classList.toggle("hidden",!uiState.sheet.acEditOpen);
    });
    var acO=host.querySelector("#acOther"),acV=host.querySelector("#acOverride");
    function stash(){                                  // record without re-rendering
      if(acO)state.sheet.acOther=acO.value;
      if(acV)state.sheet.acOverride=acV.value;
    }
    function apply(){stash();uiState.sheet.acEditOpen=true;render();}
    if(acO)acO.addEventListener("input",stash);
    if(acV)acV.addEventListener("input",stash);
    function onEnter(e){if(e.keyCode===13){e.preventDefault();apply();}}
    if(acO)acO.addEventListener("keydown",onEnter);
    if(acV)acV.addEventListener("keydown",onEnter);
    var acA=host.querySelector("#acApply");
    if(acA)acA.addEventListener("click",apply);
    var acR=host.querySelector("#acReset");
    if(acR)acR.addEventListener("click",function(){state.sheet.acOther="";state.sheet.acOverride="";uiState.sheet.acEditOpen=true;render();});
    var acC=host.querySelector("#acClose");
    if(acC)acC.addEventListener("click",function(){stash();uiState.sheet.acEditOpen=false;render();});
    var lr=host.querySelector("#longRest");if(lr)lr.addEventListener("click",longRest);
    var sr=host.querySelector("#shortRest");if(sr)sr.addEventListener("click",shortRest);
    var ib=host.querySelector("#inspBox");if(ib)ib.addEventListener("click",function(){state.sheet.inspiration=!state.sheet.inspiration;render();});
    Array.prototype.forEach.call(host.querySelectorAll(".death-dot"),function(d){d.addEventListener("click",function(){
      var kind=d.getAttribute("kind")||d.getAttribute("data-kind"),i=+d.getAttribute("data-i"),key=kind==="succ"?"deathSucc":"deathFail",cur=state.sheet[key]||0;
      state.sheet[key]=(i<cur)?i:i+1;render();
    });});
    Array.prototype.forEach.call(host.querySelectorAll(".pip"),function(p){p.addEventListener("click",function(){var k=p.getAttribute("data-k");state.sheet.res[k]=!state.sheet.res[k];p.classList.toggle("used");});});
    Array.prototype.forEach.call(host.querySelectorAll(".sc-h"),function(h){h.addEventListener("click",function(){h.parentNode.classList.toggle("open");});});
    Array.prototype.forEach.call(host.querySelectorAll(".atk-row.has-desc"),function(r){r.addEventListener("click",function(){r.classList.toggle("open");});});
    // active effects: the checkbox is the control, the pill is a shortcut to end it
    Array.prototype.forEach.call(host.querySelectorAll(".fx-box"),function(b){b.addEventListener("click",function(ev){
      ev.stopPropagation();                                  // do not also collapse the feature
      var k=b.getAttribute("data-fx-set");
      state.sheet.active[k]=!state.sheet.active[k];
      if(!state.sheet.active[k])delete state.sheet.active[k];
      render();
    });});
    Array.prototype.forEach.call(host.querySelectorAll(".fx-pill"),function(pl){pl.addEventListener("click",function(){
      if(pl.getAttribute("data-fx-conc"))state.sheet.conc="";
      else delete state.sheet.active[pl.getAttribute("data-fx")];
      render();
    });});
    var csel=host.querySelector("#concSel");
    if(csel)csel.addEventListener("change",function(){state.sheet.conc=csel.value;render();});
    // custom languages
    var lp=host.querySelector("#langPick");
    if(lp)lp.addEventListener("change",function(){
      if(lp.value){state.customLanguages.push(lp.value);render();}
    });
    var cl=host.querySelector("#custLang"),al=host.querySelector("#addLang");
    function addLang(){var v=cl&&cl.value.trim();if(v){state.customLanguages.push(v);render();}}
    if(al)al.addEventListener("click",addLang);
    if(cl)cl.addEventListener("keydown",function(e){if(e.keyCode===13){e.preventDefault();addLang();}});
    Array.prototype.forEach.call(host.querySelectorAll(".lang-x"),function(x){x.addEventListener("click",function(){state.customLanguages.splice(+x.getAttribute("data-i"),1);render();});});
    // added proficiencies (armor / weapons / tools)
    Array.prototype.forEach.call(host.querySelectorAll(".prof-pick"),function(sel){
      sel.addEventListener("change",function(){
        var k=sel.getAttribute("data-pk");if(!sel.value)return;
        (state.customProficiencies[k]=state.customProficiencies[k]||[]).push(sel.value);render();
      });
    });
    Array.prototype.forEach.call(host.querySelectorAll(".prof-x"),function(x){
      x.addEventListener("click",function(){
        var k=x.getAttribute("data-pk"),arr=state.customProficiencies[k]||[];
        arr.splice(+x.getAttribute("data-i"),1);render();
      });
    });
    // added defences (resistances / immunities / vulnerabilities / condition immunities / custom)
    var dpk=host.querySelector("#defPick");
    if(dpk)dpk.addEventListener("change",function(){
      if(!dpk.value)return;var sv=dpk.value,i=sv.indexOf("|");
      state.customDefences.push({kind:sv.substr(0,i),value:sv.substr(i+1)});render();
    });
    var cdf=host.querySelector("#custDef"),adf=host.querySelector("#addDef");
    function addDef(){var v=cdf&&cdf.value.trim();if(v){state.customDefences.push({kind:"custom",value:v});render();}}
    if(adf)adf.addEventListener("click",addDef);
    if(cdf)cdf.addEventListener("keydown",function(e){if(e.keyCode===13){e.preventDefault();addDef();}});
    Array.prototype.forEach.call(host.querySelectorAll(".def-x"),function(x){x.addEventListener("click",function(){state.customDefences.splice(+x.getAttribute("data-i"),1);render();});});
    // currency
    Array.prototype.forEach.call(host.querySelectorAll(".sh-cur"),function(inp){inp.addEventListener("input",function(){state.equipment.currency[inp.getAttribute("data-k")]=parseInt(inp.value,10)||0;var g=host.querySelector("#shGp");if(g)g.innerHTML=Math.round(currencyGP()*100)/100;});});
    // inventory add / custom / controls
    var is=host.querySelector("#invSearch");if(is)is.addEventListener("input",function(){uiState.sheet.invQ=is.value;renderInvResults(host);});
    var ic=host.querySelector("#invCustom"),aci=host.querySelector("#addCustomItem");
    function addCustom(){var v=ic&&ic.value.trim();if(v){addItemObj({name:v,cat:"Other Gear",generic:true});uiState.sheet.invAdd="";render();}}
    if(ic)ic.addEventListener("input",function(){uiState.sheet.invAdd=ic.value;});
    if(aci)aci.addEventListener("click",addCustom);
    if(ic)ic.addEventListener("keydown",function(e){if(e.keyCode===13){e.preventDefault();addCustom();}});
    Array.prototype.forEach.call(host.querySelectorAll(".sh-qty"),function(inp){inp.addEventListener("change",function(){state.equipment.inventory[+inp.getAttribute("data-i")].qty=parseInt(inp.value,10)||1;});});
    Array.prototype.forEach.call(host.querySelectorAll(".sh-equip"),function(b){b.addEventListener("click",function(){var it=state.equipment.inventory[+b.getAttribute("data-i")];var rk=resolveArmor(it);
      if(!it.equipped&&rk&&rk.armorKind!=="shield")state.equipment.inventory.forEach(function(x){var xk=resolveArmor(x);if(xk&&xk.armorKind!=="shield")x.equipped=false;});it.equipped=!it.equipped;render();});});
    Array.prototype.forEach.call(host.querySelectorAll(".sh-attune"),function(b){b.addEventListener("click",function(){
      var it=state.equipment.inventory[+b.getAttribute("data-i")];
      if(!itemAttune(it))return;                                  // not an attunable item
      if(!it.attuned&&attunedCount()>=3){alert("You can be attuned to at most 3 items at a time.");return;}
      it.attuned=!it.attuned;render();
    });});
    Array.prototype.forEach.call(host.querySelectorAll(".sh-base"),function(s){
      s.addEventListener("click",function(e){e.stopPropagation();});
      s.addEventListener("change",function(){state.equipment.inventory[+s.getAttribute("data-i")].base=s.value||null;render();});
    });
    Array.prototype.forEach.call(host.querySelectorAll(".sh-rm"),function(b){b.addEventListener("click",function(){state.equipment.inventory.splice(+b.getAttribute("data-i"),1);render();});});
    Array.prototype.forEach.call(host.querySelectorAll(".inv-item.has-desc .inv-main"),function(m){m.addEventListener("click",function(){m.parentNode.parentNode.classList.toggle("open");});});
  }
    return {renderSection:renderSection,sections:sections,acStatHtml:acStatHtml,sheetCollapse:sheetCollapse,actionsCardHtml:actionsCardHtml,fxBarHtml:fxBarHtml,deathSavesHtml:deathSavesHtml,spellSlotsHtml:spellSlotsHtml,renderInvResults:renderInvResults,renderSheet:renderSheet,renderSheetInner:renderSheetInner};
  }
  root.CCCharacterSheetUI={create:create};
  if(typeof module!=="undefined"&&module.exports)module.exports={create:create};
})(typeof window!=="undefined"?window:globalThis);
