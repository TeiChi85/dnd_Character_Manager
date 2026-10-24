(function(root){
  "use strict";
  function create(context){
    var state=context.character,uiState=context.ui,derivedState=context.derived;
    var spellPresentation=context.adapters.spellPresentation;
    var autoHp=context.adapters.autoHp,isSidekickClass=context.adapters.isSidekickClass;
    var window=context.window,document=context.document;
    var alert=context.actions.alert,confirm=context.actions.confirm;
    function $(id){return document.getElementById(id);}
    var abMod=context.adapters.abMod;
    var abilityBonusMap=context.adapters.abilityBonusMap;
    var addByName=context.adapters.addByName;
    var addItemObj=context.adapters.addItemObj;
    var asiChoiceHtml=context.adapters.asiChoiceHtml;
    var asiResolved=context.adapters.asiResolved;
    var attuneNote=context.adapters.attuneNote;
    var baseScore=context.adapters.baseScore;
    var bgProficienciesHtml=context.adapters.bgProficienciesHtml;
    var bonusSum=context.adapters.bonusSum;
    var choiceSelectsHtml=context.adapters.choiceSelectsHtml;
    var classSpellList=context.adapters.classSpellList;
    var computeAC=context.adapters.computeAC;
    var currencyGP=context.adapters.currencyGP;
    var currentBg=context.adapters.currentBg;
    var currentLineage=context.adapters.currentLineage;
    var currentRace=context.adapters.currentRace;
    var customAsiHtml=context.adapters.customAsiHtml;
    var customAsiPending=context.adapters.customAsiPending;
    var dmgAbbr=context.adapters.dmgAbbr;
    var entryText=context.adapters.entryText;
    var equipInfo=context.adapters.equipInfo;
    var esc=context.adapters.esc;
    var expertiseHtml=context.adapters.expertiseHtml;
    var featureProfChoiceHtml=context.adapters.featureProfChoiceHtml;
    var featureSkillHtml=context.adapters.featureSkillHtml;
    var freshView=context.adapters.freshView;
    var groupFilled=context.adapters.groupFilled;
    var hitPointsBody=context.adapters.hitPointsBody;
    var itemAllowed=context.adapters.itemAllowed;
    var itemAttune=context.adapters.itemAttune;
    var itemBonuses=context.adapters.itemBonuses;
    var itemEntriesFull=context.adapters.itemEntriesFull;
    var itemInfo=context.adapters.itemInfo;
    var langPool=context.adapters.langPool;
    var mergedLanguages=context.adapters.mergedLanguages;
    var modStr=context.adapters.modStr;
    var needsCustomAsi=context.adapters.needsCustomAsi;
    var optEnabled=context.adapters.optEnabled;
    var optKey=context.adapters.optKey;
    var optProgMap=context.adapters.optProgMap;
    var ordinal=context.adapters.ordinal;
    var originPickerHtml=context.adapters.originPickerHtml;
    var orphanProgressions=context.adapters.orphanProgressions;
    var pbRemaining=context.adapters.pbRemaining;
    var plainTags=context.adapters.plainTags;
    var profBonus=context.adapters.profBonus;
    var proficienciesBody=context.adapters.proficienciesBody;
    var progAt=context.adapters.progAt;
    var pruneChoices=context.adapters.pruneChoices;
    var raceChoiceCount=context.adapters.raceChoiceCount;
    var raceFeatHtml=context.adapters.raceFeatHtml;
    var raceFeatPending=context.adapters.raceFeatPending;
    var raceSelectHtml=context.adapters.raceSelectHtml;
    var render=context.adapters.render;
    var renderEntry=context.adapters.renderEntry;
    var renderTags=context.adapters.renderTags;
    var rollDiceStr=context.adapters.rollDiceStr;
    var rollSix=context.adapters.rollSix;
    var saveBonus=context.adapters.saveBonus;
    var sensesList=context.adapters.sensesList;
    var sidekickRole=context.adapters.sidekickRole;
    var sidekickRoleHtml=context.adapters.sidekickRoleHtml;
    var sourceName=context.adapters.sourceName;
    var spKey=context.adapters.spKey;
    var spellByKey=context.adapters.spellByKey;
    var spellInfo=context.adapters.spellInfo;
    var spellPicksAll=context.adapters.spellPicksAll;
    var srcTag=context.adapters.srcTag;
    var stripOptions=context.adapters.stripOptions;
    var tableChoiceCfg=context.adapters.tableChoiceCfg;
    var tableChoiceHtml=context.adapters.tableChoiceHtml;
    var totalScore=context.adapters.totalScore;
    var ABILITIES=context.constants.ABILITIES;
    var ABIL_ABBR=context.constants.ABIL_ABBR;
    var ALIGNMENTS=context.constants.ALIGNMENTS;
    var ALL=context.constants.ALL;
    var ALL_SKILLS=context.constants.ALL_SKILLS;
    var ITEM_TYPES=context.constants.ITEM_TYPES;
    var LIFESTYLES=context.constants.LIFESTYLES;
    var POINT_BUY_COST=context.constants.POINT_BUY_COST;
    var STANDARD_ARRAY=context.constants.STANDARD_ARRAY;
  function renderFeatures(){
    var fd=derivedState.fdata,lvl=state.level;
    var chosen=state.subclassName?fd.subclasses.filter(function(s){return s.name===state.subclassName;})[0]:null;
    var progMap=optProgMap(fd,chosen);

    var list=[];
    fd.classFeatures.forEach(function(f){list.push({level:f.level,name:f.name,entries:f.entries,optional:f.optional,gain:f.gainSubclassFeature,isSub:false,source:f.source});});
    if(chosen)chosen.features.forEach(function(f){list.push({level:f.level,name:f.name,entries:f.entries,isSub:true,source:chosen.source});});
    // a picker for any pool whose progression has no like-named feature (Runes, Maneuvers…)
    orphanProgressions(fd,chosen,progMap).forEach(function(op){
      list.push({level:op.level,name:op.name,entries:["Choose from the "+op.name.toLowerCase()+" available to your "+(op.isSub?"subclass":"class")+"."],
                 isSub:op.isSub,source:op.isSub?chosen.source:fd.source});
    });

    var shown=list.filter(function(f){return f.level<=lvl;}).sort(function(a,b){return a.level-b.level||(a.isSub?1:0)-(b.isSub?1:0);});
    var higher=list.filter(function(f){return f.level>lvl;}).length;

    var gainLevels=fd.classFeatures.filter(function(f){return f.gainSubclassFeature;}).map(function(f){return f.level;});
    var subChoiceLevel=gainLevels.length?Math.min.apply(null,gainLevels):null;

    var panels=[];
    panels.push(panelHtml("Hit Points","1st level",0,"",hitPointsBody(fd),"Hit Points@1",false));
    var sk=fd.proficiencies&&fd.proficiencies.skills;
    var skN=sk?sk.count:0,skPending=sk?(groupFilled("skill",sk.count)<sk.count):false;
    panels.push(panelHtml("Proficiencies","1st level",skN,"",proficienciesBody(fd),"Proficiencies@1",skPending));

    var seenChoice={},pickerShown=false;
    shown.forEach(function(f){
      var levelLabel=ordinal(f.level)+" level",key=f.name+"@"+f.level+(f.isSub?":s":"");
      var enabled=optEnabled(f);
      var badge=f.optional
        ?'<span class="badge" title="Optional feature from '+esc(sourceName(f.source))+'">OPTIONAL &#183; '+esc(f.source)+'</span>'
        :(f.isSub?'<span class="badge sub" title="'+esc(state.subclassName)+' — from '+esc(sourceName(f.source))+'">'+esc(state.subclassName)+'</span>':"");
      var isASI=(f.name==="Ability Score Improvement");
      var isChoice=!isASI&&(progMap[f.name]||fd.inlineChoiceCount[f.name])&&(fd.optionLists[f.name]&&fd.optionLists[f.name].length);
      var body,choicesN=0,pending=false;
      if(isASI){
        body=(f.entries||[]).map(renderEntry).join("")+asiChoiceHtml(f.level);
        choicesN=1;pending=!asiResolved(f.level);
      }else if(isChoice){
        body=stripOptions(f.entries).map(renderEntry).join("");
        if(!seenChoice[f.name]){
          seenChoice[f.name]=true;
          var count=progMap[f.name]?progAt(progMap[f.name].progression,lvl):fd.inlineChoiceCount[f.name];
          if(count>0){body+=choiceSelectsHtml(f.name,fd.optionLists[f.name],count,f.name);choicesN=count;pending=groupFilled(f.name,count)<count;}
        }
      }else{
        body=(f.entries||[]).map(renderEntry).join("");
        var fsk=featureSkillHtml(f);
        if(fsk.count){body+=fsk.html;choicesN=fsk.count;if(fsk.pending)pending=true;}
        var fpc=featureProfChoiceHtml(f);
        if(fpc.count){body+=fpc.html;choicesN+=fpc.count;if(fpc.pending)pending=true;}
        var skr=sidekickRoleHtml(f);
        if(skr.count){body+=skr.html;choicesN+=skr.count;if(skr.pending)pending=true;}
        if(f.name==="Expertise"){var exh=expertiseHtml(f);body+=exh.html;if(exh.count){choicesN=exh.count;if(exh.pending)pending=true;}}
        if(f.isSub){
          var tc=tableChoiceCfg(fd.name,chosen&&chosen.shortName,f.name);
          if(tc){var res=tableChoiceHtml(f,tc);body+=res.html;choicesN=res.choicesN;pending=res.pending;}
        }
      }
      if(f.gain&&fd.subclasses.length&&f.level===subChoiceLevel&&!pickerShown){
        pickerShown=true;body+=originPickerHtml(fd);choicesN=1;pending=!state.subclassName;
      }else if(f.gain&&fd.subclasses.length&&!state.subclassName&&f.level>subChoiceLevel){
        body+='<p class="need-choice">Choose your subclass at '+ordinal(subChoiceLevel)+' level (above) to see this feature.</p>';
      }
      if(f.optional){
        body='<label class="opt-toggle"><input type="checkbox" class="opt-chk" data-key="'+esc(optKey(f))+'"'+(enabled?" checked":"")+
             "> Use this optional feature</label>"+(enabled?body:"");
        if(!enabled){choicesN=0;pending=false;}
      }
      panels.push(panelHtml(f.name,levelLabel,choicesN,badge,body,key,pending));
    });

    $("featureList").innerHTML=panels.join("");
    $("higherLevels").textContent=higher?("Available at Higher Levels ("+higher+")"):"";

    wireCollapse($("featureList"));
    var op=$("featureList").querySelector("#originSelect");
    if(op){op.value=state.subclassName||"";
      op.addEventListener("click",function(e){e.stopPropagation();});
      op.addEventListener("change",function(e){state.subclassName=e.target.value||null;pruneChoices();render();});}
    Array.prototype.forEach.call($("featureList").querySelectorAll(".choice-sel"),function(sel){
      sel.addEventListener("click",function(e){e.stopPropagation();});
      sel.addEventListener("change",function(e){state.choices[sel.getAttribute("data-group")+":"+sel.getAttribute("data-idx")]=e.target.value||"";render();});
    });
    Array.prototype.forEach.call($("featureList").querySelectorAll(".asi-mode"),function(sel){
      sel.addEventListener("click",function(e){e.stopPropagation();});
      sel.addEventListener("change",function(e){var lv=sel.getAttribute("data-level");state.choices["asi:"+lv+":mode"]=e.target.value||"";if(e.target.value!=="feat")delete state.choices["asi:"+lv+":feat"];render();});
    });
    Array.prototype.forEach.call($("featureList").querySelectorAll(".asi-feat"),function(sel){
      sel.addEventListener("click",function(e){e.stopPropagation();});
      sel.addEventListener("change",function(e){var lv=sel.getAttribute("data-level");state.choices["asi:"+lv+":feat"]=e.target.value||"";for(var q=0;q<4;q++)delete state.choices["asi:"+lv+":featab"+q];render();});
    });
    Array.prototype.forEach.call($("featureList").querySelectorAll(".opt-chk"),function(cb){
      cb.addEventListener("click",function(e){e.stopPropagation();});
      cb.addEventListener("change",function(){
        var k=cb.getAttribute("data-key");
        if(cb.checked)delete state.choices[k];else state.choices[k]="1";
        render();
      });
    });
    Array.prototype.forEach.call($("featureList").querySelectorAll(".sk-role"),function(sel){
      sel.addEventListener("click",function(e){e.stopPropagation();});
      sel.addEventListener("change",function(e){
        state.choices["sidekickRole"]=e.target.value||"";
        state.spells={cantrips:[],spells:[]};uiState.spells=freshView().spells;   // a new role means a new list
        render();
      });
    });
    Array.prototype.forEach.call($("featureList").querySelectorAll(".exp-sel"),function(sel){
      sel.addEventListener("click",function(e){e.stopPropagation();});
      sel.addEventListener("change",function(e){state.choices[sel.getAttribute("data-key")]=e.target.value||"";render();});
    });
    Array.prototype.forEach.call($("featureList").querySelectorAll(".feat-skill"),function(sel){
      sel.addEventListener("click",function(e){e.stopPropagation();});
      sel.addEventListener("change",function(e){
        state.choices[sel.getAttribute("data-key")+":"+sel.getAttribute("data-idx")]=e.target.value||"";
        render();
      });
    });
    Array.prototype.forEach.call($("featureList").querySelectorAll(".asi-featpick"),function(sel){
      sel.addEventListener("click",function(e){e.stopPropagation();});
      sel.addEventListener("change",function(e){
        state.choices[sel.getAttribute("data-key")]=e.target.value||"";render();
      });
    });
    Array.prototype.forEach.call($("featureList").querySelectorAll(".asi-featab"),function(sel){
      sel.addEventListener("click",function(e){e.stopPropagation();});
      sel.addEventListener("change",function(e){
        state.choices["asi:"+sel.getAttribute("data-level")+":featab"+sel.getAttribute("data-idx")]=e.target.value||"";
        render();
      });
    });
    Array.prototype.forEach.call($("featureList").querySelectorAll(".asi-dist"),function(sel){
      sel.addEventListener("click",function(e){e.stopPropagation();});
      sel.addEventListener("change",function(e){var lv=sel.getAttribute("data-level");state.choices["asi:"+lv+":dist"]=e.target.value||"2";delete state.choices["asi:"+lv+":a0"];delete state.choices["asi:"+lv+":a1"];render();});
    });
    Array.prototype.forEach.call($("featureList").querySelectorAll(".asi-abil"),function(sel){
      sel.addEventListener("click",function(e){e.stopPropagation();});
      sel.addEventListener("change",function(e){state.choices["asi:"+sel.getAttribute("data-level")+":a"+sel.getAttribute("data-idx")]=e.target.value||"";render();});
    });
    Array.prototype.forEach.call($("featureList").querySelectorAll(".tbl-sel"),function(sel){
      sel.addEventListener("click",function(e){e.stopPropagation();});
      sel.addEventListener("change",function(e){state.choices[sel.getAttribute("data-key")+":0"]=e.target.value||"";render();});
    });
  }
  function wireCollapse(container){
    window.CCUIComponents.collapse(container,function(key,open){
      uiState.openPanels[key]=open;
    });
  }
  function panelHtml(name,levelLabel,choicesN,badge,body,key,pending){
    if(uiState.openPanels[key]===undefined)uiState.openPanels[key]=(pending||name==="Hit Points");
    var open=uiState.openPanels[key];
    var sub=(choicesN>0?(choicesN+" Choice"+(choicesN>1?"s":"")+" • "):"")+levelLabel;
    return window.CCUIComponents.panel({name:name,key:key,open:open,pending:pending,
      subtitleHTML:sub,badgeHTML:badge,bodyHTML:body});
  }
  function renderBackground(){
    $("bgCustom").classList.toggle("hidden",!state.bgIsCustom);
    var host=$("bgDetail");
    if(state.bgIsCustom){host.innerHTML="";return;}
    var b=currentBg();
    if(!b){host.innerHTML="";return;}
    var html="";
    if(b.desc)html+='<p class="bg-desc">'+renderTags(b.desc)+"</p>";
    var pr=bgProficienciesHtml(b);
    html+=panelHtml("Background Proficiencies",srcTag(b.source),pr.picks,"",pr.html,"bgprof:"+b.name+b.source,pr.pending);
    if(b.feats&&b.feats.length)html+='<p class="prof-line" style="margin:12px 0"><b>Origin Feat:</b> '+esc(b.feats.join(", "))+"</p>";
    if(b.feature)html+=panelHtml("Feature: "+b.feature.name,"Background feature",0,"",(b.feature.entries||[]).map(renderEntry).join(""),"bgfeat:"+b.name+b.source,false);
    var sc=(b.entries||[]).filter(function(e){return e&&typeof e==="object"&&/suggested characteristics/i.test(e.name||"");})[0];
    if(sc)html+=panelHtml("Suggested Characteristics","",0,"",(sc.entries||[]).map(renderEntry).join(""),"bgsc:"+b.name+b.source,false);
    host.innerHTML=html;
    wireCollapse(host);
    Array.prototype.forEach.call(host.querySelectorAll(".bg-sel"),function(sel){
      sel.addEventListener("click",function(e){e.stopPropagation();});
      sel.addEventListener("change",function(e){state.bgChoices[sel.getAttribute("data-group")+":"+sel.getAttribute("data-idx")]=e.target.value||"";render();});
    });
  }
  function renderDetails(){
    var d=state.details;
    var al='<div><label class="fl">Alignment</label><select class="det-sel" data-k="alignment"><option value="">— Choose an Option —</option>'+
      ALIGNMENTS.map(function(a){return '<option'+(d.alignment===a?" selected":"")+'>'+esc(a)+"</option>";}).join("")+"</select></div>";
    var fa='<div><label class="fl">Faith</label><input type="text" class="det-inp" data-k="faith" value="'+esc(d.faith||"")+'" placeholder="e.g. Torm, the Raven Queen…"></div>';
    var lf='<div><label class="fl">Lifestyle</label><select class="det-sel" data-k="lifestyle"><option value="">— Choose an Option —</option>'+
      LIFESTYLES.map(function(l){return '<option'+(d.lifestyle===l?" selected":"")+'>'+esc(l)+"</option>";}).join("")+"</select></div>";
    $("detailsPanel").innerHTML='<div class="details-grid">'+al+fa+lf+"</div>";
    Array.prototype.forEach.call($("detailsPanel").querySelectorAll(".det-sel"),function(s){
      s.addEventListener("change",function(){state.details[s.getAttribute("data-k")]=s.value;});
    });
    var fi=$("detailsPanel").querySelector(".det-inp");
    if(fi)fi.addEventListener("input",function(){state.details.faith=fi.value;});
  }
  function renderRace(){
    var host=$("raceDetail");
    var race=currentRace();
    if(!race){host.innerHTML="";return;}
    var lin=currentLineage(race);
    function line(l,v){return '<p class="prof-line"><b>'+l+':</b> '+esc(v)+"</p>";}

    // merge grants (base + lineage)
    var fixed={};
    function mergeAb(src){for(var k in src)fixed[k]=(fixed[k]||0)+src[k];}
    mergeAb(race.ability.fixed);if(lin)mergeAb(lin.ability.fixed);
    var chooseList=[];
    race.ability.choose.forEach(function(c){chooseList.push({src:"asi",c:c});});
    if(lin)lin.ability.choose.forEach(function(c){chooseList.push({src:"linasi",c:c});});
    var senses=sensesList();
    var resist=race.resist.concat(lin?lin.resist:[]);
    var skills=race.skills,langs=mergedLanguages(race,lin);
    var spells=race.spells.concat(lin?lin.spells:[]);
    var spellChoices=race.spellChoices.concat(lin?lin.spellChoices:[]);
    var scAbility=(lin&&lin.scAbility)?lin.scAbility:race.scAbility;
    var traits=race.traits.concat(lin?lin.traits:[]);
    var pending=false;
    // A race skill choice is granted by a named trait (Leonin's Hunter's Instincts). Find
    // that trait so the picker can sit inside it, where the player reads about the choice,
    // instead of under a generic "Skill proficiency" line in the summary.
    var skillTrait=null;
    if(skills.choose){
      for(var ti=0;ti<traits.length;ti++){
        var ttxt=plainTags(entryText(traits[ti].entries||"")).toLowerCase(),all=true;
        if(ttxt.indexOf("proficien")<0)continue;
        for(var si=0;si<skills.choose.from.length;si++){if(ttxt.indexOf(skills.choose.from[si].toLowerCase())<0){all=false;break;}}
        if(all){skillTrait=traits[ti].name;break;}
      }
    }

    var s="";
    s+=line("Size",race.size||"—");
    s+=line("Speed",(lin&&lin.speed?lin.speed:race.speed)||"—");
    s+=line("Senses",senses.join(", ")||"—");
    var asiParts=[];for(var k in fixed)asiParts.push(k+" +"+fixed[k]);
    var custom=needsCustomAsi(race,lin);
    var asiText=(state.edition==="one")?"None from species — your ability increases come from your background (2024 rules)"
               :(custom?"You choose them (custom origin)":(asiParts.join(", ")||"None"));
    s+='<p class="prof-line"><b>Ability Score Increase:</b> '+esc(asiText)+"</p>";
    if(custom){s+=customAsiHtml();if(customAsiPending())pending=true;}
    chooseList.forEach(function(ch,idx){
      var grp="race:"+ch.src+idx;
      s+=raceSelectHtml(grp,ch.c.from,ch.c.count,"Ability increase (+"+ch.c.amount+" to "+ch.c.count+" of your choice)");
      if(raceChoiceCount(grp,ch.c.count)<ch.c.count)pending=true;
    });
    if(resist.length)s+=line("Damage Resistances",resist.join(", "));
    if(race.immune.length)s+=line("Damage Immunities",race.immune.join(", "));
    if(race.weapons.length)s+=line("Weapon Proficiencies",race.weapons.join(", "));
    if(race.armor.length)s+=line("Armor Proficiencies",race.armor.join(", "));
    if(race.tools.length)s+=line("Tool Proficiencies",race.tools.join(", "));
    if(skills.fixed.length)s+=line("Skill Proficiencies",skills.fixed.join(", "));
    if(skills.choose&&!skillTrait){s+=raceSelectHtml("race:skill",skills.choose.from,skills.choose.count,"Skill proficiency");if(raceChoiceCount("race:skill",skills.choose.count)<skills.choose.count)pending=true;}
    if(skills.any){s+=raceSelectHtml("race:skillany",ALL_SKILLS.filter(function(x){return skills.fixed.indexOf(x)<0;}),skills.any,"Skill proficiency (any)");if(raceChoiceCount("race:skillany",skills.any)<skills.any)pending=true;}
    if(langs.fixed.length)s+=line("Languages",langs.fixed.join(", "));
    if(race.langNote)s+='<p class="prof-line tag-note">'+esc(race.langNote)+"</p>";
    else if(!langs.fixed.length&&!langs.anyStandard&&!langs.any&&!langs.choose){
      s+='<p class="prof-line tag-note">'+(state.edition==="one"
        ?"Languages come from your background in the 2024 rules, not from your species."
        :"This source does not list languages for this species — add any you need on the sheet.")+"</p>";
    }
    if(langs.anyStandard){s+=raceSelectHtml("race:lang",langPool(),langs.anyStandard,"Language");if(raceChoiceCount("race:lang",langs.anyStandard)<langs.anyStandard)pending=true;}
    if(langs.any){s+=raceSelectHtml("race:langany",langPool(),langs.any,"Language (any)");if(raceChoiceCount("race:langany",langs.any)<langs.any)pending=true;}
    if(spells.length)s+=line("Innate / Racial Spells",spells.map(function(sp){return sp.name+(sp.cantrip?" (cantrip)":"");}).join(", "));
    // a choice of spell (e.g. Astral Fire): pick from the listed options
    spellPicksAll(race,lin).forEach(function(p){
      var lbl=(p.pk.cantrip?"Cantrip":"Spell")+" of your choice"+(p.pk.choose>1?" (choose "+p.pk.choose+")":"");
      s+=raceSelectHtml(p.group,p.pk.from,p.pk.choose,lbl);
      if(raceChoiceCount(p.group,p.pk.choose)<p.pk.choose)pending=true;
    });
    spellChoices.forEach(function(lbl){s+='<p class="prof-line tag-note">Plus choose '+esc(lbl)+" — pickable in the Spells step (coming later).</p>";});
    if(scAbility){s+=raceSelectHtml("race:scability",scAbility,1,"Spellcasting ability for racial spells");if(raceChoiceCount("race:scability",1)<1)pending=true;}
    var _rf=raceFeatHtml();
    if(_rf){s+=_rf;if(raceFeatPending())pending=true;}

    var html=panelHtml("Species Traits & Grants",srcTag(race.source),0,"",s,"race:summary:"+race.name+race.source,pending);

    // (lineage/subrace is chosen up front in the species dropdown, so no separate picker here)
    if(race.ancestry){
      var cur=state.raceChoices["race:ancestry:0"]||"";
      var aopts='<option value="">— Choose —</option>'+race.ancestry.rows.map(function(r){
        return '<option value="'+esc(r.name)+'"'+(cur===r.name?" selected":"")+'>'+esc(r.name+(r.detail?" — "+r.detail:""))+"</option>";
      }).join("");
      var aHtml='<div class="origin-picker"><label>'+esc(race.ancestry.label)+'</label><select class="race-sel" data-group="race:ancestry" data-idx="0">'+aopts+"</select>";
      if(cur){var row=race.ancestry.rows.filter(function(r){return r.name===cur;})[0];if(row)aHtml+='<div class="choice-desc">'+esc(row.detail)+"</div>";}
      html+=panelHtml("Draconic Ancestry","",1,"",aHtml+"</div>","race:ancestry:"+race.name+race.source,!cur);
    }
    traits.forEach(function(t){
      var tbody=(t.entries||[]).map(renderEntry).join(""),tch=0,tpend=false;
      if(skills.choose&&t.name===skillTrait){    // host the skill picker inside its own trait
        tbody+=raceSelectHtml("race:skill",skills.choose.from,skills.choose.count,"Choose your skill");
        tch=skills.choose.count;tpend=raceChoiceCount("race:skill",skills.choose.count)<skills.choose.count;
      }
      html+=panelHtml(t.name,"",tch,"",tbody,"racetrait:"+race.name+race.source+t.name,tpend);
    });

    host.innerHTML=html;
    wireCollapse(host);
    Array.prototype.forEach.call(host.querySelectorAll(".race-sel"),function(sel){
      sel.addEventListener("click",function(e){e.stopPropagation();});
      sel.addEventListener("change",function(e){state.raceChoices[sel.getAttribute("data-group")+":"+sel.getAttribute("data-idx")]=e.target.value||"";render();});
    });
    Array.prototype.forEach.call(host.querySelectorAll(".race-feat"),function(sel){
      sel.addEventListener("click",function(e){e.stopPropagation();});
      sel.addEventListener("change",function(e){
        var i=sel.getAttribute("data-idx");
        state.raceChoices["race:feat:"+i]=e.target.value||"";
        for(var q=0;q<4;q++)delete state.raceChoices["race:featab:"+i+":"+q];   // its ability picks no longer apply
        render();
      });
    });
    Array.prototype.forEach.call(host.querySelectorAll(".race-featpick"),function(sel){
      sel.addEventListener("click",function(e){e.stopPropagation();});
      sel.addEventListener("change",function(e){
        state.raceChoices[sel.getAttribute("data-key")]=e.target.value||"";render();
      });
    });
    Array.prototype.forEach.call(host.querySelectorAll(".race-featab"),function(sel){
      sel.addEventListener("click",function(e){e.stopPropagation();});
      sel.addEventListener("change",function(e){
        state.raceChoices["race:featab:"+sel.getAttribute("data-idx")+":"+sel.getAttribute("data-sub")]=e.target.value||"";
        render();
      });
    });
    Array.prototype.forEach.call(host.querySelectorAll(".race-custom-mode"),function(sel){
      sel.addEventListener("click",function(e){e.stopPropagation();});
      sel.addEventListener("change",function(){
        state.raceChoices["race:custom:mode"]=sel.value||"";
        for(var i=0;i<6;i++)delete state.raceChoices["race:custom:a"+i];
        render();
      });
    });
    Array.prototype.forEach.call(host.querySelectorAll(".race-custom-abil"),function(sel){
      sel.addEventListener("click",function(e){e.stopPropagation();});
      sel.addEventListener("change",function(){
        state.raceChoices["race:custom:a"+sel.getAttribute("data-idx")]=sel.value||"";render();
      });
    });
  }
  function renderAbilities(){
    var ab=state.abilities;
    $("abilityMethod").value=ab.method;
    var html="";
    if(ab.method==="pointbuy"){
      var rem=pbRemaining();
      html+='<div class="pb-remaining"><div class="lbl">Points Remaining</div><div class="pts">'+rem+' <span style="color:var(--muted);font-size:16px">/ 27</span></div></div>';
      html+='<div class="abil-assign">'+ABILITIES.map(function(a){
        var cur=ab.base[a]||8,opts="";
        for(var v=8;v<=15;v++){var afford=(POINT_BUY_COST[v]-POINT_BUY_COST[cur])<=rem;opts+='<option value="'+v+'"'+(cur===v?" selected":"")+(afford?"":" disabled")+'>'+v+"</option>";}
        return '<div class="abil-col"><div class="an">'+ABIL_ABBR[a]+'</div><select class="pb-sel" data-ab="'+a+'">'+opts+'</select><div class="tot">Total '+totalScore(a)+"</div></div>";
      }).join("")+"</div>";
    }else{
      var pool=ab.method==="standard"?STANDARD_ARRAY.slice():(ab.rolled||[]);
      if(ab.method==="roll"){
        html+='<div class="roll-bar"><button class="btn" id="rollBtn">'+(ab.rolled?"Re-roll":"Roll 4d6 × 6")+"</button>"+
          (ab.rolled?'<span class="roll-pool">Rolled: '+ab.rolled.join(", ")+"</span>":'<span class="sec-note" style="margin:0">Roll six sets of 4d6 (drop lowest), then assign.</span>')+"</div>";
      }
      if(pool.length){
        var counts={};pool.forEach(function(v){counts[v]=(counts[v]||0)+1;});
        html+='<div class="abil-assign">'+ABILITIES.map(function(a){
          var cur=ab.assign[a]||"";
          var usedBy={};ABILITIES.forEach(function(x){if(x!==a&&ab.assign[x])usedBy[ab.assign[x]]=(usedBy[ab.assign[x]]||0)+1;});
          var opts='<option value="">—</option>',seen={};
          pool.forEach(function(v){if(seen[v])return;seen[v]=1;var remain=counts[v]-(usedBy[v]||0);var ok=remain>0||String(cur)===String(v);opts+='<option value="'+v+'"'+(String(cur)===String(v)?" selected":"")+(ok?"":" disabled")+'>'+v+"</option>";});
          return '<div class="abil-col"><div class="an">'+ABIL_ABBR[a]+'</div><select class="arr-sel" data-ab="'+a+'">'+opts+'</select><div class="tot">Total '+totalScore(a)+"</div></div>";
        }).join("")+"</div>";
      }
    }
    $("abilityAssign").innerHTML=html;

    var bmap=abilityBonusMap();
    $("abilityCalc").innerHTML='<div class="calc-grid">'+ABILITIES.map(function(a){
      var base=baseScore(a),bsum=bonusSum(a),tot=totalScore(a),m=abMod(tot);
      var subs=bmap[a].map(function(b){return '<div class="calc-row sub"><span>'+esc(b.src)+'</span><span class="rv">'+modStr(b.amt)+"</span></div>";}).join("");
      var other=(state.abilities.other[a]!=null?state.abilities.other[a]:"");
      var ov=(state.abilities.override[a]!=null?state.abilities.override[a]:"");
      return '<div class="calc-card"><div class="cc-h">'+a+"</div>"+
        '<div class="calc-row hl"><span>Total Score</span><span class="rv">'+tot+"</span></div>"+
        '<div class="calc-row hl"><span>Modifier</span><span class="rv">'+modStr(m)+"</span></div>"+
        '<div class="calc-row calc-sep"><span>Base Score</span><span class="rv">'+(base==null?"—":base)+"</span></div>"+
        '<div class="calc-row"><span>Bonus</span><span class="rv">'+modStr(bsum)+"</span></div>"+subs+
        '<div class="calc-row"><span>Other Modifier</span><input type="number" class="ab-other" data-ab="'+a+'" value="'+esc(other)+'"></div>'+
        '<div class="calc-row"><span>Override Score</span><input type="number" class="ab-override" data-ab="'+a+'" value="'+esc(ov)+'"></div>'+
        "</div>";
    }).join("")+"</div>";

    Array.prototype.forEach.call($("abilityAssign").querySelectorAll(".pb-sel"),function(s){s.addEventListener("change",function(){state.abilities.base[s.getAttribute("data-ab")]=parseInt(s.value,10);renderAbilities();});});
    Array.prototype.forEach.call($("abilityAssign").querySelectorAll(".arr-sel"),function(s){s.addEventListener("change",function(){state.abilities.assign[s.getAttribute("data-ab")]=s.value;renderAbilities();});});
    var rb=$("abilityAssign").querySelector("#rollBtn");
    if(rb)rb.addEventListener("click",function(){state.abilities.rolled=rollSix();state.abilities.assign={};renderAbilities();});
    Array.prototype.forEach.call($("abilityCalc").querySelectorAll(".ab-other"),function(inp){inp.addEventListener("change",function(){state.abilities.other[inp.getAttribute("data-ab")]=inp.value;renderAbilities();});});
    Array.prototype.forEach.call($("abilityCalc").querySelectorAll(".ab-override"),function(inp){inp.addEventListener("change",function(){state.abilities.override[inp.getAttribute("data-ab")]=inp.value;renderAbilities();});});
  }
  function renderEquipment(){renderStarting();renderItemBrowser();renderCurrency();renderInventory();}
  function renderStarting(){
    var host=$("startingEquip"),eq=state.equipment;
    var cls=state.slug&&window.CC_STARTING?window.CC_STARTING.classes[state.slug]:null;
    var bgKey=state.background?state.background.name+"|"+state.background.source:null;
    var bg=bgKey&&window.CC_STARTING?window.CC_STARTING.backgrounds[bgKey]:null;
    var html='<div class="eq-toggle"><button data-mode="equipment"'+(eq.mode==="equipment"?' class="active"':'')+'>Equipment</button><button data-mode="gold"'+(eq.mode==="gold"?' class="active"':'')+'>Gold</button></div>';
    if(eq.mode==="equipment"){
      if(cls){
        html+='<div class="eq-sub">'+esc(state.className)+' Starting Equipment</div>';
        cls.groups.forEach(function(g,gi){
          html+='<div class="eq-group">';
          if(g.type==="fixed"){html+=g.items.map(function(it){return '<div class="eq-opt eq-fixed">✔ '+esc(it)+"</div>";}).join("");}
          else{
            ["a","b","c"].forEach(function(opt,oi){
              if(!g[opt])return;
              if(oi>0)html+='<div class="eq-or">or</div>';
              var checked=(eq.starting["c"+gi]||"a")===opt;
              html+='<label class="eq-opt"><input type="radio" name="cg'+gi+'" class="eq-radio" data-g="c'+gi+'" data-opt="'+opt+'"'+(checked?" checked":"")+"> "+esc(g[opt].join(", "))+"</label>";
            });
          }
          html+="</div>";
        });
      }
      if(bg){html+='<div class="eq-sub">'+esc(state.background.name)+' Starting Equipment</div><div class="eq-group">'+bg.items.map(function(it){return '<div class="eq-opt eq-fixed">✔ '+esc(it)+"</div>";}).join("")+"</div>";}
      if(!cls&&!bg)html+='<p class="sec-note">Pick a class (step 1) and background (step 2) to see starting equipment.</p>';
      else html+='<button class="btn" id="addStarting"'+(eq.startingAdded?" disabled":"")+'>'+(eq.startingAdded?"✔ Added to inventory":"Add starting equipment to inventory")+"</button>";
    }else{
      var g=(cls&&cls.gold)?cls.gold:"";
      html+='<div class="gold-box"><div class="sec-note" style="margin:0 0 8px">Take starting gold instead of equipment'+(g?" (class: "+esc(g)+" gp"+(bg&&bg.gold?" + background "+bg.gold+" gp":"")+")":"")+'</div><div class="amt" id="goldAmt">'+(eq.currency.gp?eq.currency.gp+" gp":"—")+'</div><button class="btn" id="rollGold">Roll starting gold</button></div>';
    }
    host.innerHTML=html;
    Array.prototype.forEach.call(host.querySelectorAll(".eq-toggle button"),function(b){b.addEventListener("click",function(){state.equipment.mode=b.getAttribute("data-mode");renderStarting();});});
    Array.prototype.forEach.call(host.querySelectorAll(".eq-radio"),function(r){r.addEventListener("change",function(){state.equipment.starting[r.getAttribute("data-g")]=r.getAttribute("data-opt");});});
    var addB=host.querySelector("#addStarting");
    if(addB)addB.addEventListener("click",function(){
      if(cls)cls.groups.forEach(function(g,gi){if(g.type==="fixed")g.items.forEach(addByName);else{var opt=state.equipment.starting["c"+gi]||"a";(g[opt]||[]).forEach(addByName);}});
      if(bg)bg.items.forEach(addByName);
      state.equipment.startingAdded=true;renderStarting();renderInventory();
    });
    var rg=host.querySelector("#rollGold");
    if(rg)rg.addEventListener("click",function(){var amt=(cls&&cls.gold?rollDiceStr(cls.gold):0)+(bg&&bg.gold?bg.gold:0);state.equipment.currency.gp=amt;renderStarting();renderCurrency();});
  }
  function renderItemBrowser(){
    var eq=uiState.equipment;
    var html='<input type="text" id="itemSearch" placeholder="Search items…" value="'+esc(eq.filterQ||"")+'">';
    html+='<div class="type-filters"><button class="tf'+(eq.filterType===""?" active":"")+'" data-t="">ALL</button>'+
      ITEM_TYPES.map(function(t){return '<button class="tf'+(eq.filterType===t?" active":"")+'" data-t="'+esc(t)+'">'+esc(t.toUpperCase())+"</button>";}).join("")+"</div>";
    html+='<div id="itemResults"></div>';
    $("itemBrowser").innerHTML=html;
    var si=$("itemSearch");
    si.addEventListener("input",function(){uiState.equipment.filterQ=si.value;renderItemResults();});
    Array.prototype.forEach.call($("itemBrowser").querySelectorAll(".tf"),function(b){b.addEventListener("click",function(){uiState.equipment.filterType=b.getAttribute("data-t");renderItemBrowser();});});
    renderItemResults();
  }
  function rarBadge(r){
    if(!r||r==="none"||r==="unknown"||r==="unknown (magic)")return "";
    var cls=({uncommon:"rar-uncommon",rare:"rar-rare","very rare":"rar-veryrare",legendary:"rar-legendary",artifact:"rar-legendary"})[r]||"";
    return ' <span class="rar-badge '+cls+'">'+esc(r)+"</span>";
  }
  function renderItemResults(){
    var eq=uiState.equipment,q=(eq.filterQ||"").toLowerCase();
    var list=(window.CC_ITEMS||[]).filter(function(it){
      if(!itemAllowed(it))return false;                 // hide the other edition's core items
      if(eq.filterType&&it.cat!==eq.filterType)return false;
      if(q&&it.name.toLowerCase().indexOf(q)<0)return false;
      return true;
    });
    var cap=150,shown=list.slice(0,cap);
    var html=shown.map(function(it){
      var att=it.attune?" · "+attuneNote(it.attune):"";
      var meta=it.cat+(it.rarity&&it.rarity!=="none"?" · "+it.rarity:"")+(it.dmg?" · "+it.dmg+" "+dmgAbbr(it.dmgType):"")+(it.ac?" · AC "+it.ac:"")+att;
      var full=itemEntriesFull(it),hasDesc=full.length;
      var desc=hasDesc?'<div class="inv-desc">'+full.map(renderEntry).join("")+"</div>":"";
      return '<div class="inv-res-item"><div class="item-row"><div class="res-name-click">'+
        '<div class="nm">'+esc(it.name)+rarBadge(it.rarity)+(hasDesc?' <span class="inv-chev">&#9662;</span>':"")+'</div>'+
        '<div class="meta">'+esc(meta)+" · "+srcTag(it.source)+'</div></div>'+
        '<button class="add" data-name="'+esc(it.name)+'" data-source="'+esc(it.source)+'">ADD</button></div>'+desc+"</div>";
    }).join("")||'<div class="results-note">No items match.</div>';
    if(list.length>cap)html+='<div class="results-note">Showing '+cap+" of "+list.length+" — refine your search.</div>";
    $("itemResults").innerHTML=html;
    Array.prototype.forEach.call($("itemResults").querySelectorAll(".add"),function(b){
      b.addEventListener("click",function(e){
        e.stopPropagation();
        var it=(window.CC_ITEMS||[]).filter(function(x){return x.name===b.getAttribute("data-name")&&x.source===b.getAttribute("data-source");})[0];
        if(it){addItemObj(it);renderInventory();}
      });
    });
    Array.prototype.forEach.call($("itemResults").querySelectorAll(".res-name-click"),function(n){
      n.addEventListener("click",function(){n.parentNode.parentNode.classList.toggle("open");});
    });
  }
  function renderCurrency(){
    var c=state.equipment.currency;
    var coins=[["pp","Platinum","10 gp"],["gp","Gold","—"],["ep","Electrum","5 sp"],["sp","Silver","10 cp"],["cp","Copper","—"]];
    var html='<div class="gp-total">Total in GP: <span id="gpTotal">'+(Math.round(currencyGP()*100)/100)+'</span></div><div class="currency-grid">';
    html+=coins.map(function(k){return '<div class="coin"><div class="cn">'+k[1]+'</div><div class="csub">'+k[2]+'</div><input type="number" min="0" class="cur-inp" data-k="'+k[0]+'" value="'+(c[k[0]]||0)+'"></div>';}).join("");
    $("currencyPanel").innerHTML=html+"</div>";
    Array.prototype.forEach.call($("currencyPanel").querySelectorAll(".cur-inp"),function(inp){
      inp.addEventListener("input",function(){state.equipment.currency[inp.getAttribute("data-k")]=parseInt(inp.value,10)||0;$("gpTotal").textContent=Math.round(currencyGP()*100)/100;});
    });
  }
  function renderInventory(){
    var inv=state.equipment.inventory,dex=abMod(totalScore("Dexterity"));
    var html='<div class="stat-box"><div><div class="sv">'+computeAC()+'</div><div class="sl">Armor Class</div></div><div><div class="sv">'+modStr(dex)+'</div><div class="sl">Initiative</div></div><div><div class="sv">'+inv.length+'</div><div class="sl">Items</div></div></div>';
    if(!inv.length)html+='<p class="sec-note">No items yet. Add starting equipment or browse above.</p>';
    inv.forEach(function(it,i){
      var att=itemAttune(it),info=itemInfo(it.name,it.source),full=itemEntriesFull(it),hasDesc=full.length;
      var meta=it.cat+(it.rarity&&it.rarity!=="none"?" · "+it.rarity:"")+(it.dmg?" · "+it.dmg+" "+dmgAbbr(it.dmgType):"")+(it.ac&&it.armorKind!=="shield"?" · AC "+it.ac:"")+(it.armorKind==="shield"?" · +"+(it.ac||2)+" AC":"")+(att?" · "+attuneNote(att):"");
      var ctrl='<input type="number" min="1" class="inv-qty" data-i="'+i+'" value="'+esc(it.qty||1)+'">';
      var eqi=equipInfo(it);
      if(eqi.ok){
        ctrl+='<button class="equip-btn'+(it.equipped?" on":"")+'" data-i="'+i+'">'+eqi.verb+"</button>";
      }
      ctrl+='<button class="rm-btn" data-i="'+i+'" title="Remove">×</button>';
      var desc=hasDesc?'<div class="inv-desc">'+full.map(renderEntry).join("")+"</div>":"";
      html+='<div class="inv-item'+(hasDesc?" has-desc":"")+'"><div class="inv-row"><div class="inv-main" data-i="'+i+'"><div class="nm">'+esc(it.name)+rarBadge(it.rarity)+(it.generic?' <span class="meta">(no stats)</span>':"")+(hasDesc?' <span class="inv-chev">&#9662;</span>':"")+'</div><div class="meta">'+esc(meta)+(it.source?" · "+srcTag(it.source):"")+'</div></div><div class="ctrl">'+ctrl+"</div></div>"+desc+"</div>";
    });
    $("inventoryPanel").innerHTML=html;
    Array.prototype.forEach.call($("inventoryPanel").querySelectorAll(".inv-qty"),function(inp){inp.addEventListener("change",function(){inv[+inp.getAttribute("data-i")].qty=parseInt(inp.value,10)||1;});});
    Array.prototype.forEach.call($("inventoryPanel").querySelectorAll(".equip-btn"),function(b){b.addEventListener("click",function(){
      var it=inv[+b.getAttribute("data-i")];
      if(!it.equipped&&it.armorKind&&it.armorKind!=="shield"){inv.forEach(function(x){if(x.armorKind&&x.armorKind!=="shield")x.equipped=false;});}
      it.equipped=!it.equipped;renderInventory();
    });});
    Array.prototype.forEach.call($("inventoryPanel").querySelectorAll(".rm-btn"),function(b){b.addEventListener("click",function(){inv.splice(+b.getAttribute("data-i"),1);renderInventory();});});
    Array.prototype.forEach.call($("inventoryPanel").querySelectorAll(".inv-item.has-desc .inv-main"),function(m){m.addEventListener("click",function(){m.parentNode.parentNode.classList.toggle("open");});});
  }
  function spRowHtml(s,kind,selArr,disableUnsel){
    var k=spKey(s),sel=selArr.indexOf(k)>=0;
    var meta=s.school+(s.range?" · "+s.range:"")+(s.comp?" · "+s.comp:"")+(s.conc?" · Conc.":"")+(s.ritual?" · Ritual":"");
    return '<div class="sp-row'+(sel?" sel":"")+'"><input type="checkbox" class="sp-chk" data-kind="'+kind+'" data-key="'+esc(k)+'"'+(sel?" checked":"")+((!sel&&disableUnsel)?" disabled":"")+'>'+
      '<div class="sp-info" data-key="'+esc(k)+'"><div class="nm">'+esc(s.name)+'</div><div class="meta">'+esc(meta)+" · "+srcTag(s.source)+"</div></div>"+
      (kind==="spell"?'<span class="lv">'+(s.level===0?"Cantrip":"Lvl "+s.level)+"</span>":"")+"</div>";
  }
  function spellDetailHtml(s){
    if(!s)return '<p class="sec-note" style="margin:0">Hover or click a spell to see what it does.</p>';
    var lvl=s.level===0?(s.school+" Cantrip"):(ordinal(s.level)+"-level "+s.school);
    var higher=(s.higher&&s.higher.length)?'<p><span class="sub-h">At Higher Levels.</span> '+s.higher.map(function(e){return typeof e==="string"?renderTags(e):renderEntry(e);}).join(" ")+"</p>":"";
    return '<div class="sd-name">'+esc(s.name)+'</div><div class="sd-sub">'+esc(lvl)+(s.ritual?" (ritual)":"")+"</div>"+
      '<div class="sd-row"><b>Casting Time:</b> '+esc(s.time||"—")+"</div>"+
      '<div class="sd-row"><b>Range:</b> '+esc(s.range||"—")+"</div>"+
      '<div class="sd-row"><b>Components:</b> '+esc(s.compFull||"—")+"</div>"+
      '<div class="sd-row"><b>Duration:</b> '+esc(s.duration||"—")+"</div>"+
      '<div class="sd-body">'+(s.entries||[]).map(renderEntry).join("")+higher+"</div>";
  }
  function showSpellDetail(key){var p=$("spellDetail");if(p)p.innerHTML=spellDetailHtml(spellByKey(key));}
  function wireSpellRows(container){
    Array.prototype.forEach.call(container.querySelectorAll(".sp-chk"),wireSpellChk);
    Array.prototype.forEach.call(container.querySelectorAll(".sp-info"),function(el){
      el.addEventListener("mouseenter",function(){showSpellDetail(el.getAttribute("data-key"));});
      el.addEventListener("click",function(){uiState.spells.preview=el.getAttribute("data-key");showSpellDetail(el.getAttribute("data-key"));});
    });
  }
  function renderSpells(){
    var host=$("spellsPanel");
    if(!state.className){host.innerHTML='<p class="sec-note">Choose a class first (step 1).</p>';return;}
    var info=spellInfo();
    if(!info){host.innerHTML='<p class="sec-note"><b>'+esc(state.className)+'</b> has no class spellcasting. (Some subclasses grant spells — not handled here yet.)</p>';return;}
    var spell=spellPresentation(info,true);
    var dc=spell.saveDC,atk=spell.attack;
    var selC=state.spells.cantrips,selS=state.spells.spells;
    function stat(v,l){return '<div><div class="sv">'+v+'</div><div class="sl">'+l+"</div></div>";}
    var html='<div class="sc-summary">'+stat(esc(info.ability),"Ability")+stat(dc,"Spell Save DC")+stat(modStr(atk),"Spell Attack")+stat(info.maxLevel||"—","Max Spell Level")+stat(selC.length+"/"+info.cantripsKnown,"Cantrips")+stat(selS.length+"/"+info.spellsCount,(info.prepared?"Prepared":"Known"))+"</div>";

    // spell slots available at this level
    var sl=info.sc.slots,slotBadges="";
    if(sl&&sl.type==="slots"){
      var row=sl.rows[state.level-1]||[];
      for(var si=0;si<row.length;si++){if(row[si]>0)slotBadges+='<span class="slot-badge"><b>'+row[si]+'</b> &times; '+ordinal(si+1)+"</span>";}
    }else if(sl&&sl.type==="pact"){
      var pc=sl.count[state.level-1]||0,plv=sl.level[state.level-1]||0;
      if(pc>0)slotBadges='<span class="slot-badge"><b>'+pc+"</b> &times; "+ordinal(plv)+" (Pact Magic)</span>";
    }
    if(slotBadges)html+='<div class="slot-row"><span class="slot-label">Spell Slots</span>'+slotBadges+"</div>";

    var left="";
    if(info.cantripsKnown>0){
      var cList=classSpellList(0,0).sort(function(a,b){return a.name.localeCompare(b.name);});
      var cFull=selC.length>=info.cantripsKnown;
      left+='<div class="spell-head"><h3>Cantrips</h3><span class="spell-count '+(cFull?"done":"need")+'">'+selC.length+" / "+info.cantripsKnown+"</span></div>";
      left+='<div class="spell-list" id="cantripList">'+cList.map(function(s){return spRowHtml(s,"cantrip",selC,cFull);}).join("")+"</div>";
    }
    if(info.spellsCount>0&&info.maxLevel>0){
      var sFull=selS.length>=info.spellsCount;
      left+='<div class="spell-head"><h3>'+(info.prepared?"Spells Prepared":"Spells Known")+'</h3><span class="spell-count '+(sFull?"done":"need")+'">'+selS.length+" / "+info.spellsCount+"</span></div>";
      left+='<input type="text" id="spellSearch" placeholder="Search spells…" value="'+esc(uiState.spells.q||"")+'">';
      var tabs='<button class="lt'+(uiState.spells.levelFilter===""?" active":"")+'" data-l="">All</button>';
      for(var lv=1;lv<=info.maxLevel;lv++)tabs+='<button class="lt'+(uiState.spells.levelFilter===String(lv)?" active":"")+'" data-l="'+lv+'">Lvl '+lv+"</button>";
      left+='<div class="lvl-tabs">'+tabs+'</div><div class="spell-list" id="spellResults"></div>';
    }
    html+='<div class="spells-cols"><div class="spells-left">'+left+'</div><div class="spells-right"><div id="spellDetail" class="spell-detail">'+spellDetailHtml(uiState.spells.preview?spellByKey(uiState.spells.preview):null)+"</div></div></div>";
    host.innerHTML=html;
    wireSpellRows(host);        // wire cantrip rows while #spellResults is still empty (avoids double-wiring)
    renderSpellResults();       // populates + wires #spellResults rows once
    var ss=host.querySelector("#spellSearch");
    if(ss)ss.addEventListener("input",function(){uiState.spells.q=ss.value;renderSpellResults();});
    Array.prototype.forEach.call(host.querySelectorAll(".lt"),function(b){b.addEventListener("click",function(){uiState.spells.levelFilter=b.getAttribute("data-l");renderSpells();});});
  }
  function wireSpellChk(chk){
    chk.addEventListener("change",function(){
      var kind=chk.getAttribute("data-kind"),key=chk.getAttribute("data-key");
      var arr=kind==="cantrip"?state.spells.cantrips:state.spells.spells;
      var info=spellInfo(),max=kind==="cantrip"?info.cantripsKnown:info.spellsCount;
      var i=arr.indexOf(key);
      if(i>=0)arr.splice(i,1);
      else if(arr.length<max)arr.push(key);
      var sr=$("spellResults"),st=sr?sr.scrollTop:0;   // preserve scroll across re-render
      var cl=$("cantripList"),ct=cl?cl.scrollTop:0;
      renderSpells();
      var sr2=$("spellResults");if(sr2)sr2.scrollTop=st;
      var cl2=$("cantripList");if(cl2)cl2.scrollTop=ct;
    });
  }
  function renderSpellResults(){
    var box=$("spellResults");if(!box)return;
    var info=spellInfo(),q=(uiState.spells.q||"").toLowerCase(),lf=uiState.spells.levelFilter;
    var lo=lf?parseInt(lf,10):1,hi=lf?parseInt(lf,10):info.maxLevel;
    var list=classSpellList(lo,hi).filter(function(s){return !q||s.name.toLowerCase().indexOf(q)>=0;});
    list.sort(function(a,b){return a.level-b.level||a.name.localeCompare(b.name);});
    var sFull=state.spells.spells.length>=info.spellsCount;
    box.innerHTML=list.map(function(s){return spRowHtml(s,"spell",state.spells.spells,sFull);}).join("")||'<div class="results-note">No spells match.</div>';
    wireSpellRows(box);
  }
  function renderHeader(){
    var hasClass=!!state.className;
    var cp=$("charPortrait");if(cp)cp.innerHTML=state.portrait?'<img src="'+esc(state.portrait)+'">':"&#9670;";
    $("classCard").classList.toggle("hidden",!hasClass);
    $("noClassMsg").classList.toggle("hidden",hasClass);
    $("featuresWrap").classList.toggle("hidden",!hasClass);
    if(hasClass){
      $("ccName").textContent=state.className;
      /* A sidekick's hit die belongs to the creature, not the class, so it is chosen here
         rather than stated - by size, as the sidekick rules set it. */
      if(isSidekickClass()){
        var HD=[[4,"Tiny"],[6,"Small"],[8,"Medium"],[10,"Large"],[12,"Huge"],[20,"Gargantuan"]];
        $("ccSub").innerHTML=srcTag(state.source)+' • hit die <select id="skHd">'+
          HD.map(function(h){
            return '<option value="'+h[0]+'"'+(state.hdFaces===h[0]?" selected":"")+">d"+h[0]+" ("+h[1]+")</option>";
          }).join("")+"</select>";
      }else{
        $("ccSub").innerHTML=srcTag(state.source)+" • d"+state.hdFaces+" hit die";
      }
      var skHd=$("skHd");
      if(skHd)skHd.addEventListener("change",function(e){
        state.hdFaces=parseInt(e.target.value,10)||8;
        state.manualHp=null;                       // the automatic total changes with the die
        render();
      });
      $("classEmblem").textContent=state.className.charAt(0);
    }
    $("lvlDisplay").textContent=state.level;
    var auto=autoHp(state.hdFaces,state.level);
    var shown=(state.manualHp!=null)?state.manualHp:auto;
    $("hpDisplay").textContent=(shown!=null)?shown:"—";
    $("hdDisplay").textContent=state.hdFaces?(state.level+"d"+state.hdFaces):"—";
    var note=$("hpNote");
    if(!hasClass)note.textContent="";
    else if(state.manualHp!=null)note.textContent="Manual HP set. (Auto would be "+auto+".)";
    else note.textContent="Auto HP shown without a Constitution modifier — that comes in a later step. Use Manage HP to override.";
  }
  function renderStep(step){
    var steps={"class":function(){renderHeader();if(derivedState.fdata)renderFeatures();else $("featureList").innerHTML="";},background:function(){renderBackground();renderDetails();},species:renderRace,abilities:renderAbilities,equipment:renderEquipment,spells:renderSpells};
    if(!steps[step])throw new Error("Unknown creator step: "+step);
    steps[step]();
  }
    return {renderHeader:renderHeader,renderStep:renderStep,renderFeatures:renderFeatures,wireCollapse:wireCollapse,panelHtml:panelHtml,renderBackground:renderBackground,renderDetails:renderDetails,renderRace:renderRace,renderAbilities:renderAbilities,renderEquipment:renderEquipment,renderStarting:renderStarting,renderItemBrowser:renderItemBrowser,rarBadge:rarBadge,renderItemResults:renderItemResults,renderCurrency:renderCurrency,renderInventory:renderInventory,spRowHtml:spRowHtml,spellDetailHtml:spellDetailHtml,showSpellDetail:showSpellDetail,wireSpellRows:wireSpellRows,renderSpells:renderSpells,wireSpellChk:wireSpellChk,renderSpellResults:renderSpellResults};
  }
  root.CCCreatorUI={create:create};
  if(typeof module!=="undefined"&&module.exports)module.exports={create:create};
})(typeof window!=="undefined"?window:globalThis);
