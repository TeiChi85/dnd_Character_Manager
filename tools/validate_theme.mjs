import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../js/theme.js',import.meta.url),'utf8');
const app=await readFile(new URL('../js/app.js',import.meta.url),'utf8');
const pages=['index','classes','races','spells','items','feats','creatures'];
function session({storage=new Map(),system=false,blocked=false}={}){
  const events={},mediaEvents={},attributes={},classes=new Set(),handlers={};
  const button={textContent:'',setAttribute(k,v){attributes['button:'+k]=v;},addEventListener(k,v){handlers[k]=v;}};
  const document={body:null,readyState:'loading',documentElement:{setAttribute(k,v){attributes[k]=v;}},
    getElementById:()=>button,addEventListener(k,v){events[k]=v;}};
  const media={matches:system,addEventListener(k,v){mediaEvents[k]=v;}};
  const window={matchMedia:()=>media,localStorage:{getItem(k){if(blocked)throw Error('blocked');return storage.get(k)||null;},
    setItem(k,v){if(blocked)throw Error('blocked');storage.set(k,v);}},addEventListener(k,v){events[k]=v;}};
  vm.runInNewContext(source,{window,document});
  const beforeBody=attributes['data-theme'];
  document.body={classList:{toggle(k,on){on?classes.add(k):classes.delete(k);}}};
  events.DOMContentLoaded();
  return {window,attributes,classes,button,beforeBody,click:()=>handlers.click(),
    system(value){media.matches=value;mediaEvents.change();},
    storage(value){events.storage({key:'cc-theme',newValue:value});}};
}
const results=[];
function test(name,run){run();results.push(name);}
test('System preference is applied before body/styles and can follow system changes',()=>{
  const h=session({system:true});assert.equal(h.beforeBody,'dark');assert.ok(h.classes.has('dark'));
  h.system(false);assert.equal(h.window.CCTheme.get(),'light');assert.ok(!h.classes.has('dark'));
});
test('Explicit toggle persists and survives a simulated browser restart',()=>{
  const storage=new Map();const h=session({storage});h.click();assert.equal(storage.get('cc-theme'),'dark');
  const restarted=session({storage,system:false});assert.equal(restarted.beforeBody,'dark');
  restarted.click();assert.equal(storage.get('cc-theme'),'light');
  assert.equal(session({storage,system:true}).window.CCTheme.get(),'light');
});
test('An explicit choice overrides later OS changes',()=>{
  const h=session();h.click();h.system(false);assert.equal(h.window.CCTheme.get(),'dark');
});
test('Unavailable localStorage does not break switching',()=>{
  const h=session({blocked:true,system:true});h.click();assert.equal(h.window.CCTheme.get(),'light');
});
test('Other-tab changes and cleared preferences are applied consistently',()=>{
  const h=session({system:true});h.storage('light');assert.equal(h.window.CCTheme.get(),'light');
  h.storage(null);assert.equal(h.window.CCTheme.get(),'dark');
});
test('Toggle has the correct accessible label and pressed state',()=>{
  const h=session();assert.equal(h.attributes['button:aria-pressed'],'false');
  h.click();assert.equal(h.attributes['button:aria-pressed'],'true');assert.equal(h.button.textContent,'Light mode');
});
test('Character load/reset/navigation cannot set the global theme',()=>{
  assert.doesNotMatch(app,/state\.sheet\.dark/);
  assert.doesNotMatch(app,/document\.body\.classList\.(?:remove|toggle)\("dark"/);
});
for(const page of pages){
  const html=await readFile(new URL('../'+page+'.html',import.meta.url),'utf8');
  test(page+' has an early theme script and one always-visible global toggle',()=>{
    assert.ok(html.indexOf('src="js/theme.js"')<html.indexOf('rel="stylesheet"'));
    assert.equal((html.match(/id="darkToggle"/g)||[]).length,1);
    assert.match(html,/<body>\s*<div class="global-theme-bar">/);
    assert.equal(session({storage:new Map([['cc-theme','dark']])}).window.CCTheme.get(),'dark');
  });
}
export const summary=`${results.length} global theme scenarios passed`;
export {results};
console.log(summary);
