// Dependency-free Node tests of the real browser scripts; no rule data is loaded.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const librarySource=await readFile(new URL('../js/server-library.js',import.meta.url),'utf8');
const validationSource=await readFile(new URL('../js/character-validation.js',import.meta.url),'utf8');
const rulesCoreSource=await readFile(new URL('../js/core/rules-core.js',import.meta.url),'utf8');
const characterStateSource=await readFile(new URL('../js/core/character-state.js',import.meta.url),'utf8');
const rulesEngineSource=await readFile(new URL('../js/core/rules-engine.js',import.meta.url),'utf8');
const appSource=(await readFile(new URL('../js/app.js',import.meta.url),'utf8')).replace(/\r\n/g,'\n');
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const clone=value=>JSON.parse(JSON.stringify(value));
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const reply=(status,value)=>({ok:status>=200&&status<300,status,
  headers:{get:()=> 'application/json'},json:async()=>clone(value)});

function harness({offline=false,transport=null}={}){
  const elements=new Map(),listeners={},requests=[],records=new Map(),downloads=[],alerts=[],pendingReaders=[];
  let next=1,fail=null,confirmAnswer=true,timer;
  function element(tag='div'){
    const classes=new Set();
    const el={tag,children:[],handlers:{},value:'',disabled:false,textContent:'',className:'',
      classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),contains:x=>classes.has(x),
        toggle(x,on){if(on===undefined)on=!classes.has(x);on?classes.add(x):classes.delete(x);}},
      addEventListener(type,fn){this.handlers[type]=fn;},
      appendChild(child){this.children.push(child);child.parentNode=this;},
      removeChild(child){this.children=this.children.filter(x=>x!==child);},
      querySelectorAll(selector){return this.children.flatMap(child=>[...(selector==='button'&&child.tag==='button'?[child]:[]),...child.querySelectorAll(selector)]);},
      querySelector(){return element();},getAttribute(){return '';},click(){const event={stopPropagation(){}};this.handlers.click?.(event);this.onclick?.(event);},
      setAttribute(){},focus(){},showModal(){this.open=true;},close(){this.open=false;this.onclose?.();}};
    let markup='';
    Object.defineProperty(el,'innerHTML',{get:()=>markup,set(value){markup=value;if(value==='')el.children=[];}});
    return el;
  }
  const document={getElementById(key){if(!elements.has(key))elements.set(key,element());return elements.get(key);},
    querySelector:()=>element(),querySelectorAll:()=>[],createElement:element,head:element(),body:element(),
    addEventListener(type,fn){listeners[type]=fn;}};
  const window={Promise,AbortController,location:{protocol:offline?'file:':'http:'},
    setTimeout(fn){timer=fn;return 1;},clearTimeout(){timer=null;},
    addEventListener(type,fn){listeners[type]=fn;},scrollTo(){},
    CC_CLASSES:[{slug:'synthetic-class',name:'Synthetic Class',edition:'classic'}],
    CC_SPELLS:[{name:'Synthetic Placeholder'}],CC_FEATURE_DATA:{'synthetic-class':{classFeatures:[]}}};
  window.fetch=async(path,options)=>{
    requests.push({path,...options});
    if(transport)return transport(path,options);
    if(fail)return fail(path,options);
    const key=path.split('/')[3];
    if(options.method==='GET')return key?reply(records.has(key)?200:404,records.get(key)||{}):
      reply(200,{characters:[...records.values()].map(({character,...meta})=>({...meta,
        name:character.name,className:character.className,level:character.level,edition:character.edition}))});
    if(options.method==='DELETE'){
      if(!records.has(key))return reply(404,{});
      if(options.headers['If-Match']!==`"${records.get(key).revision}"`)return reply(409,{});
      const revision=records.get(key).revision;records.delete(key);return reply(200,{id:key,revision,deleted:true});
    }
    if(options.method==='PUT'&&!records.has(key))return reply(404,{});
    if(options.method==='PUT'&&options.headers['If-Match']!==`"${records.get(key).revision}"`)return reply(409,{});
    const record={id:key||id(next++),revision:key?records.get(key).revision+1:1,
      updated_at:new Date(Date.UTC(2026,9,22,12,0,next)).toISOString(),character:JSON.parse(options.body)};
    records.set(record.id,clone(record));return reply(key?200:201,record);
  };
  const context=vm.createContext({window,document,Promise,AbortController,console,
    setTimeout:window.setTimeout,clearTimeout:window.clearTimeout,
    confirm:()=>confirmAnswer,alert:message=>{alerts.push(message);},
    Blob:class{constructor(parts){this.parts=parts;}},
    URL:{createObjectURL(blob){downloads.push(blob.parts.join(''));return 'blob:test';},revokeObjectURL(){}},
    FileReader:class{readAsText(file){if(file.error){this.onerror();return;}this.result=file.text;if(file.defer)pendingReaders.push(this);else this.onload();}}});
  vm.runInContext(validationSource,context);vm.runInContext(librarySource,context);vm.runInContext(rulesCoreSource,context);
  vm.runInContext(rulesEngineSource,context);vm.runInContext(characterStateSource,context);
  // Only presentation/rule-data population is stubbed. State restoration, local
  // files, serialization, event wiring and the complete API client run unchanged.
  const startup='initServerLibrary();\n  populateLevels();showEdition();showDataVersion();';
  assert.ok(appSource.includes(startup));
  vm.runInContext(appSource.replace(startup,`
    window.__renders=[];
    render=function(){window.__renders.push({slug:state.slug,className:state.className,fdata:derivedState.fdata});};
    populateClasses=populateBackgrounds=populateRaces=populateLevels=function(){};
    initServerLibrary();
    window.__test={state:state,ui:uiState,derived:derivedState,setStep:setStep,serialize:serializeChar,load:loadCharObj,loadFile:loadCharFile,
      fileHandle:function(){return charFileHandle;},saveLocal:saveChar,reset:resetCharacter,home:showEdition,library:serverLibrary,
      renderEntry:renderEntry,
      failNextRender:function(){var original=render;render=function(){render=original;throw new Error('synthetic render failure');};}};
  `),context);
  const app=window.__test;
  return {app,window,document,elements,listeners,requests,records,downloads,alerts,pendingReaders,
    setFailure(fn){fail=fn;},confirm(value){confirmAnswer=value;},timeout(){timer?.();},
    entry(identifier){const record=records.get(identifier);return {...record,name:record.character.name};},
    status:()=>document.getElementById('serverSaveStatus').textContent,
    listStatus:()=>document.getElementById('serverListStatus').textContent,
    fixture(){const value=clone(app.serialize());value.name='Synthetic Character';
      value.className='Synthetic Class';value.slug='synthetic-class';value.edition='classic';return value;}};
}

