// Small DOM/event fixture for the real application. Synthetic data only, no packages.
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=name=>readFileSync(new URL(`../${name}`,import.meta.url),'utf8').replace(/\r\n/g,'\n');
const decode=s=>s.replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
export function createUIHarness({appSource=source('js/app.js'),mobile=false}={}){
  function matches(node,selector){
    const tag=selector.match(/^[\w-]+/);if(tag&&node.tagName!==tag[0])return false;
    for(const [,id] of selector.matchAll(/#([\w-]+)/g))if(node.id!==id)return false;
    for(const [,cls] of selector.matchAll(/\.([\w-]+)/g))if(!node.classList.contains(cls))return false;
    for(const [,key,value] of selector.matchAll(/\[([\w-]+)(?:=["']?([^\]"']*)["']?)?\]/g)){
      if(node.getAttribute(key)===null||(value!==undefined&&node.getAttribute(key)!==value))return false;
    }
    return true;
  }
  class Element{
    constructor(tag='div'){
      this.tagName=tag;this.children=[];this.attrs={};this.listeners={};this.style={};this.value='';this.textContent='';
      this.classList={contains:k=>this.className.split(/\s+/).includes(k),add:k=>{if(!this.classList.contains(k))this.className+=' '+k;},
        remove:k=>{this.className=this.className.split(/\s+/).filter(x=>x!==k).join(' ');},
        toggle:(k,on)=>{if(on===undefined)on=!this.classList.contains(k);on?this.classList.add(k):this.classList.remove(k);return on;}};
    }
    get id(){return this.attrs.id||'';}set id(v){this.attrs.id=v;}
    get className(){return this.attrs.class||'';}set className(v){this.attrs.class=v;}
    get innerHTML(){return this.markup||'';}
    set innerHTML(html){this.markup=String(html);this.children=[];parse(this.markup,this);}
    setAttribute(k,v){this.attrs[k]=String(v);if(k==='value')this.value=decode(String(v));if(k==='checked')this.checked=true;}
    getAttribute(k){return Object.hasOwn(this.attrs,k)?this.attrs[k]:null;}
    appendChild(child){if(child.parentNode)child.parentNode.removeChild(child);child.parentNode=this;this.children.push(child);return child;}
    removeChild(child){this.children=this.children.filter(x=>x!==child);child.parentNode=null;}
    contains(node){return node===this||this.children.some(x=>x.contains(node));}
    querySelectorAll(selector){
      const parts=selector.trim().match(/(?:\[[^\]]*\]|[^\s\[\]])+/g),last=parts.pop();
      const result=[];
      const visit=node=>{for(const child of node.children){
        if(matches(child,last)){
          let ancestor=child.parentNode,ok=true;
          for(let i=parts.length-1;i>=0;i--){while(ancestor&&ancestor!==this&&!matches(ancestor,parts[i]))ancestor=ancestor.parentNode;
            if(!ancestor||ancestor===this&&!matches(ancestor,parts[i])){ok=false;break;}ancestor=ancestor.parentNode;}
          if(ok)result.push(child);
        }visit(child);
      }};visit(this);return result;
    }
    querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
    addEventListener(type,fn){(this.listeners[type]??=new Set()).add(fn);}
    removeEventListener(type,fn){this.listeners[type]?.delete(fn);}
    fire(type,extra={}){const event={target:this,stopPropagation(){},preventDefault(){},...extra};
      for(const fn of [...this.listeners[type]||[]])fn(event);this['on'+type]?.(event);}
    click(){this.fire('click');}focus(){this.focused=true;document.activeElement=this;}scrollIntoView(){}
    showModal(){this.open=true;}close(){this.open=false;this.fire('close');}
  }
  function parse(html,host){
    const stack=[host];
    for(const token of html.matchAll(/<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>|[^<]+/g)){
      const t=token[0];if(t.startsWith('<!--'))continue;
      if(t.startsWith('</')){const name=t.slice(2).match(/[\w-]+/)[0];for(let i=stack.length-1;i>0;i--)if(stack[i].tagName===name){stack.length=i;break;}continue;}
      if(t.startsWith('<')){
        const tag=t.slice(1).match(/[\w-]+/)[0].toLowerCase(),node=new Element(tag);
        const attrs=t.slice(tag.length+1,-1);
        for(const [,key,a,b,c] of attrs.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))node.setAttribute(key,decode(a??b??c??''));
        stack.at(-1).appendChild(node);
        if(tag==='option'&&(node.getAttribute('selected')!==null||!stack.at(-1).value))stack.at(-1).value=node.value;
        if(!['input','img','br','hr','meta','link','source'].includes(tag)&&!t.endsWith('/>'))stack.push(node);
      }else{stack.at(-1).textContent+=decode(t);}
    }
  }
  const document=new Element('document');document.body=document.appendChild(new Element('body'));document.head=new Element('head');
  document.body.innerHTML=source('index.html').split('<body>')[1].split('</body>')[0].replace(/<script[\s\S]*?<\/script>/g,'');
  document.getElementById=id=>document.querySelector('#'+id);document.createElement=tag=>new Element(tag);
  const fields={classFeatures:[],subclasses:[{name:'Synthetic Subclass',shortName:'Synthetic Subclass',source:'TEST',features:[]}],
    proficiencies:{},optionalProgressions:[],optionLists:{},inlineChoiceCount:{}};
  const window={scrollTo(){},setTimeout(){return 1;},clearTimeout(){},location:{protocol:'file:'},
    CC_CLASSES:[{slug:'synthetic',name:'Synthetic Class',source:'TEST',edition:'classic',hdFaces:8,isCore:true}],
    CC_FEATURE_DATA:{synthetic:fields},CC_SPELLS:[{name:'Synthetic Bolt',source:'TEST',level:0,school:'Evocation',cls:{classic:['Synthetic Class']},entries:['Synthetic text.']}],
    CC_SPELLCAST:{synthetic:{ability:'Intelligence',caster:'full',cantrips:[2,2,2,3,3],spellsKnown:[2,3,4,5,6],slots:{type:'slots',rows:[[2],[3],[4,2],[4,3],[4,3,2]]}}},
    CC_ITEMS:[{name:'Synthetic Blade',source:'TEST',cat:'Weapon',weaponCat:'simple',wtype:'M',dmg:'1d6',dmgType:'S'}],
    CC_BACKGROUNDS:{classic:[{name:'Synthetic Background',source:'TEST',desc:'Background text.',skills:{fixed:[]},langs:{fixed:[]},tools:{fixed:[]},entries:[]}]},
    CC_RACES:{classic:[{name:'Synthetic Species',source:'TEST',entries:['Species text.'],speed:30,traits:[],ability:{fixed:{},choose:[]},skills:{fixed:[]},langs:{fixed:[]},lineages:[],resist:[],immune:[],weapons:[],armor:[],tools:[],spells:[],spellChoices:[]}]},
    CC_RESOURCES:{synthetic:[{name:'Synthetic Resource',values:[2,2,3,3,4]}]},CC_STARTING:{classes:{},backgrounds:{}},CC_FEATS:[],CC_OPTFEATURES:[]};
  const alerts=[],calls={};const context=vm.createContext({window,document,console,alert:msg=>alerts.push(msg),confirm:()=>true,Promise,
    setTimeout:window.setTimeout,clearTimeout:window.clearTimeout});
  if(mobile)window.matchMedia=()=>({matches:true,addEventListener(){}});
  for(const name of ['character-validation','core/character-state','core/rules-core','core/rules-engine',
    'ui/components','ui/rule-text','ui/creator','ui/character-sheet','ui/navigation','ui/library'])vm.runInContext(source(`js/${name}.js`),context,{filename:name});
  for(const name of ['CCRuleTextUI','CCCreatorUI','CCCharacterSheetUI','CCNavigationUI']){
    const original=window[name].create;
    window[name].create=ctx=>{const api=original(ctx);calls[name]={};for(const key of Object.keys(api))if(typeof api[key]==='function'){
      const fn=api[key];calls[name][key]=0;api[key]=(...args)=>{calls[name][key]++;return fn(...args);};}return api;};
  }
  const startup='initServerLibrary();\n  populateLevels();showEdition();showDataVersion();';
  vm.runInContext(appSource.replace(/\r\n/g,'\n').replace(startup,`${startup}
    window.testApp={state:state,ui:uiState,derived:derivedState,render:render,reset:resetCharacter,load:loadCharObj,
      serialize:serializeChar,creator:typeof creatorUI==='undefined'?null:creatorUI,sheet:typeof sheetUI==='undefined'?null:sheetUI,navigation:typeof navigationUI==='undefined'?null:navigationUI};`),context,{filename:'app.js'});
  const app=window.testApp;
  function chooseClass(){if(!app.state.edition)document.querySelector('.ed-card[data-edition=classic]').click();document.getElementById('classSelect').value='synthetic';document.getElementById('classSelect').fire('change');}
  return {app,document,window,alerts,calls,context,chooseClass,element:()=>new Element(),
    change(id,value,type='change'){const el=document.getElementById(id);if(!el)throw new Error(`Missing control ${id}`);el.value=value;el.fire(type);},
    click(id){const el=document.getElementById(id);if(!el)throw new Error(`Missing control ${id}`);el.click();}};
}
