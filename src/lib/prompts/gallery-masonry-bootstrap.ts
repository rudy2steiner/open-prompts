/** 独立于 React 分包的首屏排版。脚本位于卡片之前，随 HTML 到达即开始工作。 */
export const GALLERY_MASONRY_BOOTSTRAP = `(function(){
var r=document.currentScript&&document.currentScript.parentElement;
if(!r||r.dataset.masonryClient||!window.ResizeObserver||!window.MutationObserver)return;
var store=window.__opGalleryMasonry||(window.__opGalleryMasonry=Object.create(null));
var seen=new WeakSet(),entry={width:280,layout:{positions:new Map(),height:0,ready:false},disconnect:function(){ro.disconnect();mo.disconnect();}};
store[r.id]=entry;
function run(){
var cw=r.clientWidth;if(cw<=0)return;
var cols=cw>=1280?4:cw>=1024?3:cw>=640?2:1,w=(cw-16*(cols-1))/cols;
var cards=Array.prototype.filter.call(r.children,function(e){return e.hasAttribute('data-gallery-item');});
cards.forEach(function(e){e.style.width=w+'px';if(!seen.has(e)){seen.add(e);ro.observe(e);}});
var heights=cards.map(function(e){return e.getBoundingClientRect().height;}),tails=new Array(cols).fill(0),positions=new Map();
cards.forEach(function(e,i){var col=0;for(var c=1;c<cols;c++)if(tails[c]<tails[col])col=c;
var x=col*(w+16),y=tails[col],id=e.getAttribute('data-gallery-item');positions.set(id,{x:x,y:y,width:w});
var transform='translate3d('+x+'px, '+y+'px, 0)';if(e.style.transform!==transform)e.style.transform=transform;
tails[col]=y+heights[i]+(heights[i]>0?16:0);});
var max=Math.max.apply(Math,[0].concat(tails)),height=max>0?max-16:0;
if(r.style.height!==height+'px')r.style.height=height+'px';
r.dataset.masonryReady='true';entry.width=w;entry.layout={positions:positions,height:height,ready:true};
}
var ro=new ResizeObserver(run),mo=new MutationObserver(run);ro.observe(r);mo.observe(r,{childList:true});run();
})();`;
