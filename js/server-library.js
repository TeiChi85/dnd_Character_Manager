/* Optional same-origin API client. Character JSON never contains server metadata. */
(function(root){
  "use strict";
  var UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  function object(o){return !!o&&typeof o==="object"&&!Array.isArray(o);}
  function invalid(){throw new Error("Invalid response from the character server. Your current character was kept.");}
  function validateCharacter(o){
    if(!object(o)||o._app!=="dnd-cc"||o._v!==1)invalid();
    function walk(v,depth){
      if(depth>64)invalid();
      if(typeof v==="number"&&!isFinite(v))invalid();
      if(v&&typeof v==="object")Object.keys(v).forEach(function(k){
        if(k==="__proto__"||k==="constructor"||k==="prototype")invalid();
        walk(v[k],depth+1);
      });
    }
    walk(o,0);
    var defaults={name:"string",bgCustomName:"string",bgCustomDesc:"string",
      edition:"nullable",className:"nullable",source:"nullable",slug:"nullable",
      subclassName:"nullable",raceLineage:"nullable",portrait:"nullable",
      choices:"object",bgChoices:"object",details:"object",raceChoices:"object",
      abilities:"object",equipment:"object",spells:"object",sheet:"object",
      customProficiencies:"object",customLanguages:"array",customDefences:"array"};
    Object.keys(defaults).forEach(function(k){
      if(o[k]===undefined)return;
      var t=defaults[k],v=o[k];
      if(t==="string"&&typeof v!=="string"||t==="nullable"&&v!==null&&typeof v!=="string"||
         t==="object"&&!object(v)||t==="array"&&!Array.isArray(v))invalid();
    });
    ["background","race"].forEach(function(k){if(o[k]!=null&&!object(o[k]))invalid();});
    ["hdFaces","manualHp"].forEach(function(k){if(o[k]!=null&&typeof o[k]!=="number")invalid();});
    if(o.bgIsCustom!==undefined&&typeof o.bgIsCustom!=="boolean")invalid();
    if(o.level!==undefined&&(typeof o.level!=="number"||o.level%1||o.level<1||o.level>20))invalid();
    if(o.slug&&!/^[a-z0-9_-]+$/i.test(o.slug))invalid();
    // Portraits from processPortrait() are PNG data URLs; never accept markup/URLs.
    if(o.portrait&&!/^data:image\/png;base64,[a-z0-9+/=]+$/i.test(o.portrait))invalid();
    var arrays={equipment:["inventory"],spells:["cantrips","spells"],
      customProficiencies:["armor","weapons","tools"]};
    Object.keys(arrays).forEach(function(k){
      if(!o[k])return;
      arrays[k].forEach(function(a){if(o[k][a]!==undefined&&!Array.isArray(o[k][a]))invalid();});
    });
    return o;
  }
  function validateMeta(o){
    if(!object(o)||typeof o.id!=="string"||!UUID.test(o.id)||
       typeof o.revision!=="number"||o.revision<1||o.revision%1||o.revision>9007199254740991||
       typeof o.updated_at!=="string"||!isFinite(Date.parse(o.updated_at)))invalid();
    return o;
  }
  function create(options){
    var identity=null,busy=false,baseline=JSON.stringify(options.serialize()),listGeneration=0;
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
    function refresh(){
      var generation=++listGeneration;
      if(!supported){options.onList([],"Start Flask and open http://127.0.0.1:8000/ to use the server library. Local character files still work.");return;}
      options.onList([],"Loading server library…");
      return request("","GET").then(function(value){
        if(!object(value)||!Array.isArray(value.characters))invalid();
        value.characters.forEach(function(item){
          validateMeta(item);
          ["name","className","edition"].forEach(function(k){if(item[k]!=null&&typeof item[k]!=="string")invalid();});
          if(item.level!=null&&(typeof item.level!=="number"||item.level%1||item.level<1||item.level>20))invalid();
        });
        value.characters.sort(function(a,b){return Date.parse(b.updated_at)-Date.parse(a.updated_at);});
        if(generation===listGeneration)options.onList(value.characters,value.characters.length?"":"No characters saved on the server yet.");
      })["catch"](function(error){
        if(generation!==listGeneration)return;
        options.onList([],error.message&&error.message.indexOf("Invalid response")===0?
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
      var snapshot=JSON.stringify(options.serialize()),current=identity;
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
    setBusy(false);
    return {refresh:refresh,open:open,save:save,canLeave:canLeave,detach:detach,
      dirty:dirty,isBusy:function(){return busy;},reload:function(){if(identity)return open(identity.id);}};
  }
  root.CCServerLibrary={create:create,validateCharacter:validateCharacter};
})(window);
