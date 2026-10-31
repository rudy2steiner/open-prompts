#!/usr/bin/env python3
"""收集 X motion 候选；只保存链接与元数据，不转载第三方提示词或下载视频。"""
import argparse, concurrent.futures, datetime, json, pathlib, re, time, urllib.request

SOURCES = {
    'cases': 'https://raw.githubusercontent.com/zhuyansen/awesome-opus-5.5-video/main/cases.json',
    'videos': 'https://raw.githubusercontent.com/yihui-dev/awesome-opus5-5-videos/main/data/videos.json',
}
ROOT = pathlib.Path(__file__).resolve().parents[1]

def read_url(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=25) as response:
        return json.load(response)

def classify(title):
    text = title.lower()
    rules = [('Phone', r'phone|iphone|android|mobile'), ('Charts', r'chart|graph|data |finance|stock'),
             ('Diagrams', r'diagram|explain|math|physics|algorithm|recursion|educat|visualiz'),
             ('Kinetic type', r'typograph|kinetic|type |text |letter|font'),
             ('Particles', r'particle|fluid|smoke|firework|swarm'), ('Characters', r'character|mascot|robot|stickman'),
             ('Photos', r'photo|image|camera|polaroid'), ('Music', r'music|audio|beat|sound|piano'),
             ('Code', r'code|terminal|coding|syntax'), ('Shapes', r'geometr|shape|orb|sphere|cube|abstract|loop'),
             ('Product UI', r'product|launch|ui|app|brand|saas|landing|showreel|promo')]
    return [name for name, pattern in rules if re.search(pattern, text)][:2]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--count', type=int, default=200)
    parser.add_argument('--cache', default='/tmp/open-prompts-motion-x-cache')
    parser.add_argument('--extra', help='额外候选 JSON 数组')
    args = parser.parse_args()
    cache = pathlib.Path(args.cache); cache.mkdir(parents=True, exist_ok=True)
    excluded = set(re.findall(r'x\.com/[^/\s"\']+/status/(\d+)', (ROOT/'src/data/promptMotion.ts').read_text()))
    pools = {key: read_url(url) for key, url in SOURCES.items()}
    candidates = []
    if args.extra:
        for item in json.load(open(args.extra)):
            candidates.append(dict(url=item['sourceUrl'], title=item['title'], model=item['model'],
                                   discovery=item['discoveryUrl'], prompt=None))
    cases = sorted((x for x in pools['cases']['cases'] if x['category'] == 'motion'), key=lambda x:x.get('views',0), reverse=True)
    for item in cases:
        prompt = item.get('prompt') or {}
        candidates.append(dict(url=item['original_post_url'], title=item['title']['en'],
            model=', '.join(item.get('models', [])), discovery=SOURCES['cases'], prompt=prompt.get('source_url')))
    for item in pools['videos']:
        if item['category'] not in ('motion', 'explainer'): continue
        candidates.append(dict(url=item['post_url'], title=item['slug'].replace('-', ' '), model='Opus 5.5',
                               discovery=SOURCES['videos'], prompt=None))
    seen = set(excluded); queue = []
    for item in candidates:
        match = re.search(r'/status/(\d+)', item['url'])
        if not match or match[1] in seen: continue
        item['id'] = match[1]; seen.add(match[1]); queue.append(item)
    def verify(item):
        path = cache/(item['id']+'.json')
        try:
            if path.exists(): tweet = json.loads(path.read_text())
            else:
                tweet = read_url('https://cdn.syndication.twimg.com/tweet-result?id='+item['id']+'&token=0')
                path.write_text(json.dumps(tweet))
            expected = item['url'].split('/')[3].lower()
            if tweet.get('user',{}).get('screen_name','').lower() != expected: return None
            native = tweet
            if not native.get('video'):
                quoted = tweet.get('quoted_tweet', {})
                if quoted.get('user',{}).get('screen_name','').lower() != expected: return None
                native = quoted
            video = native.get('video', {})
            variants = [v['src'] for v in video.get('variants',[]) if v.get('type') == 'video/mp4']
            if not variants: return None
            native_id = native.get('id_str', item['id'])
            if native_id in excluded: return None
            def pixels(url):
                match = re.search(r'/(\d+)x(\d+)/', url)
                return int(match[1])*int(match[2]) if match else 0
            variants.sort(key=pixels)
            suitable = [v for v in variants if pixels(v) <= 1280*720]
            preview = (suitable or variants)[-1]
            return dict(id=native_id, title=item['title'], author=native['user']['screen_name'],
                sourceUrl=f"https://x.com/{native['user']['screen_name']}/status/{native_id}",
                video=preview, poster=video.get('poster'), aspectRatio=video.get('aspectRatio'), durationMs=video.get('durationMs'),
                model=item['model'], modelStatus='directory_reported', categories=classify(item['title']),
                classificationStatus='needs_review', type=None, typeStatus='needs_review', promptSourceUrl=item['prompt'],
                promptStatus='source_link_unverified' if item['prompt'] else 'not_collected',
                discoveryUrl=item['discovery'], discoveredPostUrl=item['url'],
                verification=dict(checkedAt=datetime.datetime.fromtimestamp(path.stat().st_mtime,datetime.timezone.utc).isoformat(), authorAndNativeVideo='verified', visualQuality='not_reviewed',
                                  endpoint='https://cdn.syndication.twimg.com/tweet-result?id='+item['id']+'&token=0'))
        except Exception as error:
            print('skip', item['id'], type(error).__name__, flush=True)
            return None
    results=[]; ids=set(); attempted=0
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        for offset in range(0,len(queue),24):
            for result in executor.map(verify,queue[offset:offset+24]):
                attempted+=1
                if result and result['id'] not in ids and len(results)<args.count:
                    ids.add(result['id']);results.append(result)
            print(f'verified {len(results)}/{args.count}; attempted {attempted}',flush=True)
            if len(results)==args.count:break
    if len(results)!=args.count: raise RuntimeError(f'只有 {len(results)} 条通过验证')
    stamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
    output=dict(schemaVersion=1,collectedAt=stamp,count=len(results),scope='新增 X 原生视频候选，未加入页面',
                excludedExistingPostCount=len(excluded),sources=SOURCES,cases=results)
    target=ROOT/'src/data/imports/motion-prompts-candidates.json'
    target.write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
    print(target,flush=True)
if __name__=='__main__': main()
