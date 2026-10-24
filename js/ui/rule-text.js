(function(root){
  "use strict";
  function create(context){
    var state=context.character,uiState=context.ui,derivedState=context.derived;
    var window=context.window,document=context.document;
    var alert=context.actions.alert,confirm=context.actions.confirm;
    function $(id){return document.getElementById(id);}
    var capital=context.adapters.capital;
    var esc=context.adapters.esc;
    var ordinal=context.adapters.ordinal;
    var spellByName=context.adapters.spellByName;
    var CONDITION_INFO=context.constants.CONDITION_INFO;
    var SKILL_ABILITY=context.constants.SKILL_ABILITY;
  function atkText(code){var m={"mw":"Melee Weapon Attack:","rw":"Ranged Weapon Attack:","mw,rw":"Melee or Ranged Weapon Attack:","ms":"Melee Spell Attack:","rs":"Ranged Spell Attack:","ms,rs":"Melee or Ranged Spell Attack:"};return m[code]||"Attack:";}
  function tagExplain(tag,key){
    var k=String(key||"").toLowerCase();
    if(tag==="condition"||tag==="status")return CONDITION_INFO[k]||("Condition: "+capital(k));
    if(tag==="skill"){var ab=SKILL_ABILITY[key]||SKILL_ABILITY[capital(k)];return ab?ab+" ("+key+") check":"Skill: "+key;}
    if(tag==="spell"){var s=spellByName(key);return s?((s.level===0?"Cantrip":ordinal(s.level)+"-level")+" "+(s.school||"")+" spell"):"Spell: "+key;}
    if(tag==="sense")return "Sense: "+capital(k);
    if(tag==="action")return "Action in combat: "+key;
    if(tag==="item")return "Item: "+key;
    if(tag==="disease")return "Disease: "+key;
    if(tag==="hazard")return "Hazard: "+key;
    if(tag==="creature")return "Creature: "+key;
    return "";
  }
  function linkSpan(txt,title){return '<span class="tag-link"'+(title?' title="'+esc(title)+'"':"")+">"+txt+"</span>";}
  function tagHtml(tag,content){
    var p=content.split("|"),txt;
    switch(tag){
      case"b":case"bold":return"<strong>"+p[0]+"</strong>";
      case"i":case"italic":case"nsw":return"<em>"+p[0]+"</em>";
      case"u":return"<u>"+p[0]+"</u>";
      case"s":case"strike":return"<s>"+p[0]+"</s>";
      case"note":return'<span class="tag-note">'+p[0]+"</span>";
      case"h":return"<strong>Hit:</strong> ";
      case"dc":return'<span class="tag-roll">DC '+p[0]+"</span>";
      case"damage":case"scaledamage":
        txt=(p[1]&&p[1]!=="")?p[1]:p[0];return'<span class="tag-dmg">'+txt+"</span>";
      case"dice":case"scaledice":case"d20":case"hit":
        txt=(p[1]&&p[1]!=="")?p[1]:p[0];return'<span class="tag-roll">'+txt+"</span>";
      case"chance":return'<span class="tag-roll">'+p[0]+" percent</span>";
      case"recharge":return"(Recharge "+(p[0]||"6")+")";
      case"atk":return"<em>"+atkText(p[0])+"</em> ";
      case"filter":case"book":case"quickref":case"adventure":case"footnote":case"area":
        return linkSpan(p[0],"");
      case"deity":  // name|pantheon|source|display — display is 4th, not 3rd
        txt=(p[3]&&p[3]!=="")?p[3]:p[0];return linkSpan(txt,"");
      default:
        txt=(p.length>=3&&p[2])?p[2]:p[0];return linkSpan(txt,tagExplain(tag,p[0]));
    }
  }
  function renderTags(s){
    s=esc(s);
    var re=/\{@(\w+)\s*([^{}]*)\}/,m,guard=0;
    while((m=re.exec(s))&&guard++<800){
      var html=tagHtml(m[1],(m[2]||"").trim());
      s=s.slice(0,m.index)+html+s.slice(m.index+m[0].length);
    }
    return s;
  }
  function renderEntry(e){
    if(e==null)return"";
    if(typeof e==="string")return"<p>"+renderTags(e)+"</p>";
    var t=e.type;
    if(t==="entries"||t==="section"||t===undefined){
      var lead=e.name?'<span class="sub-h">'+esc(e.name)+".</span> ":"";
      var inner=(e.entries||[]).map(renderEntry).join("");
      if(e.name&&inner.indexOf("<p>")===0)inner=inner.replace("<p>","<p>"+lead),lead="";
      return (lead?"<p>"+lead+"</p>":"")+inner;
    }
    if(t==="list"){
      return "<ul>"+(e.items||[]).map(function(it){return "<li>"+renderInline(it)+"</li>";}).join("")+"</ul>";
    }
    if(t==="item"){
      var nm=e.name?'<span class="sub-h">'+esc(e.name)+"</span> ":"";
      var body=(e.entries||e.entry?[].concat(e.entry||e.entries):[]).map(renderInline).join(" ");
      return nm+body;
    }
    if(t==="table"){
      var head=(e.colLabels||[]).map(function(c){return "<th>"+renderTags(c)+"</th>";}).join("");
      var rows=(e.rows||[]).map(function(r){
        return "<tr>"+r.map(function(c){return "<td>"+renderInline(c)+"</td>";}).join("")+"</tr>";
      }).join("");
      var cap=e.caption?"<caption style='text-align:left;font-weight:700;margin-bottom:4px'>"+esc(e.caption)+"</caption>":"";
      return "<table class='ent'>"+cap+(head?"<thead><tr>"+head+"</tr></thead>":"")+"<tbody>"+rows+"</tbody></table>";
    }
    if(t==="inset"||t==="insetReadaloud"){
      var n=e.name?"<p><strong>"+esc(e.name)+"</strong></p>":"";
      return "<div class='inset'>"+n+(e.entries||[]).map(renderEntry).join("")+"</div>";
    }
    if(t==="quote"){return "<blockquote class='ent'>"+(e.entries||[]).map(renderEntry).join("")+"</blockquote>";}
    if(t==="options"){
      var note=e.count?"<p class='tag-note'>Choose "+esc(e.count)+".</p>":"";
      return note+(e.entries||[]).map(renderEntry).join("");
    }
    if(t==="abilityDc"){
      return "<p><strong>Spell save DC</strong> = 8 + your proficiency bonus + your "+esc((e.attributes||[]).join(" or ")||"spellcasting ability")+" modifier</p>";
    }
    if(t==="refClassFeature"||t==="refSubclassFeature"){
      var key=e.classFeature||e.subclassFeature;
      var ref=derivedState.fdata&&derivedState.fdata.refLookup?derivedState.fdata.refLookup[key]:null;
      if(!ref)return "";
      var h=ref.name?"<p><span class='sub-h'>"+esc(ref.name)+"</span></p>":"";
      return h+(ref.entries||[]).map(renderEntry).join("");
    }
    if(e.entries)return (e.entries||[]).map(renderEntry).join("");
    return "";
  }
  function renderInline(x){
    if(typeof x==="string")return renderTags(x);
    return renderEntry(x).replace(/^<p>/,"").replace(/<\/p>$/,"");
  }
    return {atkText:atkText,tagExplain:tagExplain,linkSpan:linkSpan,tagHtml:tagHtml,renderTags:renderTags,renderEntry:renderEntry,renderInline:renderInline};
  }
  root.CCRuleTextUI={create:create};
  if(typeof module!=="undefined"&&module.exports)module.exports={create:create};
})(typeof window!=="undefined"?window:globalThis);
