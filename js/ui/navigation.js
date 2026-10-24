(function(root){
  "use strict";
  function create(context){
    var state=context.character,uiState=context.ui,derivedState=context.derived;
    var window=context.window,document=context.document;
    var alert=context.actions.alert,confirm=context.actions.confirm;
    function $(id){return document.getElementById(id);}
    var render=context.adapters.render;
    var renderRecents=context.adapters.renderRecents;
    var ICON=context.constants.ICON;
  function showEdition(){
    context.actions.invalidateLoads();
    uiState.screen="edition";
    $("screen-build").classList.add("hidden");$("screen-edition").classList.remove("hidden");
    renderRecents();
    context.actions.refreshLibrary();
  }
  function setStep(step){
    uiState.currentStep=step;
    $("step-class").classList.toggle("hidden",step!=="class");
    $("step-background").classList.toggle("hidden",step!=="background");
    $("step-species").classList.toggle("hidden",step!=="species");
    $("step-abilities").classList.toggle("hidden",step!=="abilities");
    $("step-equipment").classList.toggle("hidden",step!=="equipment");
    $("step-spells").classList.toggle("hidden",step!=="spells");
    $("step-sheet").classList.toggle("hidden",step!=="sheet");
    Array.prototype.forEach.call(document.querySelectorAll(".step"),function(b){b.classList.toggle("active",b.getAttribute("data-step")===step);});
    var labels={"class":"1 · Class & Features",background:"2 · Background & Details",species:"3 · Species",abilities:"4 · Ability Scores",equipment:"5 · Equipment",spells:"6 · Spells",sheet:"7 · Character Sheet"};
    var mb=$("menuBtn");if(mb)mb.innerHTML="☰";
    var sm=$("stepsMenu");if(sm)sm.classList.remove("open");
    var sb=$("saveBtn");if(sb){sb.classList.toggle("hidden",!state.className);sb.innerHTML=ICON.save;}
    var pb=$("pdfBtn");if(pb){pb.classList.toggle("hidden",!state.className);pb.innerHTML=ICON.pdf;}
    var wrap=document.querySelector(".wrap");if(wrap)wrap.classList.toggle("wide",step==="sheet");
    render();               // always refresh the page we're navigating to with the latest state
    window.scrollTo(0,0);
  }
  function showBuild(step){uiState.screen="build";$("screen-edition").classList.add("hidden");$("screen-build").classList.remove("hidden");setStep(step||"class");}
    var mounted=false;
    function mount(){
      if(mounted)return;mounted=true;
      Array.prototype.forEach.call(document.querySelectorAll(".ed-card"),function(card){
        card.addEventListener("click",function(){context.actions.chooseEdition(card.getAttribute("data-edition"));});
      });
      $("changeEdition").addEventListener("click",context.actions.home);
      $("saveBtn").addEventListener("click",context.actions.save);
      $("btnLoadStart").addEventListener("click",context.actions.load);
      $("pdfBtn").addEventListener("click",context.actions.print);
  // wizard step navigation
  /* Now that the menu floats over the page it has to be dismissable without picking a
     step, so clicking away from it or pressing Escape closes it. */
  $("menuBtn").addEventListener("click",function(e){
    e.stopPropagation();
    $("stepsMenu").classList.toggle("open");
  });
  document.addEventListener("click",function(e){
    var m=$("stepsMenu");
    if(!m||!m.classList.contains("open"))return;
    if(m.contains(e.target)||e.target===$("menuBtn"))return;   // inside the menu, or the button itself
    m.classList.remove("open");
  });
  document.addEventListener("keydown",function(e){
    if(e.key!=="Escape")return;
    var m=$("stepsMenu");
    if(m)m.classList.remove("open");
  });

  Array.prototype.forEach.call(document.querySelectorAll(".step"),function(b){b.addEventListener("click",function(){setStep(b.getAttribute("data-step"));});});

      var links={"toBackground": "background", "toClass": "class", "toSpecies": "species", "toBackground2": "background", "toAbilities": "abilities", "toSpecies2": "species", "toEquipment": "equipment", "toAbilities2": "abilities", "toSpells": "spells", "toEquipment2": "equipment", "toSheet": "sheet", "toSpells2": "spells"};
      Object.keys(links).forEach(function(id){$(id).addEventListener("click",function(){setStep(links[id]);});});
    }
    return {mount:mount,showEdition:showEdition,setStep:setStep,showBuild:showBuild};
  }
  root.CCNavigationUI={create:create};
  if(typeof module!=="undefined"&&module.exports)module.exports={create:create};
})(typeof window!=="undefined"?window:globalThis);
