/* Optional same-origin API client. Character JSON never contains server metadata. */
(function(root){
  "use strict";
  var UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  function object(o){return !!o&&typeof o==="object"&&!Array.isArray(o);}
  function invalid(){throw new Error("Invalid response from the character server. Your current character was kept.");}
  function validateCharacter(o){
    try{return root.CCCharacterJSON.validate(o);}catch(error){invalid();}
  }
  function validateMeta(o){
    if(!object(o)||typeof o.id!=="string"||!UUID.test(o.id)||
       typeof o.revision!=="number"||o.revision<1||o.revision%1||o.revision>9007199254740991||
       typeof o.updated_at!=="string"||!isFinite(Date.parse(o.updated_at)))invalid();
    return o;
  }
  function create(options){
    var identity=null,busy=false,baseline=JSON.stringify(options.serialize()),listGeneration=0,items=[];
    var supported=!!(root.fetch&&root.Promise&&root.AbortController&&
      root.location&&/^https?:$/.test(root.location.protocol));
    function dirty(){return JSON.stringify(options.serialize())!==baseline;}
    function status(message,kind){options.onStatus(message,kind||"");}
    function setBusy(value){busy=value;options.onBusy(value||!supported);}
    function canLeave(){
      if(busy){status("Please wait for the server operation to finish before switching characters.");return false;}
      return !dirty()||options.confirm("Discard changes to the current character? Save a local or server copy first if you want to keep them.");
    }
    function detach(){identity=null;baseline=JSON.stringify(options.serialize());status("");}
    function request(path,method,body,revision){
      var controller=new root.AbortController();
      var timer=root.setTimeout(function(){controller.abort();},20000);
      var headers={Accept:"application/json"};
      if(body!==undefined)headers["Content-Type"]="application/json";
      if(revision!=null)headers["If-Match"]='"'+revision+'"';
      return root.fetch("/api/characters"+path,{method:method,headers:headers,body:body,
        credentials:"same-origin",cache:"no-store",signal:controller.signal}).then(function(response){
        if(!response.ok){var error=new Error("Server request failed");error.status=response.status;throw error;}
        if(!/application\/json/i.test(response.headers.get("Content-Type")||""))invalid();
        return response.json().then(function(value){root.clearTimeout(timer);return value;},function(){invalid();});
      }).then(function(value){root.clearTimeout(timer);return value;},function(error){root.clearTimeout(timer);throw error;});
    }
    function failure(error,writing){
      if(error.status===409){status("Another user saved a newer version. Your changes are still here. Reload the server version or save your character as new.","conflict");return;}
      var message;
      if(error.status===404)message="This character is no longer on the server. You can keep your current character with Save as New on Server.";
      else if(error.status===413)message="Character too large for the server (2 MiB limit). Try a smaller portrait or save a local JSON copy.";
      else if(error.status)message="The server could not "+(writing?"save":"load")+" the character (HTTP "+error.status+"). Your current character was kept.";
      else if(error.message&&error.message.indexOf("Invalid response")===0)message=error.message;
      else if(error.message&&error.message.indexOf("Game data")===0)message=error.message;
      else message="Character server unreachable or request timed out. Check that Flask is running. Your current character was kept.";
      if(writing)message+=" The save result may be unknown. Check the library before trying again; no automatic retry was made.";
      status(message);
    }
    function refresh(successMessage){
      var generation=++listGeneration;
      if(!supported){options.onList([],"Start Flask and open http://127.0.0.1:8000/ to use the server library. Local character files still work.");return;}
      options.onList(items,successMessage||"Loading server library…");
      return request("","GET").then(function(value){
        if(!object(value)||!Array.isArray(value.characters))invalid();
        value.characters.forEach(function(item){
          validateMeta(item);
          ["name","className","edition"].forEach(function(k){if(item[k]!=null&&typeof item[k]!=="string")invalid();});
          if(item.level!=null&&(typeof item.level!=="number"||item.level%1||item.level<1||item.level>20))invalid();
        });
        value.characters.sort(function(a,b){return Date.parse(b.updated_at)-Date.parse(a.updated_at);});
        if(generation===listGeneration){items=value.characters;options.onList(items,successMessage||(items.length?"":"No characters saved on the server yet."));}
      })["catch"](function(error){
        if(generation!==listGeneration)return;
        options.onList(items,successMessage?successMessage+" Refresh failed; choose Refresh to reload the library.":error.message&&error.message.indexOf("Invalid response")===0?
          "The server returned an invalid library. Your current character was kept.":
          "Could not load the server library. Check that Flask is running, then choose Refresh.");
      });
    }
    function open(id){
      if(!supported||!UUID.test(id)||!canLeave())return;
      var before=JSON.stringify(options.serialize());
      setBusy(true);status("Loading character…");
      return request("/"+id,"GET").then(function(record){
        validateMeta(record);if(record.id!==id)invalid();validateCharacter(record.character);
        return options.prepare(record.character).then(function(){
          if(before!==JSON.stringify(options.serialize())&&!options.confirm("Discard the changes made while this character was loading?")){
            status("Load cancelled. Your current character was kept.");return;
          }
          options.load(record.character);
          identity={id:record.id,revision:record.revision};
          baseline=JSON.stringify(options.serialize());status("Loaded from server.");
        });
      })["catch"](function(error){failure(error,false);}).then(function(){setBusy(false);});
    }
    function save(asNew){
      if(!supported||busy)return;
      var character=options.serialize();
      try{root.CCCharacterJSON.validate(character);}catch(error){status(error.message);return;}
      var snapshot=JSON.stringify(character),current=identity;
      setBusy(true);status("Saving to server…");
      var updating=current&&!asNew;
      return request(updating?"/"+current.id:"",updating?"PUT":"POST",snapshot,updating?current.revision:null).then(function(record){
        validateMeta(record);validateCharacter(record.character);
        if(updating&&(record.id!==current.id||record.revision!==current.revision+1))invalid();
        if(!updating&&(record.revision!==1||current&&record.id===current.id))invalid();
        identity={id:record.id,revision:record.revision};baseline=snapshot;
        status(dirty()?"Saved to server. Changes made during the save still need saving.":"Saved to server.");
        refresh();
      })["catch"](function(error){failure(error,true);}).then(function(){setBusy(false);});
    }
    function remove(item){
      if(!supported||busy)return;
      try{validateMeta(item);}catch(error){status(error.message);return;}
      setBusy(true);
      return options.confirmDelete(item).then(function(confirmed){
        if(!confirmed){status("Deletion cancelled.");return;}
        status("Deleting character…");
        return request("/"+item.id,"DELETE",undefined,item.revision).then(function(record){
          if(!object(record)||record.deleted!==true||record.id!==item.id||record.revision!==item.revision)invalid();
          if(identity&&identity.id===item.id){identity=null;baseline=null;}
          items=items.filter(function(entry){return entry.id!==item.id;});
          var message='Deleted "'+(item.name||"Unnamed character")+'". Moved to the server trash.';
          status(message);return refresh(message);
        });
      })["catch"](function(error){
        var message=error.status===409?"Character changed since this list was loaded. Nothing was deleted. Refresh the library before deleting again.":
          error.status===404?"Character is no longer on the server. Refresh the library.":
          "Could not confirm deletion. Refresh the library before trying again; no automatic retry was made.";
        options.onList(items,message);status(message);
      }).then(function(){setBusy(false);});
    }
    setBusy(false);
    return {refresh:refresh,open:open,save:save,remove:remove,canLeave:canLeave,detach:detach,
      dirty:dirty,isBusy:function(){return busy;},reload:function(){if(identity)return open(identity.id);}};
  }
  root.CCServerLibrary={create:create,validateCharacter:validateCharacter};
})(window);
