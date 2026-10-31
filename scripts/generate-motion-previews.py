"""为 Hero 和默认首批作品生成本站短预览，完整视频地址不变。"""
import argparse, concurrent.futures, hashlib, json, pathlib, re, subprocess, tempfile
ROOT=pathlib.Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--ffmpeg',required=True);p.add_argument('--count',type=int,default=12);args=p.parse_args()
records=json.loads((ROOT/'src/data/imports/motion-catalog.json').read_text());metrics=json.loads((ROOT/'src/data/imports/motion-popularity.json').read_text())['works']
exclusions=json.loads((ROOT/'src/data/imports/motion-quality-exclusions.json').read_text())
records=[e for e in records if e.get('poster') and e['id'] not in exclusions]
def rank(entry):
 m=metrics.get(entry['id'],{});likes=m.get('likes') if m.get('sourceUrl')==entry['sourceUrl'] else None
 return (likes is None,-likes if isinstance(likes,int) else 0)
selected=[e for e in records if e['id']=='motion-showreel']+sorted(records,key=rank)[:args.count]
selected=list({e['id']:e for e in selected if e.get('video')}.values())
output=ROOT/'public/motion-previews';output.mkdir(exist_ok=True)
manifest=ROOT/'src/data/imports/motion-preview-videos.json';prior=json.loads(manifest.read_text()) if manifest.exists() else {}
def generate(entry):
 signature=hashlib.sha256(('480p20fps-crf30-6s-v1:'+entry['video']).encode()).hexdigest()[:10]
 local=f"/motion-previews/{entry['id']}-{signature}.mp4";target=ROOT/'public'/local.lstrip('/')
 if target.exists():return entry['id'],{'previewVideo':local,'sourceVideo':entry['video'],'bytes':target.stat().st_size}
 try:
  with tempfile.TemporaryDirectory(prefix='motion-preview-') as folder:
   original=pathlib.Path(folder)/'original.mp4'
   urls=[entry['video']]
   post=re.search(r'/status/(\d+)',entry['sourceUrl']);key=re.search(r'/(?:amplify_video|ext_tw_video)/(\d+)/',entry['video'])
   cache=pathlib.Path('/tmp/open-prompts-motion-x-cache')/(post[1]+'.json') if post else None
   if cache and cache.exists() and key:
    tweet=json.loads(cache.read_text())
    if tweet.get('id_str')==post[1]:
     variants=[v for media in tweet.get('mediaDetails',[]) for v in media.get('video_info',{}).get('variants',[]) if v.get('content_type')=='video/mp4' and key[1] in v['url']]
     urls=list(dict.fromkeys([v['url'] for v in sorted(variants,key=lambda v:v.get('bitrate',0))]+urls))
   downloaded=False
   for url in urls:
    try:
     subprocess.run(['curl','-fsSL','--connect-timeout','5','--max-time','15',url,'-o',str(original)],check=True,capture_output=True);downloaded=True;break
    except subprocess.CalledProcessError:continue
   if not downloaded:raise ValueError('native video variants unavailable')
   subprocess.run([args.ffmpeg,'-y','-loglevel','error','-i',str(original),'-t','6','-vf',"fps=20,scale='min(480,iw)':-2",'-an','-c:v','libx264','-preset','fast','-crf','30','-pix_fmt','yuv420p','-movflags','+faststart',str(target)],check=True,capture_output=True,timeout=35)
   if target.stat().st_size<1000:raise ValueError('empty preview')
   return entry['id'],{'previewVideo':local,'sourceVideo':entry['video'],'bytes':target.stat().st_size}
 except Exception as error:
  target.unlink(missing_ok=True);print('Failed',entry['id'],type(error).__name__,flush=True);return entry['id'],None
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
 for id,result in pool.map(generate,selected):
  if result:prior[id]=result
manifest.write_text(json.dumps(prior,ensure_ascii=False,indent=2)+'\n');print('Previews ready:',sum(e['id'] in prior for e in selected),'/',len(selected),'bytes',sum(v['bytes'] for v in prior.values()),flush=True)
