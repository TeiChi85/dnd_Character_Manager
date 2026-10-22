// Optional real-HTTP test: start Flask with a disposable store on 127.0.0.1:8001.
// Only IDs created by this run are deleted. Rendering is covered by validate.js.
import assert from 'node:assert/strict';
import {harness} from './validate_server_frontend.mjs';

const base='http://127.0.0.1:8001';
const ownIds=new Set();
const h=harness({transport:async(path,options)=>{
  const response=await fetch(base+path,options);
  if(options.method==='POST'&&response.status===201){
    const record=await response.clone().json();
    assert.match(record.id,/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    ownIds.add(record.id);
  }
  return response;
}});
const uniqueName='Synthetic Live '+Date.now();
async function read(path=''){
  const response=await fetch(base+'/api/characters'+path);
  assert.equal(response.status,200);return response.json();
}
async function metadata(){return (await read()).characters.filter(item=>ownIds.has(item.id));}
let scenarios=0;
try{
  h.app.load({...h.fixture(),name:uniqueName});await h.app.library.save(false);
  assert.equal(h.status(),'Saved to server.');let list=await metadata();
  assert.equal(list.length,1);const original=list[0];scenarios++;
  h.app.state.name=uniqueName+' Updated';await h.app.library.save(false);
  assert.equal((await read('/'+original.id)).revision,2);scenarios++;
  await h.app.library.save(true);list=await metadata();assert.equal(list.length,2);
  scenarios++;
  h.app.reset();await h.app.library.open(original.id);
  assert.equal(h.app.state.name,uniqueName+' Updated');scenarios++;
  const record=await read('/'+original.id);record.character.name=uniqueName+' Remote';
  const updated=await fetch(base+'/api/characters/'+original.id,{method:'PUT',
    headers:{'Content-Type':'application/json','If-Match':'"2"'},body:JSON.stringify(record.character)});
  assert.equal(updated.status,200);h.app.state.name=uniqueName+' Mine';
  await h.app.library.save(false);assert.match(h.status(),/newer version/);
  assert.equal((await read('/'+original.id)).character.name,uniqueName+' Remote');scenarios++;
  await h.app.library.refresh();const current=(await metadata()).find(item=>item.id===original.id);
  const count=h.requests.filter(item=>item.method==='DELETE').length;
  const cancelled=h.app.library.remove(current);h.document.getElementById('deleteCancel').click();await cancelled;
  assert.equal(h.requests.filter(item=>item.method==='DELETE').length,count);scenarios++;
  const stale=h.app.library.remove({...current,revision:2});h.document.getElementById('deleteConfirm').click();await stale;
  assert.match(h.listStatus(),/Nothing was deleted/);assert.equal((await read('/'+original.id)).revision,3);scenarios++;
  const deleted=h.app.library.remove(current);h.document.getElementById('deleteConfirm').click();await deleted;
  assert.equal((await fetch(base+'/api/characters/'+original.id)).status,404);
  assert.equal((await metadata()).length,1);assert.match(h.listStatus(),/Moved to the server trash/);scenarios++;
}finally{
  // Leave recovery archives intact; never touch any IDs not created above.
  for(const identifier of ownIds){
    const response=await fetch(base+'/api/characters/'+identifier);
    if(response.status===404)continue;
    assert.equal(response.status,200);const record=await response.json();
    const deleted=await fetch(base+'/api/characters/'+identifier,{method:'DELETE',headers:{'If-Match':'"'+record.revision+'"'}});
    assert.equal(deleted.status,200);
  }
}
export const summary=`${scenarios} real-HTTP frontend scenarios passed`;
console.log(summary);