const results=[];
async function test(name,run){await run();results.push(name);}

await test('List loads safely, sorts by modified time and displays all metadata',async()=>{
  const h=harness();const value=h.fixture();
  h.records.set(id(1),{id:id(1),revision:1,updated_at:'2026-10-21T12:00:00Z',character:{...value,name:'Older'}});
  h.records.set(id(2),{id:id(2),revision:1,updated_at:'2026-10-22T12:00:00Z',character:{...value,name:'<img onerror=bad>'}});
  await h.app.library.refresh();const buttons=h.document.getElementById('serverCharacterList').children.map(row=>row.children[0]);
  assert.equal(buttons.length,2);
  assert.equal(buttons[0].children[0].children[0].textContent,'<img onerror=bad>');
  assert.equal(buttons[0].children[0].children[0].innerHTML,'');
  assert.match(buttons[0].children[0].children[1].textContent,/Synthetic Class.*Level 1.*2014/);
  assert.match(buttons[0].children[0].children[2].textContent,/Updated/);
  assert.ok(buttons[0].handlers.click);
});
await test('Empty list and network failures have visible start-page messages',async()=>{
  const h=harness();await h.app.library.refresh();assert.match(h.listStatus(),/No characters/);
  h.setFailure(()=>Promise.reject(new TypeError('network')));await h.app.library.refresh();
  assert.match(h.listStatus(),/Check that Flask is running/);
  await h.app.library.open(id(1));assert.match(h.listStatus(),/unreachable/);
});
await test('POST, load, edit, PUT and Save as New preserve independent files',async()=>{
  const h=harness();h.app.load(h.fixture());await h.app.library.save(false);
  assert.equal(h.records.size,1);assert.equal(h.requests[0].method,'POST');
  h.app.reset();await h.app.library.open(id(1));assert.equal(h.app.state.name,'Synthetic Character');
  h.app.state.name='Edited';await h.app.library.save(false);
  assert.equal(h.records.get(id(1)).revision,2);assert.equal(h.records.get(id(1)).character.name,'Edited');
  assert.equal(h.requests.find(x=>x.method==='PUT').headers['If-Match'],'"1"');
  await h.app.library.save(true);assert.equal(h.records.size,2);
  h.app.state.name='Copy';await h.app.library.save(false);
  assert.equal(h.records.get(id(2)).character.name,'Copy');assert.equal(h.records.get(id(1)).character.name,'Edited');
  assert.equal(Object.hasOwn(h.app.serialize(),'id'),false);assert.equal(Object.hasOwn(h.app.serialize(),'revision'),false);
});
await test('Old saves reset previous state; full saves retain HP, choices, resources, gear and spells',async()=>{
  const h=harness();const value=h.fixture();
  value.subclassName='Synthetic Subclass';value.level=7;value.choices={test:'chosen'};
  value.sheet.hpCurrent=19;value.sheet.res={test:2};value.equipment.inventory=[{name:'Synthetic Item'}];
  value.spells.cantrips=['Synthetic Spell'];
  h.app.load(value);assert.deepEqual(clone(h.app.serialize()),value);
  await h.app.library.save(false);h.app.reset();await h.app.library.open(id(1));
  assert.deepEqual(clone(h.app.serialize()),value);
  h.records.set(id(2),{id:id(2),revision:1,updated_at:'2026-10-22T12:00:00Z',character:{_app:'dnd-cc',_v:1,name:'Old',sheet:{xp:'10'}}});
  await h.app.library.open(id(2));assert.equal(h.app.state.subclassName,null);
  assert.equal(h.app.state.level,1);assert.equal(h.app.state.sheet.hpCurrent,null);
  assert.deepEqual(clone(h.app.state.equipment.inventory),[]);assert.equal(h.app.state.sheet.xp,'10');
});
await test('409 never overwrites; explicit reload and new-copy recovery both work',async()=>{
  const h=harness();h.app.load(h.fixture());await h.app.library.save(false);
  h.records.get(id(1)).revision=2;h.records.get(id(1)).character.name='Remote';h.app.state.name='Mine';
  await h.app.library.save(false);assert.match(h.status(),/newer version/);
  assert.equal(h.app.state.name,'Mine');assert.equal(h.records.get(id(1)).character.name,'Remote');
  assert.equal(h.document.getElementById('serverConflict').classList.contains('hidden'),false);
  h.confirm(false);const count=h.requests.length;await h.app.library.reload();assert.equal(h.requests.length,count);
  h.confirm(true);await h.app.library.reload();assert.equal(h.app.state.name,'Remote');
  h.app.state.name='Mine again';h.records.get(id(1)).revision=3;await h.app.library.save(false);
  await h.app.library.save(true);assert.equal(h.records.size,2);assert.equal(h.records.get(id(2)).character.name,'Mine again');
});
await test('Invalid responses, missing records, unsafe portraits and prototype keys preserve current state',async()=>{
  for(const invalid of [{_app:'wrong',_v:1},{_app:'dnd-cc',_v:1,sheet:null},
      {_app:'dnd-cc',_v:1,portrait:'x" onerror="bad'},
      JSON.parse('{"_app":"dnd-cc","_v":1,"choices":{"__proto__":{}}}')]){
    const h=harness();h.app.load(h.fixture());const before=clone(h.app.serialize());
    h.records.set(id(1),{id:id(1),revision:1,updated_at:'2026-10-22T12:00:00Z',character:invalid});
    await h.app.library.open(id(1));assert.deepEqual(clone(h.app.serialize()),before);assert.match(h.status(),/Invalid response/);
  }
  const h=harness();await h.app.library.open(id(99));assert.match(h.status(),/no longer/);
  h.setFailure(()=>Promise.resolve({ok:true,headers:{get:()=> 'text/html'}}));
  await h.app.library.refresh();assert.match(h.listStatus(),/invalid library/);
});
await test('Missing class data and malformed nested data do not destroy the current character',async()=>{
  const h=harness();h.app.load(h.fixture());const before=clone(h.app.serialize());
  const value={...h.fixture(),slug:'not-installed'};
  h.records.set(id(1),{id:id(1),revision:1,updated_at:'2026-10-22T12:00:00Z',character:value});
  await h.app.library.open(id(1));assert.match(h.status(),/Game data/);assert.deepEqual(clone(h.app.serialize()),before);
  value.slug='synthetic-class';value.equipment.inventory='bad';h.records.get(id(1)).character=value;
  await h.app.library.open(id(1));assert.match(h.status(),/Invalid response/);assert.deepEqual(clone(h.app.serialize()),before);
});
await test('Failed POST is not retried and double-clicks cannot duplicate a pending save',async()=>{
  const h=harness();h.app.load(h.fixture());let reject;
  h.setFailure(()=>new Promise((resolve,fail)=>{reject=fail;}));
  const saving=h.app.library.save(false);await h.app.library.save(false);
  assert.equal(h.requests.length,1);assert.equal(h.app.library.canLeave(),false);
  reject(new TypeError('network'));await saving;assert.equal(h.requests.length,1);
  assert.match(h.status(),/result may be unknown/);assert.equal(h.app.library.isBusy(),false);
});
await test('Edits during a save remain dirty; edits during a load require another confirmation',async()=>{
  const h=harness();h.app.load(h.fixture());let resolve;
  h.setFailure(()=>new Promise(done=>{resolve=done;}));const saving=h.app.library.save(false);
  h.app.state.name='New edit';resolve(reply(201,{id:id(1),revision:1,updated_at:'2026-10-22T12:00:00Z',character:h.fixture()}));
  await saving;assert.equal(h.app.library.dirty(),true);assert.match(h.status(),/still need saving/);
  const pending=h.app.library.open(id(2));h.app.state.name='Keep me';h.confirm(false);
  resolve(reply(200,{id:id(2),revision:1,updated_at:'2026-10-22T12:00:00Z',character:h.fixture()}));
  await pending;assert.equal(h.app.state.name,'Keep me');assert.match(h.status(),/cancelled/);
});
await test('Dirty switches and page unload are guarded; local import detaches server identity',async()=>{
  const h=harness();h.app.load(h.fixture());await h.app.library.save(false);
  h.app.state.name='Unsaved';h.confirm(false);const count=h.requests.length;
  await h.app.library.open(id(1));assert.equal(h.requests.length,count);
  h.document.getElementById('changeEdition').click();assert.equal(h.app.state.name,'Unsaved');
  let prevented=false;h.listeners.beforeunload({preventDefault(){prevented=true;}});assert.equal(prevented,true);
  h.confirm(true);h.app.loadFile({text:JSON.stringify({...h.fixture(),name:'Local import'})});
  await h.app.library.save(false);assert.equal(h.records.size,2);assert.equal(h.records.get(id(2)).character.name,'Local import');
});
await test('Original local JSON download and import round-trip without server metadata',async()=>{
  const h=harness();h.app.load(h.fixture());h.app.saveLocal();
  assert.equal(h.downloads.length,1);const exported=JSON.parse(h.downloads[0]);
  assert.deepEqual(exported,clone(h.app.serialize()));assert.equal(exported._app,'dnd-cc');assert.equal(exported._v,1);
  assert.equal(Object.hasOwn(exported,'id'),false);h.app.reset();
  h.app.loadFile({text:h.downloads[0]});assert.deepEqual(clone(h.app.serialize()),exported);
});
await test('File mode retains local operation and offers clear Flask startup guidance',async()=>{
  const h=harness({offline:true});h.app.library.refresh();assert.match(h.listStatus(),/Start Flask/);
  assert.equal(h.document.getElementById('serverSave').disabled,true);
  h.app.load(h.fixture());h.app.saveLocal();assert.equal(h.downloads.length,1);assert.equal(h.requests.length,0);
});
await test('Malformed JSON response and HTTP 413 are identified without retries',async()=>{
  const h=harness();h.app.load(h.fixture());
  h.setFailure(()=>Promise.resolve({ok:true,headers:{get:()=> 'application/json'},json:()=>Promise.reject(new SyntaxError('bad JSON'))}));
  await h.app.library.open(id(1));assert.match(h.status(),/Invalid response/);
  h.setFailure(()=>Promise.resolve(reply(413,{})));const count=h.requests.length;
  await h.app.library.save(false);assert.match(h.status(),/too large/);assert.equal(h.requests.length,count+1);
});
await test('A stalled request is aborted and releases the save controls',async()=>{
  const h=harness();h.app.load(h.fixture());
  h.setFailure((path,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('aborted')))));
  const saving=h.app.library.save(false);h.timeout();await saving;
  assert.equal(h.app.library.isBusy(),false);assert.equal(h.requests.length,1);assert.match(h.status(),/timed out/);
});
await test('Unexpected render failure rolls back the old state and keeps its server identity',async()=>{
  const h=harness();h.app.load(h.fixture());await h.app.library.save(false);
  const before=clone(h.app.serialize());
  h.records.set(id(2),{id:id(2),revision:1,updated_at:'2026-10-22T12:00:00Z',character:{...h.fixture(),name:'Must roll back'}});
  h.app.failNextRender();await h.app.library.open(id(2));
  assert.deepEqual(clone(h.app.serialize()),before);assert.match(h.status(),/Invalid response/);
  h.app.state.name='Still first';await h.app.library.save(false);
  assert.equal(h.records.get(id(1)).character.name,'Still first');assert.equal(h.records.get(id(2)).character.name,'Must roll back');
});
await test('Every new action is present in HTML and the API script precedes app.js',async()=>{
  for(const name of ['serverRefresh','serverSave','serverSaveNew','serverConflictNew','serverReload','serverCharacterList','deleteDialog','deleteCancel','deleteConfirm','deleteClose'])
    assert.ok(html.includes(`id="${name}"`));
  assert.ok(html.indexOf('src="js/server-library.js"')<html.indexOf('src="js/app.js"'));
  assert.ok(html.indexOf('src="js/core/rules-core.js"')<html.indexOf('src="js/app.js"'));
  assert.ok(html.includes('src="js/core/rules-engine.js"'));
  assert.ok(html.indexOf('src="js/core/rules-core.js"')<html.indexOf('src="js/core/rules-engine.js"'));
  assert.ok(html.indexOf('src="js/core/rules-engine.js"')<html.indexOf('src="js/app.js"'));
  assert.ok(html.includes('src="js/core/character-state.js"'));
  assert.ok(html.indexOf('src="js/character-validation.js"')<html.indexOf('src="js/core/character-state.js"'));
  assert.ok(html.indexOf('src="js/core/character-state.js"')<html.indexOf('src="js/app.js"'));
  assert.ok(html.includes('id="recentList"'));assert.ok(html.includes('id="btnLoadStart"'));
});

