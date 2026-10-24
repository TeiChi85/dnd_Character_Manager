(function(root){
  "use strict";
  function create(context){
    var document=context.document,uiState=context.ui;
    function $(id){return document.getElementById(id);}
    function setText(id,text){$(id).textContent=text;}
    var lastItems=[],lastMessage="",search=$("librarySearch");
    if(search)search.addEventListener("input",function(){onList(lastItems,lastMessage);});
    function confirmDelete(item){
        return new Promise(function(resolve){
          var dialog=$("deleteDialog"),settled=false,trigger=document.activeElement;
          setText("deleteCharacterName",item.name||"Unnamed character");
          function finish(confirmed){
            if(settled)return;settled=true;
            if(dialog.open)dialog.close();
            dialog.oncancel=dialog.onclose=dialog.onclick=null;
            $("deleteCancel").onclick=$("deleteClose").onclick=$("deleteConfirm").onclick=null;
            resolve(confirmed);
            if(trigger&&trigger.focus)trigger.focus();
          }
          $("deleteCancel").onclick=$("deleteClose").onclick=function(){finish(false);};
          $("deleteConfirm").onclick=function(){finish(true);};
          dialog.oncancel=function(event){event.preventDefault();finish(false);};
          dialog.onclose=function(){finish(false);};
          dialog.onclick=function(event){if(event.target===dialog)finish(false);};
          dialog.showModal();$("deleteCancel").focus();
        });
      }
    function onStatus(message,kind){
        setText("serverSaveStatus",message);
        if(message&&uiState.screen==="edition")setText("serverListStatus",message);
        $("serverConflict").classList.toggle("hidden",kind!=="conflict");
      }
    function onBusy(value){
        ["serverSave","serverSaveNew","serverReload","serverConflictNew"].forEach(function(id){$(id).disabled=value;});
        Array.prototype.forEach.call($("serverCharacterList").querySelectorAll("button"),function(button){button.disabled=value;});
      }
    function onList(items,message){
        lastItems=items;lastMessage=message;
        var query=search?search.value.trim().toLowerCase():"";
        items=items.filter(function(item){return !query||((item.name||"")+" "+(item.className||"")).toLowerCase().indexOf(query)>=0;});
        setText("serverListStatus",message);
        var host=$("serverCharacterList");host.innerHTML="";
        items.forEach(function(item){
          var row=document.createElement("div");row.className="server-row";
          var button=document.createElement("button");button.type="button";button.className="rc server-character";
          var title=document.createElement("span");title.className="rc-name";title.textContent=item.name||"Unnamed character";
          var summary=document.createElement("span");summary.className="rc-sub";
          var edition=item.edition==="classic"?"2014":item.edition==="one"?"2024":"Edition not selected";
          summary.textContent=(item.className||"Class not selected")+" · Level "+(item.level||1)+" · "+edition;
          var date=document.createElement("span");date.className="rc-ago";
          date.textContent="Updated "+new Date(item.updated_at).toLocaleString();
          var text=document.createElement("span");text.className="rc-txt";
          text.appendChild(title);text.appendChild(summary);text.appendChild(date);button.appendChild(text);
          var avatar=document.createElement("span");avatar.className="cm-avatar";avatar.setAttribute("aria-hidden","true");avatar.textContent=(item.name||"?").charAt(0).toUpperCase();button.appendChild(avatar);
          button.disabled=context.actions.isBusy();
          button.addEventListener("click",function(){context.actions.open(item.id);});row.appendChild(button);
          var remove=document.createElement("button");remove.type="button";remove.className="server-delete";
          remove.setAttribute("aria-label","Delete character "+(item.name||"Unnamed character"));remove.title="Delete character";
          remove.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/></svg>';
          remove.disabled=button.disabled;
          remove.addEventListener("click",function(event){event.stopPropagation();context.actions.remove(item);});
          row.appendChild(remove);host.appendChild(row);
        });
        if(query&&!items.length)setText("serverListStatus","No characters match your search.");
        if(message&&message.indexOf("Deleted ")===0)$("serverRefresh").focus();
      }
    return {confirmDelete:confirmDelete,onStatus:onStatus,onBusy:onBusy,onList:onList};
  }
  root.CCLibraryUI={create:create};
  if(typeof module!=="undefined"&&module.exports)module.exports={create:create};
})(typeof window!=="undefined"?window:globalThis);
