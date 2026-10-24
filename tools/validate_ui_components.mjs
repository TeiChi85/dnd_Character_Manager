import assert from 'node:assert/strict';
import components from '../js/ui/components.js';
import {createUIHarness} from './ui_test_harness.mjs';
let checks=0;
function eq(a,b){assert.deepEqual(a,b);checks++;}
eq(components.esc('<img title="x">&'), '&lt;img title=&quot;x&quot;&gt;&amp;');
eq(components.esc(null),'null');eq(components.card('Empty',''),'');
assert.match(components.card('<script>','<p>Trusted</p>'),/<h3>&lt;script&gt;<\/h3>/);checks++;
assert.match(components.value('12','AC','"why"'),/title="&quot;why&quot;"/);checks++;
const p=Object.freeze({name:'<b>Unsafe</b>',key:'"key',open:false,pending:true,bodyHTML:'<p>Content</p>'});
assert.match(components.panel(p),/feature collapsed needs/);checks++;
assert.match(components.panel(p),/&lt;b&gt;Unsafe&lt;\/b&gt;/);checks++;
eq(components.panel(p),components.panel(p));
const callbacks=new Set(),classes=new Set(['collapsed']);let toggles=0,open;
const panel={getAttribute:()=> 'panel',classList:{toggle(k){classes.has(k)?classes.delete(k):classes.add(k);},contains:k=>classes.has(k)}};
const head={parentNode:panel,addEventListener(type,fn){callbacks.add(fn);},removeEventListener(type,fn){callbacks.delete(fn);}};
const host={querySelectorAll:()=>[head]};
components.collapse(host,(key,value)=>{eq(key,'panel');toggles++;open=value;});
components.collapse(host,(key,value)=>{eq(key,'panel');toggles++;open=value;});
eq(callbacks.size,1);for(const fn of callbacks)fn();eq(toggles,1);eq(open,true);
components.collapse({querySelectorAll:()=>[]},()=>assert.fail('empty panel'));checks++;
function ok(value){assert.ok(value);checks++;}
function match(value,re){assert.match(value,re);checks++;}
const clone=value=>JSON.parse(JSON.stringify(value));
function freeze(value){Object.freeze(value);for(const child of Object.values(value))if(child&&typeof child==='object'&&!Object.isFrozen(child))freeze(child);return value;}
let h=createUIHarness(),app=h.app,doc=h.document;
eq(app.ui.screen,'edition');app.render();
match(doc.getElementById('spellsPanel').innerHTML,/Choose a class first/);
match(doc.getElementById('sheetPanel').innerHTML,/Pick a class/);
for(const step of ['class','background','species','abilities','equipment','spells'])app.creator.renderStep(step);
for(const section of Object.keys(app.sheet.sections)){const host=h.element();app.sheet.renderSection(section,host);match(host.innerHTML,/Pick a class/);}
h.chooseClass();eq(app.state.className,'Synthetic Class');eq(app.ui.screen,'build');
ok(h.calls.CCCreatorUI.renderHeader>0);ok(h.calls.CCCreatorUI.renderFeatures>0);
ok(h.calls.CCCharacterSheetUI.renderSheet>0);ok(h.calls.CCNavigationUI.showBuild>0);
ok(h.calls.CCRuleTextUI.renderEntry>0);
h.change('levelSelect','3');eq(app.state.level,3);
// Introduce a synthetic subclass-gain feature through the normal data boundary.
app.derived.fdata.classFeatures=[{name:'Synthetic Path',level:1,gainSubclassFeature:true,entries:[]}];
app.creator.renderStep('class');h.change('originSelect','Synthetic Subclass');eq(app.state.subclassName,'Synthetic Subclass');
h.change('bgSelect','Synthetic Background|TEST');eq(app.state.background.name,'Synthetic Background');
match(doc.getElementById('bgDetail').innerHTML,/Background text/);
h.change('raceSelect','Synthetic Species|TEST');eq(app.state.race.name,'Synthetic Species');
match(doc.getElementById('raceDetail').innerHTML,/Synthetic Species/);
let input=doc.querySelector('.ab-override[data-ab=Strength]');input.value='18';input.fire('change');eq(app.state.abilities.override.Strength,'18');
app.creator.renderStep('equipment');doc.querySelector('#itemResults .add').click();eq(app.state.equipment.inventory.length,1);
app.creator.renderStep('spells');let checkbox=doc.querySelector('.sp-chk[data-kind=cantrip]');checkbox.checked=true;checkbox.fire('change');
eq(clone(app.state.spells.cantrips),['Synthetic Bolt|TEST']);
// Searches and preview are view state, and updating them leaves another section intact.
const sheetBefore=doc.getElementById('sheetPanel').innerHTML,persisted=app.serialize();
h.change('itemSearch','no match','input');match(doc.getElementById('itemResults').innerHTML,/No items match/);
eq(doc.getElementById('sheetPanel').innerHTML,sheetBefore);eq(clone(app.serialize()),clone(persisted));
app.ui.sheet.invAdd='draft "<keep>"';
const beforeNavigation=clone(app.serialize());
for(const step of ['background','species','abilities','equipment','spells','sheet','class']){
  app.navigation.setStep(step);eq(app.ui.currentStep,step);ok(!doc.getElementById('step-'+step).classList.contains('hidden'));
}
eq(clone(app.serialize()),beforeNavigation);eq(app.ui.sheet.invAdd,'draft "<keep>"');
app.navigation.mount();app.navigation.mount();eq(doc.listeners.click.size,1);eq(doc.listeners.keydown.size,1);
h.click('menuBtn');ok(doc.getElementById('stepsMenu').classList.contains('open'));
doc.fire('keydown',{key:'Escape'});ok(!doc.getElementById('stepsMenu').classList.contains('open'));
h.click('menuBtn');doc.fire('click');ok(!doc.getElementById('stepsMenu').classList.contains('open'));
h.click('toSheet');eq(app.ui.currentStep,'sheet');
const sheet=doc.getElementById('sheetPanel');
match(sheet.innerHTML,/Ability Scores/);match(sheet.innerHTML,/Saving Throws/);match(sheet.innerHTML,/Skills/);
match(sheet.innerHTML,/Armor Class/);match(sheet.innerHTML,/id="hpCur"/);match(sheet.innerHTML,/Synthetic Resource/);
match(sheet.innerHTML,/Synthetic Blade/);match(sheet.innerHTML,/Synthetic Bolt/);
eq(doc.querySelectorAll('#hpCur').length,1);eq(doc.querySelectorAll('#invCustom').length,1);
match(sheet.innerHTML,/value="draft &quot;&lt;keep&gt;&quot;"/);
const pip=doc.querySelector('.pip[data-k="Synthetic Resource:0"]');pip.click();eq(app.state.sheet.res['Synthetic Resource:0'],true);
h.change('hpCur','3','input');eq(app.state.sheet.hpCurrent,3);eq(app.state.sheet.hpEdited,true);
h.change('levelSelect','4');eq(app.state.sheet.hpCurrent,3);
app.derived.fdata.classFeatures.push({name:'Synthetic Focus',level:1,entries:['As a bonus action, you gain a +2 bonus to your AC for 1 minute.']});app.state.sheet.active={'Synthetic Focus':true};app.render();match(sheet.innerHTML,/fx-pill/);
doc.querySelector('.fx-pill').click();eq(Object.keys(app.state.sheet.active).length,0);
h.click('inspBox');eq(app.state.sheet.inspiration,true);
app.render();app.render();eq(doc.getElementById('inspBox').listeners.click.size,1);
h.click('inspBox');eq(app.state.sheet.inspiration,false);
h.click('longRest');eq(app.state.sheet.hpEdited,false);eq(app.state.sheet.res['Synthetic Resource:0'],undefined);
// Independent section updates own only their target and its fresh local handlers.
const target=h.element(),other=h.element();other.innerHTML='keep me';
app.ui.sheet.invQ='Blade';const existingSearch=doc.getElementById('invResults').innerHTML;
app.sheet.renderSection('inventory',target);match(target.innerHTML,/Synthetic Blade/);eq(other.innerHTML,'keep me');
eq(doc.getElementById('invResults').innerHTML,existingSearch);ok(target.querySelector('.sh-additem'));
app.sheet.renderSection('inventory',target);eq(target.querySelector('.sh-rm').listeners.click.size,1);
target.querySelector('.sh-rm').click();eq(app.state.equipment.inventory.length,0);
app.state.name='<img onerror="unsafe">';app.render();match(sheet.innerHTML,/&lt;img onerror=&quot;unsafe&quot;&gt;/);ok(!sheet.innerHTML.includes('<img onerror='));
// Freeze the entire persistent object graph: pure full, step and section rendering must work.
freeze(app.state);const frozenSnapshot=clone(app.serialize());
app.render();app.render();
for(const step of ['class','background','species','abilities','equipment','spells'])app.creator.renderStep(step);
for(const section of Object.keys(app.sheet.sections)){const host=h.element();app.sheet.renderSection(section,host);eq(clone(app.serialize()),frozenSnapshot);}
app.navigation.setStep('sheet');eq(clone(app.serialize()),frozenSnapshot);
// A real start-page action resets gameplay and clears view drafts in place.
h=createUIHarness();h.chooseClass();const stateIdentity=h.app.state;
h.change('charName','Keep input','input');h.app.ui.sheet.invAdd='draft';h.click('changeEdition');
eq(h.app.state,stateIdentity);eq(h.app.state.name,'');eq(h.app.ui.sheet.invAdd,'');eq(h.app.ui.screen,'edition');
// Normalization occurs on import, while rendering even unusual state remains pure.
h=createUIHarness();h.chooseClass();let saved=clone(h.app.serialize());
saved.equipment.inventory=[{name:'Body A',cat:'Armor',armorKind:'light',ac:11,equipped:true},
  {name:'Body B',cat:'Armor',armorKind:'light',ac:12,equipped:true},
  {name:'Stale attunement',cat:'Other Gear',attuned:true}];
h.app.load(saved);eq(h.app.state.equipment.inventory[1].equipped,false);eq(h.app.state.equipment.inventory[2].attuned,false);
h.app.state.equipment.inventory[1].equipped=true;h.app.state.equipment.inventory[2].attuned=true;
freeze(h.app.state);const unusual=clone(h.app.serialize());h.app.render();eq(clone(h.app.serialize()),unusual);
console.log(`${checks} UI component and application checks passed`);