await test('Delete requires explicit confirmation; Cancel, Escape and closing all abort',async()=>{
  for(const cancel of ['deleteCancel','deleteClose','escape','close']){
    const h=harness();h.app.load(h.fixture());await h.app.library.save(false);await h.app.library.refresh();
    const before=h.requests.length,pending=h.app.library.remove(h.entry(id(1)));
    const dialog=h.document.getElementById('deleteDialog');assert.equal(dialog.open,true);
    assert.equal(h.document.getElementById('deleteCharacterName').textContent,'Synthetic Character');
    assert.equal(h.requests.length,before);
    if(cancel==='escape')dialog.oncancel({preventDefault(){}});
    else if(cancel==='close')dialog.close();else h.document.getElementById(cancel).click();
    await pending;assert.equal(h.requests.length,before);assert.equal(h.records.size,1);assert.equal(h.app.library.isBusy(),false);
  }
});
await test('Trash button opens only the safe dialog, never the character',async()=>{
  const h=harness();h.app.load(h.fixture());await h.app.library.save(false);await h.app.library.refresh();
  const row=h.document.getElementById('serverCharacterList').children[0],before=h.requests.length;
  row.children[1].click();assert.equal(h.document.getElementById('deleteDialog').open,true);
  assert.equal(h.requests.length,before);h.document.getElementById('deleteCancel').click();
});
await test('Confirmed DELETE uses the listed revision and refreshes with a success message',async()=>{
  const h=harness();h.app.load(h.fixture());await h.app.library.save(false);await h.app.library.refresh();
  const pending=h.app.library.remove(h.entry(id(1)));
  h.document.getElementById('deleteConfirm').click();await pending;
  assert.equal(h.records.size,0);assert.equal(h.document.getElementById('serverCharacterList').children.length,0);
  assert.equal(h.requests.find(x=>x.method==='DELETE').headers['If-Match'],'"1"');
  assert.match(h.listStatus(),/Deleted.*Moved to the server trash/);
  assert.equal(h.app.state.name,'Synthetic Character');assert.equal(h.app.library.dirty(),true);
  await h.app.library.save(false);assert.ok(h.records.has(id(2)));
});
await test('Stale DELETE preserves the row and requires explicit library refresh',async()=>{
  const h=harness();h.app.load(h.fixture());await h.app.library.save(false);await h.app.library.refresh();
  const selected=clone(h.entry(id(1)));h.records.get(id(1)).revision=2;
  const count=h.requests.length,pending=h.app.library.remove(selected);
  h.document.getElementById('deleteConfirm').click();await pending;
  assert.equal(h.requests.length,count+1);assert.equal(h.records.size,1);
  assert.equal(h.document.getElementById('serverCharacterList').children.length,1);assert.match(h.listStatus(),/Nothing was deleted.*Refresh/);
  await h.app.library.refresh();const retry=h.app.library.remove(h.entry(id(1)));
  h.document.getElementById('deleteConfirm').click();await retry;assert.equal(h.records.size,0);
});
await test('Delete network/server errors preserve the row, release controls and permit local export',async()=>{
  for(const status of [0,404,500]){
    const h=harness();h.app.load(h.fixture());await h.app.library.save(false);await h.app.library.refresh();
    h.setFailure(()=>status?Promise.resolve(reply(status,{})):Promise.reject(new Error('network')));
    const count=h.requests.length,pending=h.app.library.remove(h.entry(id(1)));
    h.document.getElementById('deleteConfirm').click();await pending;
    assert.equal(h.requests.length,count+1);assert.equal(h.document.getElementById('serverCharacterList').children.length,1);
    assert.equal(h.app.library.isBusy(),false);assert.match(h.listStatus(),/Refresh/);
    h.app.saveLocal();assert.equal(h.downloads.length,1);
  }
});
await test('Repeated delete clicks cannot queue a second dialog or request',async()=>{
  const h=harness();h.app.load(h.fixture());await h.app.library.save(false);await h.app.library.refresh();
  const pending=h.app.library.remove(h.entry(id(1)));h.app.library.remove(h.entry(id(1)));
  h.document.getElementById('deleteConfirm').click();await pending;
  assert.equal(h.requests.filter(x=>x.method==='DELETE').length,1);
});
await test('Hostile names remain literal text in the library and delete dialog',async()=>{
  const h=harness();const value=h.fixture();value.name='<img src=x onerror=alert(1)>';
  h.app.load(value);await h.app.library.save(false);await h.app.library.refresh();
  const pending=h.app.library.remove(h.entry(id(1))),name=h.document.getElementById('deleteCharacterName');
  assert.equal(name.textContent,value.name);assert.equal(name.innerHTML,'');
  h.document.getElementById('deleteCancel').click();await pending;
});
await test('Local imports reject XSS numeric fields, bad portraits, unsafe keys and duplicate JSON',async()=>{
  const h=harness();h.app.load(h.fixture());await h.app.library.save(false);const before=clone(h.app.serialize());
  const raw=[
    '{"_app":"dnd-cc","_v":1,"name":"a","name":"b"}',
    '{"_app":"dnd-cc","_v":1,"portrait":"data:image/svg+xml,bad"}',
    '{"_app":"dnd-cc","_v":1,"choices":{"__proto__":{}}}',
    '{"_app":"dnd-cc","_v":1,"equipment":{"inventory":[{"name":"Test","qty":"\\\" onfocus=bad"}]}}',
    '{"_app":"dnd-cc","_v":1,"sheet":{"res":[]}}',
    '{"_app":"dnd-cc","_v":1,"name":"\\ud800"}'
  ];
  for(const text of raw){h.app.loadFile({text});assert.deepEqual(clone(h.app.serialize()),before);}
  assert.equal(h.alerts.length,raw.length);
  h.app.loadFile({size:2097153,text:'{}'});assert.match(h.alerts.at(-1),/2 MiB/);
  h.app.state.name='Still original';await h.app.library.save(false);assert.equal(h.records.size,1);
});
await test('Structured entry rendering escapes manipulated descriptions and attributes',async()=>{
  const h=harness(),attack='<img src=x onerror=bad>';
  for(const entry of [attack,{type:'options',count:attack,entries:[]},
      {type:'abilityDc',attributes:[attack]}, {type:'entries',name:attack,entries:[attack]}]){
    const rendered=h.app.renderEntry(entry);assert.ok(!rendered.includes('<img'));assert.ok(rendered.includes('&lt;img'));
  }
});
await test('Shared validator bounds nested structures and preserves valid legacy inventory nulls',async()=>{
  const h=harness(),check=h.window.CCCharacterJSON.validate;
  for(const value of [
    {_app:'dnd-cc',_v:1,name:'x'.repeat(201)},
    {_app:'dnd-cc',_v:1,edition:'wrong'},
    {_app:'dnd-cc',_v:1,customLanguages:Array(2001).fill('x')},
    {_app:'dnd-cc',_v:1,bgCustomDesc:'x'.repeat(65537)},
    {_app:'dnd-cc',_v:1,abilities:{base:[]}}
  ])assert.throws(()=>check(value),/Invalid character/);
  const value=h.fixture();value.equipment.inventory=[{name:'Synthetic gear',qty:1,ac:undefined,bonusWeapon:null,attune:null,equipped:false}];
  assert.deepEqual(clone(check(value)),clone(value));
  h.app.load(value);await h.app.library.save(false);assert.equal(h.status(),'Saved to server.');
  assert.equal(h.window.CCCharacterJSON.parse('{"_app":"dnd-cc","_v":1,"choices":{"text":"braces {} [] and \\\"quotes\\\""}}')._v,1);
});

