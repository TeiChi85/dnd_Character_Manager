(function(root){
  "use strict";
  var validation=root.CCCharacterJSON,own=Object.prototype.hasOwnProperty;
  if(typeof module!=="undefined"&&module.exports)validation=require("../character-validation.js");
  var SAVE_KEYS=["edition","name","className","source","slug","hdFaces","level","manualHp","subclassName","choices","background","bgIsCustom","bgCustomName","bgCustomDesc","bgChoices","details","race","raceLineage","raceChoices","abilities","equipment","spells","customLanguages","customProficiencies","customDefences","portrait","sheet"];
  var transient={
    "":{fdata:1,openPanels:1,uiState:1,derivedState:1,id:1,revision:1,updated_at:1,identity:1,charFileHandle:1},
    equipment:{filterType:1,filterQ:1},spells:{levelFilter:1,q:1,preview:1},
    sheet:{invQ:1,invAdd:1,acEditOpen:1,dark:1}
  };
  function equipment(){return {mode:"equipment",starting:{},startingAdded:false,inventory:[],currency:{pp:0,gp:0,ep:0,sp:0,cp:0}};}
  function gameplay(){return {hpCurrent:null,hpTemp:"",res:{},hpEdited:false,xp:"",inspiration:false,deathSucc:0,deathFail:0,acOther:"",acOverride:"",active:{},conc:""};}
  function createDefault(){
    return {edition:null,name:"",className:null,source:null,slug:null,hdFaces:null,level:1,manualHp:null,subclassName:null,choices:{},
      background:null,bgIsCustom:false,bgCustomName:"",bgCustomDesc:"",bgChoices:{},details:{alignment:"",faith:"",lifestyle:""},
      race:null,raceLineage:null,raceChoices:{},
      abilities:{method:"pointbuy",base:{Strength:8,Dexterity:8,Constitution:8,Intelligence:8,Wisdom:8,Charisma:8},assign:{},other:{},override:{},rolled:null},
      equipment:equipment(),spells:{cantrips:[],spells:[]},customLanguages:[],customProficiencies:{armor:[],weapons:[],tools:[]},
      customDefences:[],portrait:null,sheet:gameplay()};
  }
  function object(v){return v&&Object.prototype.toString.call(v)==="[object Object]";}
  // Copy only JSON values, without calling toJSON/getters or sharing mutable objects.
  function copy(value,path,ancestors){
    if(value===null||typeof value==="string"||typeof value==="boolean")return value;
    if(typeof value==="number"){if(!isFinite(value))throw new Error("Invalid JSON number");return value;}
    if(typeof value!=="object")throw new Error("Character data must contain only JSON values");
    if(ancestors.indexOf(value)>=0)throw new Error("Cyclic character data");
    var next=ancestors.concat([value]),out;
    if(Array.isArray(value)){
      out=[];
      for(var i=0;i<value.length;i++){
        var entry=Object.getOwnPropertyDescriptor?Object.getOwnPropertyDescriptor(value,String(i)):{value:value[i]};
        if(entry&&(entry.get||entry.set))throw new Error("Character data cannot contain accessors");
        out.push(!entry||entry.value===undefined?null:copy(entry.value,path+"[]",next));
      }
      return out;
    }
    if(!object(value))throw new Error("Character data must contain plain objects");
    out={};
    Object.keys(value).sort().forEach(function(k){
      if(k==="__proto__"||k==="constructor"||k==="prototype")throw new Error("Unsafe character key");
      if(transient[path]&&own.call(transient[path],k))return;
      var descriptor=Object.getOwnPropertyDescriptor?Object.getOwnPropertyDescriptor(value,k):{value:value[k]};
      if(descriptor.get||descriptor.set)throw new Error("Character data cannot contain accessors");
      if(descriptor.value!==undefined)out[k]=copy(descriptor.value,path?path+"."+k:k,next);
    });
    return out;
  }
  function merge(base,value){
    if(!object(base)||!object(value))return value;
    Object.keys(value).forEach(function(k){base[k]=merge(base[k],value[k]);});
    return base;
  }
  function normalize(saved){
    // Copy first also rejects cycles, methods and accessors before validation reads them.
    var data=copy(saved,"",[]);
    validation.validate(data);
    delete data._app;delete data._v;
    return merge(createDefault(),data);
  }
  function serialize(state){
    var data=copy(state,"",[]),out={_app:"dnd-cc",_v:1};
    delete data._app;delete data._v;
    SAVE_KEYS.forEach(function(k){if(own.call(data,k)){out[k]=data[k];delete data[k];}});
    Object.keys(data).sort().forEach(function(k){out[k]=data[k];});
    validation.validate(out);
    return out;
  }
  var api={createDefault:createDefault,createEquipment:equipment,createGameplay:gameplay,
    normalize:normalize,serialize:serialize,persistentKeys:SAVE_KEYS.slice()};
  root.CCCharacterState=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})(typeof window!=="undefined"?window:globalThis);
