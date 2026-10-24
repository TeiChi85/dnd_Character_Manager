// Synthetic HTTP/API fixture. Never contacts the user's Flask server or character store.
import {chromium,webkit} from 'playwright';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
import {createUIHarness} from '../ui_test_harness.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const h=createUIHarness();h.chooseClass();
const data=JSON.parse(JSON.stringify(Object.fromEntries(Object.entries(h.window).filter(([key])=>key.startsWith('CC_')))));
data.CC_SPELLS=Array.from({length:34},(_,i)=>({name:i===0?'Synthetic Bolt':'Synthetic Spell '+i,source:'TEST',level:i%4,school:'Evocation',time:'1 action',range:'60 feet',duration:'1 minute',conc:i===1,cls:{classic:['Synthetic Class']},entries:['A synthetic test description with a deliberately long explanatory sentence.']}));
data.CC_FEATURE_DATA.synthetic.classFeatures=[{name:'Synthetic Focus',level:1,entries:['As a bonus action, you gain a +2 bonus to your AC for 1 minute.']}];
data.CC_CLASSES.push({...data.CC_CLASSES[0],slug:'synthetic-one',edition:'one'});
data.CC_FEATURE_DATA['synthetic-one']=structuredClone(data.CC_FEATURE_DATA.synthetic);
data.CC_SPELLCAST['synthetic-one']=structuredClone(data.CC_SPELLCAST.synthetic);
const fixture=JSON.parse(JSON.stringify(h.app.serialize()));fixture.level=5;fixture.name='Aster with a very long character name for narrow screens';fixture.sheet.hpEdited=true;fixture.sheet.hpCurrent=14;
fixture.spells={cantrips:['Synthetic Bolt|TEST'],spells:data.CC_SPELLS.slice(1).map(s=>s.name+'|TEST')};
fixture.equipment.inventory=[{...data.CC_ITEMS[0],qty:1,equipped:false},{name:'Synthetic Protection Charm',source:'TEST',cat:'Wondrous',attune:true,attuned:false,equipped:true,bonusAc:1}];
const id='00000000-0000-4000-8000-000000000001';
let records=[],mode='',checks=0;
function reset(){mode='';records=[{id,revision:1,updated_at:'2026-10-24T12:00:00Z',character:structuredClone(fixture)}];}
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(value));}
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname.startsWith('/api/characters')){
  if(mode==='offline'){res.destroy();return;}
  if(req.method==='GET'){
   if(url.pathname==='/api/characters')json(res,200,{characters:records.map(({character,...meta})=>({...meta,name:character.name,className:character.className,level:character.level,edition:character.edition}))});
   else {const record=records.find(x=>url.pathname.endsWith(x.id));json(res,record?200:404,record||{});}return;
  }
  const record=records.find(x=>url.pathname.endsWith(x.id));
  if(record&&req.headers['if-match']!=='"'+record.revision+'"'){json(res,409,{});return;}
  if(req.method==='DELETE'){records=records.filter(x=>x!==record);json(res,200,{id:record.id,revision:record.revision,deleted:true});return;}
  let body='';for await(const chunk of req)body+=chunk;
  if(mode==='slow')await new Promise(resolve=>setTimeout(resolve,800));
  if(mode==='conflict'){json(res,409,{});return;}
  const saved={id:record?record.id:id,revision:record?record.revision+1:1,updated_at:'2026-10-24T13:00:00Z',character:JSON.parse(body)};
  records=records.filter(x=>x!==record);records.push(saved);json(res,record?200:201,saved);return;
 }
 if(/^\/resources\/.*\.js$/.test(url.pathname)){res.writeHead(200,{'Content-Type':'text/javascript'});res.end('/* synthetic fixture supplies catalogs */');return;}
 const path=resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));
 if(!path.startsWith(root)||!/^\/(?:index.html|js\/|css\/|resources\/)/.test(url.pathname==='/'?'/index.html':url.pathname)){res.writeHead(404);res.end();return;}
 const content=await readFile(path);res.writeHead(200,{'Content-Type':({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.ico':'image/x-icon'})[extname(path)]||'application/octet-stream'});res.end(content);
}catch(error){res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
await mkdir(new URL('./artifacts/',import.meta.url),{recursive:true});
function ok(value,message){assert.ok(value,message);checks++;}
function luminance(hex){hex=hex.trim().replace('#','');if(hex.length===3)hex=hex.split('').map(x=>x+x).join('');const channels=hex.match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
async function noOverflow(page,label){const widths=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('body *')].filter(el=>{const r=el.getBoundingClientRect();return r.width&&r.height&&(r.right>innerWidth+1||r.left< -1);}).slice(0,12).map(el=>({tag:el.tagName,id:el.id,cls:el.className,right:el.getBoundingClientRect().right}))}));ok(widths.scroll<=widths.viewport+1,label+': '+JSON.stringify(widths));}
async function targets(page){const small=await page.locator('.cm-sheet button,.cm-sheet input,.cm-sheet select,.cm-sheet [role="button"],.cm-sheet summary,.server-tools button,.cm-bottom button,#darkToggle').evaluateAll(nodes=>nodes.filter(node=>node.getClientRects().length&&!node.disabled).filter(node=>{const r=node.getBoundingClientRect();return r.width<43.9||r.height<43.9;}).map(node=>node.id||node.className));ok(small.length===0,'Small touch targets: '+small.join(', '));}
async function section(page,key){await page.locator('#sectionSelect').click();await page.locator('[data-section="'+key+'"]').click();}
try{
 for(const [engineName,engine] of [['chromium',chromium],['webkit',webkit]]){
  const browser=await engine.launch();
  try{
   for(const theme of ['dark','light'])for(const [width,height] of [[320,700],[375,812],[390,844],[430,932],[768,1024],[1024,768],[1440,900]]){
    reset();const context=await browser.newContext({viewport:{width,height},hasTouch:width<1024,colorScheme:theme,acceptDownloads:true});
    console.log('Testing',engineName,theme,width);const page=await context.newPage(),errors=[];page.setDefaultTimeout(10000);page.on('pageerror',error=>errors.push(error.message));
    await page.addInitScript(({data,theme})=>{Object.assign(window,data);localStorage.setItem('cc-theme',theme);},{data,theme});
    await page.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
    await page.goto(origin);await page.locator('.server-character').waitFor();await noOverflow(page,'library '+engineName+width+theme);
    if(width===390)await page.screenshot({path:fileURLToPath(new URL(`./artifacts/${engineName}-${theme}-library.png`,import.meta.url)),fullPage:true});
    await page.locator('#librarySearch').fill('no matching character');ok(await page.locator('.server-character').count()===0,'library search');await page.locator('#librarySearch').fill('');
    await page.locator('.server-delete').click();await page.locator('#deleteCancel').click();ok(records.length===1,'cancel deletion');
    await page.locator('.server-character').click();await page.locator('#hpCur').waitFor();
    ok(await page.locator('#hpCur').inputValue()==='14','loaded HP');ok(await page.locator('.abil-cell').count()===6,'six attributes');
    const tokens=await page.evaluate(()=>{const style=getComputedStyle(document.documentElement);return Object.fromEntries(['--cm-text','--cm-muted','--cm-surface','--cm-accent','--cm-on-accent'].map(name=>[name,style.getPropertyValue(name)]));});
    for(const foreground of ['--cm-text','--cm-muted'])ok(contrast(tokens[foreground],tokens['--cm-surface'])>=4.5,'text contrast '+theme);
    ok(contrast(tokens['--cm-on-accent'],tokens['--cm-accent'])>=4.5,'button contrast '+theme);
    if(width===390)await page.screenshot({path:fileURLToPath(new URL(`./artifacts/${engineName}-${theme}-overview.png`,import.meta.url)),fullPage:true});
    if(width<1024){
     await page.locator('.cm-extra summary').click();await noOverflow(page,'expanded secondary stats');await targets(page);await page.locator('.cm-extra summary').click();
     await page.locator('#sectionSelect').click();await page.keyboard.press('Escape');ok(await page.locator('#sectionSelect').evaluate(el=>el===document.activeElement),'selector focus');
     for(const key of ['skills','combat','resources','spells','inventory','features','defences','background','rest','training']){
      await section(page,key);await noOverflow(page,key+engineName+width+theme);await targets(page);
      if(key==='skills')ok(await page.locator('#activeSheetSection .line-row').count()===18,'18 skills');
      if(['skills','combat','spells','inventory'].includes(key)&&width===390)await page.screenshot({path:fileURLToPath(new URL(`./artifacts/${engineName}-${theme}-${key}.png`,import.meta.url)),fullPage:true});
     }
     ok(await page.locator('#serverSaveStatus').innerText()==='Loaded from server.','visual navigation stays clean');
     if(width===390){await page.locator('#sectionSelect').click();await page.goBack();ok(!await page.locator('#sectionDialog').evaluate(el=>el.open),'browser Back closes section dialog');await page.locator('#mobileLibrary').click();await page.goBack();await page.locator('#hpCur').waitFor();ok(await page.locator('#hpCur').inputValue()==='14','Back preserves character');}
    }
    await noOverflow(page,'sheet '+engineName+width+theme);
    await page.locator('#hpCur').fill('7');
    if(width<1024)await section(page,'spells');
    await page.locator('#sheetSpellSearch').fill('Synthetic Spell 1');ok(await page.locator('.sheet-card').filter({has:page.locator('#sheetSpellSearch')}).locator('.sc-item').count()>0,'spell search');
    await page.locator('#sheetSpellSearch').fill('no spell matches');ok(await page.getByText('No spells match the current filters.').isVisible(),'empty spell filter');
    await page.locator('#sheetSpellSearch').fill('');await page.locator('#sheetSpellLevel').selectOption('1');ok(await page.locator('.sheet-card').filter({has:page.locator('#sheetSpellSearch')}).locator('.sc-item').count()===9,'spell level filter');await page.locator('#sheetSpellLevel').selectOption('');await page.locator('.pip[data-k="slot:1:0"]').click();
    if(width<1024)await section(page,'inventory');
    await page.locator('.sh-equip').first().click();await page.locator('.sh-attune').click();
    if(width===390)mode='slow';
    await page.locator('#serverSave').click();
    if(width===390){await page.locator('#mobileLibrary').click();ok(await page.locator('#screen-build').isVisible(),'busy save guards library navigation');}
    await page.waitForFunction(()=>document.getElementById('serverSaveStatus').textContent.indexOf('Saved')>=0);mode='';
    ok(records[0].character.sheet.hpCurrent===7,'persist HP');ok(records[0].character.sheet.res['slot:1:0']===true,'persist slot');ok(records[0].character.equipment.inventory[0].equipped===true,'persist equip');ok(records[0].character.equipment.inventory[1].attuned===true,'persist attune');
    await page.reload();await page.locator('.server-character').click();await page.locator('#hpCur').waitFor();ok(await page.locator('#hpCur').inputValue()==='7','reload persisted HP');
    await page.locator('#darkToggle').click();ok(await page.locator('html').getAttribute('data-theme')!==theme,'theme toggle');
    if(width===1440){await page.setViewportSize({width:720,height:450});await noOverflow(page,'200 percent desktop reflow equivalent');}
    ok(errors.length===0,errors.join('\n'));
    await context.close();console.log(engineName,theme,width,'passed');
   }
   reset();const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,acceptDownloads:true});const page=await context.newPage();page.setDefaultTimeout(10000);
   await page.addInitScript(data=>{Object.assign(window,data);window.showSaveFilePicker=undefined;window.showOpenFilePicker=undefined;},data);
   page.on('dialog',dialog=>dialog.accept());
   records=[];await page.goto(origin);await page.getByText('No characters saved on the server yet.').waitFor();checks++;
   await page.locator('#createNew').click();await page.locator('.ed-card[data-edition="classic"]').focus();await page.keyboard.press('Enter');await page.locator('#classSelect').waitFor();await page.locator('#classSelect').selectOption('synthetic');
   const builderStyles=await page.evaluate(()=>{const sample=()=>['classSelect','charName','classCard','featureList'].map(id=>{const el=document.getElementById(id),s=getComputedStyle(el),r=el.getBoundingClientRect();return [id,s.fontSize,s.color,s.backgroundColor,r.width,r.height];});const before=sample(),sheet=[...document.styleSheets].find(sheet=>sheet.href&&sheet.href.endsWith('/mobile.css'));sheet.disabled=true;const after=sample();sheet.disabled=false;return {before,after};});
   assert.deepEqual(builderStyles.before,builderStyles.after);checks++;
   for(const id of ['toBackground','toSpecies','toAbilities','toEquipment','toSpells','toSheet'])await page.locator('#'+id).click();ok(await page.locator('#hpCur').isVisible(),'existing builder completes');
   await page.locator('#mobileLibrary').click();reset();await page.locator('#serverRefresh').click();await page.locator('.server-character').waitFor();
   await page.locator('.server-delete').click();await page.locator('#deleteConfirm').click();await page.waitForFunction(()=>!document.querySelector('.server-character'));ok(records.length===0,'confirmed deletion');
   reset();await page.locator('#serverRefresh').click();await page.locator('.server-character').click();await page.locator('#hpCur').fill('6');
   mode='conflict';await page.locator('#serverSave').click();await page.locator('#serverConflict').waitFor({state:'visible'});ok(records[0].character.sheet.hpCurrent===14,'conflict preserves server');
   mode='offline';await page.locator('#mobileLibrary').click();await page.getByText('Could not load the server library. Check that Flask is running, then choose Refresh.').waitFor();checks++;
   await page.locator('#mobileCharacter').click();await page.locator('#sheetActions').click();const downloading=page.waitForEvent('download');await page.locator('#mobileExport').click();const download=await downloading;
   const exported=JSON.parse(await readFile(await download.path(),'utf8'));ok(exported.sheet.hpCurrent===6,'local JSON export while offline');
   await page.locator('#fileLoadStart').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});await page.waitForFunction(()=>document.getElementById('hpCur').value==='14');checks++;
   await page.locator('#mobileLibrary').click();if(!await page.locator('#createOptions').isVisible())await page.locator('#createNew').click();await page.locator('.ed-card[data-edition="one"]').click();await page.locator('#classSelect').selectOption('synthetic-one');await page.locator('#toBackground').click();ok(await page.locator('#bgSelect').isVisible(),'2024 builder remains reachable');
   await context.close();console.log(engineName,'empty/delete/conflict/offline/builder/JSON passed');
  }finally{await browser.close();}
 }
 console.log(`${checks} browser checks passed`);
}finally{await new Promise(resolve=>server.close(resolve));}
