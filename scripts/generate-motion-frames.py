"""为已有真实视频、但缺少封面的条目生成清晰帧；失败时保留缺失状态。"""
import argparse, concurrent.futures, datetime, json, pathlib, subprocess, tempfile
from PIL import Image, ImageStat
ROOT = pathlib.Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--ffmpeg', required=True)
parser.add_argument('--workers', type=int, default=8)
args = parser.parse_args()
records = json.loads((ROOT/'src/data/imports/motion-catalog.json').read_text())
path = ROOT/'src/data/imports/motion-video-frames.json'
results = json.loads(path.read_text()) if path.exists() else {}
items = [e for e in records if e['video'] and not e['poster']]
def capture(entry):
    cached = results.get(entry['id'])
    if cached and cached.get('poster') and (ROOT/'public'/cached['poster'].lstrip('/')).is_file(): return entry['id'], cached
    info = {'sourceUrl': entry['sourceUrl'], 'video': entry['video'], 'method':'original-video-frame', 'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
    try:
        with tempfile.TemporaryDirectory(prefix='motion-frame-') as folder:
            video = pathlib.Path(folder)/'original.mp4'
            subprocess.run(['curl','-fsSL','--connect-timeout','5','--max-time','25',entry['video'],'-o',str(video)],check=True,capture_output=True)
            subprocess.run([args.ffmpeg,'-y','-loglevel','error','-ss','1','-i',str(video),'-t','12','-vf',"fps=1/3,scale='min(640,iw)':-2",str(pathlib.Path(folder)/'%02d.png')],check=True,capture_output=True,timeout=25)
            best, score = None, 8
            for frame in pathlib.Path(folder).glob('*.png'):
                image=Image.open(frame).convert('RGB');stats=ImageStat.Stat(image.convert('L'));value=stats.stddev[0]+min(stats.mean[0],100)*.3
                if value>score:best,score=image.copy(),value
            if best is None:return entry['id'],{**info,'status':'no-clear-frame'}
            poster=f"/motion-posters/frame-{entry['id']}.webp";best.save(ROOT/'public'/poster.lstrip('/'),'WEBP',quality=82)
            return entry['id'],{**info,'status':'available','poster':poster,'width':best.width,'height':best.height}
    except Exception as error:return entry['id'],{**info,'status':'unavailable','reason':type(error).__name__}
with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
    for i,(id,info) in enumerate(pool.map(capture,items),1):
        results[id]=info
        if i%20==0:path.write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n');print(f"Video frames {i}/{len(items)}; captured {sum(e.get('status')=='available' for e in results.values())}",flush=True)
path.write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n');print('Frame capture complete',sum(e.get('status')=='available' for e in results.values()),flush=True)
