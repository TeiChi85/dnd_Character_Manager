(function(root){
  "use strict";
  function create(context){
    var state=context.character,uiState=context.ui,derivedState=context.derived;
    var window=context.window,document=context.document;
    var alert=context.actions.alert,confirm=context.actions.confirm;
    function $(id){return document.getElementById(id);}
    function syncShell(){
      if(!document.body||!document.body.classList)return;
      var sheet=uiState.screen==="build"&&uiState.currentStep==="sheet";
      document.body.classList.toggle("cm-view",uiState.screen==="edition"||sheet);
      [["mobileLibrary",uiState.screen==="edition"],["mobileCharacter",sheet],["mobileBuild",!sheet&&uiState.screen==="build"]].forEach(function(pair){
        var button=$(pair[0]);if(!button)return;
        button.setAttribute("aria-current",pair[1]?"page":"false");
        if(pair[0]!=="mobileLibrary")button.disabled=!state.className;
      });
    }
    var render=context.adapters.render;
    var renderRecents=context.adapters.renderRecents;
    var ICON=context.constants.ICON;
  function showEdition(){
    context.actions.invalidateLoads();
    uiState.screen="edition";
    $("screen-build").classList.add("hidden");$("screen-edition").classList.remove("hidden");
    renderRecents();
    context.actions.refreshLibrary();
    syncShell();
  }
  function setStep(step){
    uiState.currentStep=step;
    syncShell();
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
      function bind(id,action){var node=$(id);if(node)node.addEventListener("click",action);}
      bind("createNew",function(){var box=$("createOptions"),opening=box.classList.contains("hidden");box.classList.toggle("hidden",!opening);$("createNew").setAttribute("aria-expanded",String(opening));});
      bind("mobileLibrary",function(){if(context.actions.canNavigate&&!context.actions.canNavigate())return;showEdition();remember("library");});
      bind("mobileCharacter",function(){if(state.className){showBuild("sheet");remember("character");}});
      bind("mobileBuild",function(){if(state.className){showBuild("class");remember("build");}});
      bind("mobileEdit",function(){$("characterActions").close();showBuild("class");});
      bind("mobileExport",function(){$("characterActions").close();context.actions.save();});
      bind("mobilePrint",function(){$("characterActions").close();context.actions.print();});
      bind("actionsClose",function(){$("characterActions").close();});
      if(window.matchMedia){var mobile=window.matchMedia("(max-width: 1023px)");if(mobile.addEventListener)mobile.addEventListener("change",function(){if(uiState.currentStep==="sheet")render();});}
      function remember(view){if(window.history&&window.history.pushState)window.history.pushState({cmView:view},"","#"+view);}
      if(window.addEventListener)window.addEventListener("popstate",function(event){
        var section=$("sectionDialog"),actions=$("characterActions");
        if(section&&section.open){section.close();return;}if(actions&&actions.open){actions.close();return;}
        if(context.actions.canNavigate&&!context.actions.canNavigate())return;
        var view=event.state&&event.state.cmView;
        if(view==="library"||!view)showEdition();else if(state.className)showBuild(view==="build"?"class":"sheet");
      });
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
    return {mount:mount,showEdition:showEdition,setStep:setStep,showBuild:showBuild,syncShell:syncShell};
  }
  root.CCNavigationUI={create:create};
  if(typeof module!=="undefined"&&module.exports)module.exports={create:create};
})(typeof window!=="undefined"?window:globalThis);