await test('UI navigation, filters and panels never dirty the persistent snapshot',async()=>{
  const h=harness();h.app.load(h.fixture());await h.app.library.save(false);
  const before=clone(h.app.serialize());
  h.app.ui.openPanels.feature=true;h.app.ui.equipment.filterQ='Blade';h.app.ui.equipment.filterType='Weapon';
  h.app.ui.spells.q='Fire';h.app.ui.spells.levelFilter='2';h.app.ui.spells.preview='Preview';
  h.app.ui.sheet.invQ='Ring';h.app.ui.sheet.invAdd='Keepsake';h.app.ui.sheet.acEditOpen=true;
  h.app.setStep('spells');h.app.setStep('sheet');
  assert.deepEqual(clone(h.app.serialize()),before);assert.equal(h.app.library.dirty(),false);
  assert.equal(h.app.ui.sheet.invAdd,'Keepsake');assert.equal(h.app.ui.equipment.filterQ,'Blade');
});
await test('Character and gameplay edits each dirty the server baseline',async()=>{
  const edits=[s=>s.name='Changed',s=>s.level=6,s=>{s.sheet.hpCurrent=0;s.sheet.hpEdited=true;},
    s=>s.sheet.hpTemp='5',s=>s.sheet.res['slot:1:0']=true,s=>s.sheet.res['hd:0']=true,
    s=>s.sheet.active.Rage=true,s=>s.sheet.conc='Synthetic',s=>s.spells.cantrips.push('New'),
    s=>s.equipment.inventory.push({name:'New gear',attuned:true}),s=>s.sheet.acOverride='19'];
  for(const edit of edits){
    const h=harness();h.app.load(h.fixture());await h.app.library.save(false);
    edit(h.app.state);assert.equal(h.app.library.dirty(),true);
    await h.app.library.save(false);assert.equal(h.app.library.dirty(),false);
  }
});
await test('UI edits during saving stay clean, gameplay edits keep the transmitted snapshot dirty',async()=>{
  for(const gameplay of [false,true]){
    const h=harness();h.app.load(h.fixture());let respond;
    h.setFailure((path,options)=>options.method==='POST'?new Promise(resolve=>{respond=()=>resolve(reply(201,
      {id:id(1),revision:1,updated_at:'2026-10-24T12:00:00Z',character:JSON.parse(options.body)}));}):Promise.resolve(reply(200,{characters:[]})));
    const pending=h.app.library.save(false),snapshot=h.requests.find(r=>r.method==='POST').body;
    h.app.ui.equipment.filterQ='UI';if(gameplay)h.app.state.sheet.res['slot:1:0']=true;
    respond();await pending;
    assert.equal(h.app.library.dirty(),gameplay);
    assert.equal(JSON.parse(snapshot).sheet.res['slot:1:0'],undefined);
    assert.equal(h.app.state.sheet.res['slot:1:0'],gameplay?true:undefined);
  }
});
await test('Legacy UI is reset, extension fields and gameplay survive local/server roundtrips',async()=>{
  const h=harness(),legacy=h.fixture();
  legacy.sheet={...legacy.sheet,hpCurrent:0,hpEdited:true,hpTemp:'4',res:{'hd:0':true,'slot:1:0':true},
    inspiration:true,deathSucc:2,deathFail:1,active:{Effect:true},conc:'Test',xp:'345',acOther:'2',acOverride:'18',
    dark:true,invQ:'stale',invAdd:'stale',acEditOpen:true};
  legacy.equipment.filterQ='stale';legacy.spells.preview='stale';legacy.extension={allowed:'kept'};
  h.app.loadFile({text:JSON.stringify(legacy)});const clean=clone(h.app.serialize());
  assert.equal(h.app.ui.sheet.invQ,'');assert.equal(h.app.ui.spells.preview,'');
  assert.equal(clean.sheet.hpEdited,true);assert.equal(clean.sheet.hpCurrent,0);assert.equal(clean.sheet.dark,undefined);
  assert.equal(clean.equipment.filterQ,undefined);assert.deepEqual(clean.extension,legacy.extension);
  await h.app.library.save(false);h.app.reset();await h.app.library.open(id(1));
  assert.deepEqual(clone(h.app.serialize()),clean);assert.equal(h.app.library.dirty(),false);
  h.app.saveLocal();assert.deepEqual(JSON.parse(h.downloads[0]),clean);
});
await test('Invalid local inputs preserve character, UI, handle and server identity',async()=>{
  const h=harness(),handle={name:'original.json'};
  h.app.loadFile({text:JSON.stringify(h.fixture())},handle);await h.app.library.save(false);
  h.app.ui.equipment.filterQ='keep';const before=clone(h.app.serialize());
  for(const file of [{text:'{'},{text:JSON.stringify({_app:'dnd-cc',_v:1,sheet:{res:[]}})},
    {size:2097153,text:'{}'},{text:JSON.stringify({_app:'dnd-cc',_v:1,portrait:'invalid'})},{error:true}]){
    h.app.loadFile(file,{name:'invalid.json'});assert.deepEqual(clone(h.app.serialize()),before);
    assert.equal(h.app.fileHandle(),handle);assert.equal(h.app.ui.equipment.filterQ,'keep');
  }
  h.app.state.name='Still original';await h.app.library.save(false);
  assert.equal(h.requests.filter(r=>r.method==='PUT').at(-1).path,`/api/characters/${id(1)}`);
});
await test('Local render failure restores UI, file handle, dirty state and conflict identity',async()=>{
  const h=harness(),handle={name:'original.json'};
  h.app.loadFile({text:JSON.stringify(h.fixture())},handle);await h.app.library.save(false);
  h.app.ui.sheet.invAdd='draft';h.app.state.name='Unsaved';const before=clone(h.app.serialize());
  h.app.failNextRender();h.app.loadFile({text:JSON.stringify({...h.fixture(),name:'Replacement'})},{name:'replacement.json'});
  assert.deepEqual(clone(h.app.serialize()),before);assert.equal(h.app.fileHandle(),handle);
  assert.equal(h.app.ui.sheet.invAdd,'draft');assert.equal(h.app.library.dirty(),true);
  await h.app.library.save(false);assert.equal(h.records.get(id(1)).character.name,'Unsaved');
});
await test('Failed or superseded asynchronous imports never replace the active character',async()=>{
  const h=harness(),handle={name:'original.json'};
  h.app.loadFile({text:JSON.stringify(h.fixture())},handle);await h.app.library.save(false);
  const before=clone(h.app.serialize()),pending={...h.fixture(),slug:'delayed',name:'Pending'};
  h.app.loadFile({text:JSON.stringify(pending)},{name:'pending.json'});
  assert.deepEqual(clone(h.app.serialize()),before);h.document.head.children.at(-1).onerror();
  assert.deepEqual(clone(h.app.serialize()),before);assert.equal(h.app.fileHandle(),handle);
  h.app.loadFile({text:JSON.stringify(pending)});const late=h.document.head.children.at(-1);
  h.app.reset();h.window.CC_FEATURE_DATA.delayed={classFeatures:[]};late.onload();
  assert.equal(h.app.state.name,'');assert.equal(h.app.derived.fdata,null);
});
await test('Edits while local data loads may cancel switching without losing state',async()=>{
  const h=harness();h.app.load(h.fixture());
  h.app.loadFile({text:JSON.stringify({...h.fixture(),slug:'delayed'})});
  const script=h.document.head.children.at(-1);h.app.state.name='Edited while loading';h.confirm(false);
  h.window.CC_FEATURE_DATA.delayed={classFeatures:[]};script.onload();
  assert.equal(h.app.state.name,'Edited while loading');assert.equal(h.app.state.slug,'synthetic-class');
});

