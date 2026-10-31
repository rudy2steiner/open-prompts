"""补取真实原作预览；不生成或替换为示意图。
用法：python3 scripts/enrich-motion-previews.py [--workers 8]
X 媒体需原帖 ID、作者和已有媒体键一致。记录图片来源、采集时间与实际点赞数。
"""
import argparse
import concurrent.futures
import datetime
import io
import json
import pathlib
import re
import subprocess
import tempfile
import shutil
import urllib.parse
from PIL import Image, ImageStat

ROOT = pathlib.Path(__file__).resolve().parents[1]
CATALOG = ROOT / 'src/data/imports/motion-catalog.json'
MANIFEST = ROOT / 'src/data/imports/motion-media-enrichment.json'
CACHE = pathlib.Path('/tmp/open-prompts-motion-x-cache')
CACHE.mkdir(exist_ok=True)

NOW = datetime.datetime.now(datetime.timezone.utc).isoformat()
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--workers', type=int, default=8)
parser.add_argument('--ffmpeg', default=shutil.which('ffmpeg'))
parser.add_argument('--source', type=pathlib.Path, default=ROOT.parent / 'awesome-ai-motion-prompts')
args = parser.parse_args()
FFMPEG = pathlib.Path(args.ffmpeg) if args.ffmpeg else None
records = json.loads(CATALOG.read_text())
original = {e['id']: e for e in json.loads((args.source / 'data/videos.json').read_text())}
prior = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {}

def download(url, timeout=20):
    return subprocess.run(['curl', '-fsSL', '--connect-timeout', '6', '--max-time', str(timeout), '-A', 'Mozilla/5.0', url], check=True, capture_output=True).stdout

def frame_score(image):
    grey = image.convert('L')
    stats = ImageStat.Stat(grey)
    return stats.stddev[0] + min(stats.mean[0], 100) * .3

def get_image(raw):
    source = Image.open(io.BytesIO(raw))
    best, score = None, -1
    for ratio in [.15, .35, .55, .75]:
        source.seek(int((getattr(source, 'n_frames', 1) - 1) * ratio))
        image = source.convert('RGB'); image.thumbnail((640, 640))
        value = frame_score(image)
        if value > score: best, score = image.copy(), value
    return best, score

def save_video_frame(url):
    if not FFMPEG or not FFMPEG.exists(): return None, None
    with tempfile.TemporaryDirectory(prefix='motion-source-') as folder:
        video = pathlib.Path(folder) / 'source.mp4'
        video.write_bytes(download(url, 40))
        probe = subprocess.run([str(FFMPEG), '-hide_banner', '-i', str(video)], capture_output=True, text=True).stderr
        duration = re.search(r'Duration: (\d+):(\d+):([\d.]+)', probe)
        seconds = sum(float(value) * multiplier for value, multiplier in zip(duration.groups(), [3600, 60, 1])) if duration else 10
        best, score, chosen = None, -1, None
        for ratio in [.2, .4, .65]:
            offset = round(min(seconds * ratio, max(0, seconds - .1)), 2)
            target = pathlib.Path(folder) / 'frame.png'
            subprocess.run([str(FFMPEG), '-y', '-loglevel', 'error', '-ss', str(offset), '-i', str(video), '-frames:v', '1', '-vf', "scale='min(640,iw)':-2", str(target)], check=True, capture_output=True, timeout=20)
            image = Image.open(target).convert('RGB')
            value = frame_score(image)
            if value > score: best, score, chosen = image.copy(), value, offset
        return best, chosen

def persist(entry, image, metadata):
    if image is None or frame_score(image) <= 8:
        return {**metadata, 'status': 'no-clear-frame'}
    path = f"/motion-posters/source-{entry['id']}.webp"
    image.save(ROOT / 'public' / path.lstrip('/'), 'WEBP', quality=82)
    return {**metadata, 'status': 'available', 'poster': path, 'width': image.width, 'height': image.height}

