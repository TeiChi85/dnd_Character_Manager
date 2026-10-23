/* Mirrors server/validation.py: structural bounds, never D&D rule calculations. */
(function(root){
  "use strict";
  var own=Object.prototype.hasOwnProperty;
  function object(value){return !!value&&typeof value==="object"&&!Array.isArray(value);}
  function fail(message){throw new Error("Invalid character: "+message);}
  function unicode(value){return !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(value);}
  function numeric(value){return typeof value==="number"||typeof value==="string"&&(value===""||/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value)&&Math.abs(Number(value))<=1e12);}
  function matches(value,kind){
    if(kind.indexOf("nullable_")===0)return value===null||matches(value,kind.slice(9));
    return kind==="object"?object(value):kind==="array"?Array.isArray(value):
      kind==="bool"?typeof value==="boolean":kind==="number"?typeof value==="number":
      kind==="scalar"?typeof value==="string"||typeof value==="number":typeof value==="string";
  }
  function validate(value){
    if(!object(value)||value._app!=="dnd-cc"||value._v!==1)fail("expected dnd-cc format version 1");
    var nodes=0;
    function walk(item,depth,portrait){
      if(++nodes>50000||depth>64)fail("JSON is too deeply nested or contains too many values");
      if(typeof item==="string"&&(item.length>(portrait?2097152:65536)||!unicode(item)))fail("invalid or oversized string");
      if(typeof item==="number"&&(!isFinite(item)||Math.abs(item)>1e12))fail("number outside supported range");
      if(item&&typeof item==="object"){
        var keys=Object.keys(item);
        if(keys.length>2000)fail("too many array entries or object keys");
        keys.forEach(function(key){
          if(!Array.isArray(item)&&(key==="__proto__"||key==="constructor"||key==="prototype"||key.length>200||!unicode(key)))fail("unsafe JSON key");
          walk(item[key],depth+1,depth===0&&key==="portrait");
        });
      }
    }
    walk(value,0,false);
    var types={name:"text",bgCustomName:"text",bgCustomDesc:"text",edition:"nullable_text",
      className:"nullable_text",source:"nullable_text",slug:"nullable_text",subclassName:"nullable_text",
      raceLineage:"nullable_text",portrait:"nullable_text",choices:"object",bgChoices:"object",
      details:"object",raceChoices:"object",abilities:"object",equipment:"object",spells:"object",
      customProficiencies:"object",sheet:"object",customLanguages:"array",customDefences:"array",
      background:"nullable_object",race:"nullable_object",bgIsCustom:"bool",hdFaces:"nullable_number",manualHp:"nullable_number"};
    function fields(data,schema,path){Object.keys(schema).forEach(function(key){
      if(own.call(data,key)&&data[key]!==undefined&&!matches(data[key],schema[key]))fail("invalid type for "+path+key);
    });}
    fields(value,types,"");
    var nested={
      details:{alignment:"text",faith:"text",lifestyle:"text"},
      abilities:{method:"text",base:"object",assign:"object",other:"object",override:"object",rolled:"nullable_array"},
      equipment:{mode:"text",starting:"object",startingAdded:"bool",inventory:"array",currency:"object",filterType:"text",filterQ:"text"},
      spells:{cantrips:"array",spells:"array",levelFilter:"scalar",q:"text"},
      customProficiencies:{armor:"array",weapons:"array",tools:"array"},
      sheet:{hpCurrent:"nullable_number",hpTemp:"scalar",res:"object",hpEdited:"bool",invQ:"text",invAdd:"text",xp:"scalar",inspiration:"bool",deathSucc:"number",deathFail:"number",dark:"bool",acOther:"scalar",acOverride:"scalar",acEditOpen:"bool",active:"object",conc:"text"}
    };
    Object.keys(nested).forEach(function(key){if(value[key])fields(value[key],nested[key],key+".");});
    ["name","bgCustomName","className","subclassName","source","slug","raceLineage"].forEach(function(key){
      if(value[key]!=null&&value[key].length>200)fail("labels must be at most 200 characters");
    });
    if(own.call(value,"edition")&&value.edition!==null&&value.edition!=="classic"&&value.edition!=="one")fail("unsupported edition");
    if(own.call(value,"level")&&(typeof value.level!=="number"||value.level%1||value.level<1||value.level>20))fail("level must be an integer from 1 to 20");
    if(value.slug&&!/^[a-zA-Z0-9_-]+$/.test(value.slug))fail("invalid class slug");
    if(value.portrait&&!/^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(value.portrait))fail("portrait must be a PNG data URL");
    ["background","race"].forEach(function(key){if(value[key])fields(value[key],{name:"text",source:"text"},key+".");});
    ["base","assign","other","override"].forEach(function(key){
      var map=(value.abilities||{})[key]||{};
      Object.keys(map).forEach(function(k){if(!numeric(map[k]))fail("invalid ability value");});
    });
    var equipment=value.equipment||{},currency=equipment.currency||{};
    Object.keys(currency).forEach(function(k){if(typeof currency[k]!=="number")fail("currency values must be numbers");});
    (equipment.inventory||[]).forEach(function(item){
      if(!object(item)||typeof item.name!=="string")fail("inventory entries require a name");
      ["qty","ac","weight","bonus","bonusAc","bonusWeapon"].forEach(function(key){if(own.call(item,key)&&item[key]!==undefined&&!(item[key]===null&&key!=="qty")&&!numeric(item[key]))fail("invalid inventory numeric field");});
      fields(item,{equipped:"bool",attuned:"bool"},"inventory.");
    });
    ["hpTemp","xp","acOther","acOverride"].forEach(function(key){
      if(value.sheet&&own.call(value.sheet,key)&&!numeric(value.sheet[key]))fail("invalid numeric sheet field");
    });
    ["customLanguages","customDefences"].forEach(function(key){
      (value[key]||[]).forEach(function(item){if(typeof item!=="string")fail(key+" must contain strings");});
    });
    return value;
  }
  function parse(text){
    if(typeof text!=="string"||text.length>2097152||encodeURIComponent(text).replace(/%[a-fA-F0-9]{2}/g,"x").length>2097152)fail("JSON file exceeds 2 MiB");
    var value=JSON.parse(text),stack=[],tokens=/"(?:\\.|[^"\\])*"|[{}\[\]]/g,match;
    // JSON.parse checked syntax. Scan object keys before accepting duplicate fields.
    while((match=tokens.exec(text))){
      var token=match[0];
      if(token==="{")stack.push({keys:Object.create(null)});
      else if(token==="[")stack.push({});
      else if(token==="}"||token==="]")stack.pop();
      else if(stack.length&&stack[stack.length-1].keys&&/^\s*:/.test(text.slice(tokens.lastIndex))){
        var key=JSON.parse(token),keys=stack[stack.length-1].keys;
        if(own.call(keys,key))fail("duplicate JSON key");keys[key]=true;
      }
    }
    return validate(value);
  }
  root.CCCharacterJSON={validate:validate,parse:parse};
})(window);