await test('Late file readers cannot replace a reset or a newer imported character',async()=>{
  const h=harness();h.app.load(h.fixture());
  h.app.loadFile({text:JSON.stringify({...h.fixture(),name:'Old read'}),defer:true});
  h.app.reset();h.pendingReaders[0].onload();assert.equal(h.app.state.name,'');
  h.app.loadFile({text:JSON.stringify({...h.fixture(),name:'First'}),defer:true});
  h.app.loadFile({text:JSON.stringify({...h.fixture(),name:'Newest'}),defer:true});
  h.pendingReaders[2].onload();h.pendingReaders[1].onload();assert.equal(h.app.state.name,'Newest');
});
await test('A failed pending import does not invalidate the active class response',async()=>{
  const h=harness();h.window.CC_CLASSES.push({slug:'active-class',name:'Active',edition:'classic',hdFaces:8});
  h.app.state.edition='classic';h.document.getElementById('classSelect').handlers.change({target:{value:'active-class'}});
  const active=h.document.head.children.at(-1);
  h.app.loadFile({text:JSON.stringify({...h.fixture(),slug:'failing-import'})});
  h.document.head.children.at(-1).onerror();
  const data={classFeatures:[]};h.window.CC_FEATURE_DATA['active-class']=data;active.onload();
  assert.equal(h.app.state.slug,'active-class');assert.equal(h.app.derived.fdata,data);
});

await test('A delayed local import cannot switch character during a server save',async()=>{
  const h=harness();h.app.load(h.fixture());
  h.app.loadFile({text:JSON.stringify({...h.fixture(),slug:'delayed',name:'Must not replace'})});
  const script=h.document.head.children.at(-1);let respond;
  h.setFailure((path,options)=>options.method==='POST'?new Promise(resolve=>{respond=()=>resolve(reply(201,
    {id:id(1),revision:1,updated_at:'2026-10-24T12:00:00Z',character:JSON.parse(options.body)}));}):Promise.resolve(reply(200,{characters:[]})));
  const pending=h.app.library.save(false);h.window.CC_FEATURE_DATA.delayed={classFeatures:[]};script.onload();
  assert.equal(h.app.state.name,'Synthetic Character');assert.match(h.status(),/Please wait/);
  respond();await pending;assert.equal(h.app.library.dirty(),false);
});

export const summary=`${results.length} frontend integration scenarios passed`;
export {results,harness};
console.log(summary);
