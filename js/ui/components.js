(function(root){
  "use strict";
  function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}
  // HTML-valued arguments are trusted renderer output; labels always escape.
  function card(title,body){return body?'<div class="sheet-card"><h3>'+esc(title)+'</h3><div class="cbody">'+body+"</div></div>":"";}
  function value(v,label,why){
    return '<div class="top-stat'+(why?" has-why":"")+'"'+(why?' title="'+esc(why)+'"':"")+'>'+
      '<div class="tv">'+v+'</div><div class="tl">'+esc(label)+"</div></div>";
  }
  function panel(p){
    var dot=p.pending?'<span class="fx-dot">!</span>':"";
    return '<div class="feature'+(p.open?"":" collapsed")+(p.pending?" needs":"")+'" data-key="'+esc(p.key)+'">'+
      '<div class="fx-head">'+dot+'<span class="fx-name">'+esc(p.name)+'</span>'+
      '<span class="fx-choices">'+(p.subtitleHTML||"")+'</span>'+(p.badgeHTML||"")+
      '<span class="chev">▾</span></div><div class="fx-body">'+(p.bodyHTML||"")+'</div></div>';
  }
  function on(node,type,key,callback){
    if(!node)return;
    var bindings=node._ccUIBindings||(node._ccUIBindings={}),id=type+":"+key;
    if(bindings[id]&&node.removeEventListener)node.removeEventListener(type,bindings[id]);
    bindings[id]=callback;node.addEventListener(type,callback);
  }
  function collapse(container,onToggle){
    Array.prototype.forEach.call(container.querySelectorAll(".fx-head"),function(head){
      on(head,"click","collapse",function(){
        var panel=head.parentNode;panel.classList.toggle("collapsed");
        onToggle(panel.getAttribute("data-key"),!panel.classList.contains("collapsed"));
      });
    });
  }
  var api={esc:esc,card:card,value:value,panel:panel,on:on,collapse:collapse};
  root.CCUIComponents=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
