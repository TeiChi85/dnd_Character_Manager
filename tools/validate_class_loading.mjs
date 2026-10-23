// Controlled script completions exercise the real class change handler and loader.
// Synthetic references only; no D&D rule data or browser dependency.
import assert from 'node:assert/strict';
import {harness} from './validate_server_frontend.mjs';

const results=[];
function test(name,run){run();results.push(name);}
function session(){
  const h=harness();h.app.state.edition='classic';
  for(const name of ['Fighter','Wizard'])h.window.CC_CLASSES.push({
    slug:name.toLowerCase(),name,edition:'classic',source:'Synthetic',hdFaces:8});
  const select=h.document.getElementById('classSelect');
  return {...h,
    choose(slug){select.value=slug;select.handlers.change({target:select});},
    pending(){return h.document.head.children.filter(el=>el.tag==='script');},
    complete(script,label='current'){
      const slug=script.src.match(/([^/]+)\.js$/)[1];
      const data={classFeatures:[],syntheticSelection:label};
      h.window.CC_FEATURE_DATA[slug]=data;script.onload();return data;
    },
    check(slug,data){
      assert.equal(select.value,slug);assert.equal(h.app.state.slug,slug||null);
      assert.equal(h.app.state.fdata,data);
      const rendered=h.window.__renders.at(-1);
      assert.equal(rendered.slug,slug||null);assert.equal(rendered.fdata,data);
      assert.equal(rendered.className,h.app.state.className);
      if(slug)assert.equal(h.document.getElementById('featTitle').textContent,h.app.state.className+' Features');
    }
  };
}

test('Fighter -> Wizard ignores a late Fighter success',()=>{
  const h=session();h.choose('fighter');h.choose('wizard');const [f,w]=h.pending();
  const current=h.complete(w);h.check('wizard',current);
  const count=h.window.__renders.length;h.complete(f,'stale');h.check('wizard',current);
  assert.equal(h.window.__renders.length,count);
});
test('Fighter -> Wizard -> Fighter accepts only the newest generation',()=>{
  const h=session();h.choose('fighter');h.choose('wizard');h.choose('fighter');
  const [first,w,last]=h.pending();
  h.complete(first,'first');h.check('fighter',null);
  const current=h.complete(last,'last');h.complete(w,'stale');h.check('fighter',current);
});
test('An old same-class completion cannot replace the latest completed generation',()=>{
  const h=session();h.choose('fighter');h.choose('wizard');h.choose('fighter');
  const [first,w,last]=h.pending(),current=h.complete(last,'last');
  h.complete(first,'first');w.onerror();h.check('fighter',current);
});
test('Clearing the class invalidates pending responses',()=>{
  const h=session();h.choose('fighter');const [f]=h.pending();h.choose('');
  h.complete(f);h.check('',null);
});
test('Resetting invalidates pending responses even after choosing the same class again',()=>{
  const h=session();h.choose('fighter');const [first]=h.pending();h.app.reset();
  h.app.state.edition='classic';h.choose('fighter');const last=h.pending().at(-1);
  const current=h.complete(last,'new character');h.complete(first,'old character');h.check('fighter',current);
});
test('Leaving the creator invalidates pending responses without rendering again',()=>{
  const h=session();h.choose('fighter');const [f]=h.pending();h.app.home();
  const count=h.window.__renders.length;h.complete(f);h.check('fighter',null);
  assert.equal(h.window.__renders.length,count);
});
test('Immediate and cached normal class changes remain consistent',()=>{
  const h=session();h.choose('fighter');const fighter=h.complete(h.pending().at(-1));h.check('fighter',fighter);
  h.choose('wizard');const wizard=h.complete(h.pending().at(-1));h.check('wizard',wizard);
  const count=h.pending().length;h.choose('fighter');h.check('fighter',fighter);
  assert.equal(h.pending().length,count);
});
test('Replacing a pending local import with a sparse character prevents late navigation',()=>{
  const h=session();const value=h.fixture();value.slug='fighter';value.className='Fighter';
  h.app.load(value);const [f]=h.pending();
  h.app.load({_app:'dnd-cc',_v:1});const count=h.window.__renders.length;
  h.complete(f);h.check('',null);assert.equal(h.window.__renders.length,count);
});

export const summary=`${results.length} class loading regression scenarios passed`;
export {results};
console.log(summary);
