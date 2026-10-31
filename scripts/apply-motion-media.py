"""合并已核验的预览与原帖视频；不把失败、引用帖或不匹配媒体当成原作。"""
import datetime
import argparse
import json
import pathlib
import re
ROOT = pathlib.Path(__file__).resolve().parents[1]
path = ROOT / 'src/data/imports/motion-catalog.json'
records = json.loads(path.read_text())
manifest_path = ROOT / 'src/data/imports/motion-media-enrichment.json'
manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source', type=pathlib.Path, default=ROOT.parent / 'awesome-ai-motion-prompts')
args = parser.parse_args()
original = {e['id']: e for e in json.loads((args.source / 'data/videos.json').read_text())}
for filename in ['motion-upstream-media.json', 'motion-demo-captures.json', 'motion-video-frames.json']:
    extra = ROOT / 'src/data/imports' / filename
    if not extra.exists(): continue
    for key, info in json.loads(extra.read_text()).items():
        if not manifest.get(key, {}).get('poster'): manifest[key] = {**manifest.get(key, {}), **info}
for entry in records:
    info = manifest.get(entry['id'], {})
    if info.get('sourceUrl') == entry['sourceUrl'] and info.get('video'):
        entry['video'] = info['video']
    if info.get('sourceUrl') == entry['sourceUrl'] and info.get('poster') and (ROOT / 'public' / info['poster'].lstrip('/')).is_file():
        for field in ['poster', 'width', 'height', 'video']:
            if info.get(field): entry[field] = info[field]
    match = re.fullmatch(r'https://x.com/([^/]+)/status/(\d+)', entry['sourceUrl'])
    if not match: continue
    author, post = match.groups()
    cache = pathlib.Path('/tmp/open-prompts-motion-x-cache') / (post + '.json')
    if not cache.exists(): continue
    tweet = json.loads(cache.read_text())
    if tweet.get('id_str') != post or tweet.get('user', {}).get('screen_name', '').lower() != author.lower(): continue
    stamp = datetime.datetime.fromtimestamp(cache.stat().st_mtime, datetime.timezone.utc).isoformat()
    info = manifest.setdefault(entry['id'], {'sourceUrl': entry['sourceUrl']})
    info.update(likes=tweet.get('favorite_count'), metricsCheckedAt=stamp)
    expected = original.get(entry['id'], {}).get('sourceMediaKeys', [])
    media = [e for e in tweet.get('mediaDetails', []) if not expected or any(key in e.get('media_url_https', '') for key in expected)]
    for native in media:
        variants = [v for v in native.get('video_info', {}).get('variants', []) if v.get('content_type') == 'video/mp4']
        if not variants: continue
        candidates = [v for v in variants if 400000 <= v.get('bitrate', 0) <= 2500000]
        video = min(candidates or variants, key=lambda v: v.get('bitrate', 0))['url']
        entry['video'] = video
        info.update(video=video, nativeVideoMatched=True)
        if not entry['poster']:
            width, height = native.get('video_info', {}).get('aspect_ratio', [16, 9])
            entry.update(width=width, height=height)
        break
path.write_text(json.dumps(records, ensure_ascii=False, separators=(',', ':')) + '\n')
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print('Previews:', sum(bool(e['poster']) for e in records), 'Videos:', sum(bool(e['video']) for e in records), 'Likes:', sum(e.get('likes') is not None for e in manifest.values()))