def enrich(entry):
    old = prior.get(entry['id'])
    if old and old.get('poster') and (ROOT / 'public' / old['poster'].lstrip('/')).is_file(): return entry['id'], old
    if entry['poster']: return entry['id'], old
    url = entry['sourceUrl']; parsed = urllib.parse.urlparse(url)
    info = {'sourceUrl': url, 'checkedAt': NOW}
    try:
        if parsed.hostname == 'x.com':
            match = re.fullmatch(r'/([^/]+)/status/(\d+)/?', parsed.path)
            if not match: raise ValueError('invalid post URL')
            author, post_id = match.groups()
            path = CACHE / (post_id + '.json')
            if path.exists(): tweet = json.loads(path.read_text())
            else:
                raw = download(f'https://cdn.syndication.twimg.com/tweet-result?id={post_id}&token=0')
                tweet = json.loads(raw)
                if tweet.get('id_str') == post_id: path.write_bytes(raw)
            if tweet.get('id_str') != post_id or tweet.get('user', {}).get('screen_name', '').lower() != author.lower():
                raise ValueError('post identity mismatch or unavailable')
            info['likes'] = tweet.get('favorite_count')
            info['metricsCheckedAt'] = datetime.datetime.fromtimestamp(path.stat().st_mtime, datetime.timezone.utc).isoformat()
            media = tweet.get('mediaDetails', [])
            keys = original.get(entry['id'], {}).get('sourceMediaKeys', [])
            media = [m for m in media if not keys or any(k in m.get('media_url_https', '') for k in keys)]
            if not media: return entry['id'], {**info, 'status': 'no-matching-native-media'}
            native = media[0]
            image_url = native.get('media_url_https')
            if not image_url: raise ValueError('missing native poster')
            image, score = get_image(download(image_url))
            info.update(posterSource=image_url, method='original-post-image')
            variants = [v for v in native.get('video_info', {}).get('variants', []) if v.get('content_type') == 'video/mp4']
            variants.sort(key=lambda v: v.get('bitrate', 0))
            suitable = [v for v in variants if 400000 <= v.get('bitrate', 0) <= 2500000]
            video = (suitable or variants)[0]['url'] if variants else None
            if video: info['video'] = video
            if score < 28 and video:
                extracted, offset = save_video_frame(video)
                if extracted is not None and frame_score(extracted) > score:
                    image = extracted; info.update(method='original-video-frame', frameSeconds=offset)
            return entry['id'], persist(entry, image, info)
        if parsed.hostname == 'static.atlascloud.ai' and parsed.path.endswith('.mp4'):
            image, offset = save_video_frame(url)
            return entry['id'], persist(entry, image, {**info, 'method': 'original-video-frame', 'video': url, 'frameSeconds': offset})
        return entry['id'], {**info, 'status': 'requires-page-inspection'}
    except Exception as error:
        return entry['id'], {**info, 'status': 'unavailable', 'reason': str(error)[:180]}

results = dict(prior)
with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
    futures = [pool.submit(enrich, entry) for entry in records]
    for index, future in enumerate(concurrent.futures.as_completed(futures), 1):
        key, info = future.result()
        if info: results[key] = info
        if index % 40 == 0:
            MANIFEST.write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n')
            print(f"checked {index}/1000; new previews {sum(e.get('status') == 'available' for e in results.values())}", flush=True)
MANIFEST.write_text(json.dumps(results, ensure_ascii=False, indent=2) + '\n')
for entry in records:
    info = results.get(entry['id'], {})
    if info.get('status') == 'available':
        for key in ['poster', 'width', 'height', 'video']:
            if info.get(key): entry[key] = info[key]
CATALOG.write_text(json.dumps(records, ensure_ascii=False, separators=(',', ':')) + '\n')
print(f"Total previews: {sum(bool(e['poster']) for e in records)}/1000", flush=True)
