/* Runs in <head> before styles/data: browser preference is independent of saves. */
(function(root){
  "use strict";
  var key="cc-theme",preference=null,button=null;
  var media=root.matchMedia?root.matchMedia("(prefers-color-scheme: dark)"):null;
  try{var stored=root.localStorage.getItem(key);if(stored==="dark"||stored==="light")preference=stored;}catch(error){}
  function current(){return preference||(media&&media.matches?"dark":"light");}
  function apply(){
    var dark=current()==="dark";
    document.documentElement.setAttribute("data-theme",dark?"dark":"light");
    if(document.body)document.body.classList.toggle("dark",dark);
    if(button){
      button.textContent=dark?"Light mode":"Dark mode";
      button.setAttribute("aria-label",dark?"Switch to light mode":"Switch to dark mode");
      button.setAttribute("aria-pressed",dark?"true":"false");
      button.title=dark?"Switch to light mode":"Switch to dark mode";
    }
  }
  function set(value){
    if(value!=="dark"&&value!=="light")return;
    preference=value;
    try{root.localStorage.setItem(key,value);}catch(error){}
    apply();
  }
  function mount(){
    button=document.getElementById("darkToggle");
    if(button)button.addEventListener("click",function(){set(current()==="dark"?"light":"dark");});
    apply();
  }
  apply();
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);
  else mount();
  if(media&&media.addEventListener)media.addEventListener("change",function(){if(!preference)apply();});
  if(root.addEventListener)root.addEventListener("storage",function(event){
    if(event.key===key||event.key===null){preference=event.newValue==="dark"||event.newValue==="light"?event.newValue:null;apply();}
  });
  root.CCTheme={get:current,set:set};
})(window);
