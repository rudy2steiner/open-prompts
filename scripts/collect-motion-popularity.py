"""采集真实热度快照：X 原帖点赞与 GitHub 来源仓库 Stars，不混算两类指标。
用法：python3 scripts/collect-motion-popularity.py [--max-age-hours 72] [--workers 6]
缺失保持 null；请求失败不覆盖已有有效数据；保留实际来源和观测时间。
"""
import argparse, concurrent.futures, datetime, json, pathlib, re, subprocess, urllib.parse
ROOT = pathlib.Path(__file__).resolve().parents[1]
TARGET = ROOT/'src/data/imports/motion-popularity.json'
CACHE = pathlib.Path('/tmp/open-prompts-motion-x-cache')
def number(value):
    return value if isinstance(value,int) and not isinstance(value,bool) and value>=0 else None
def fresh(stamp):
    try:return 0 <= (now-datetime.datetime.fromisoformat(stamp.replace('Z','+00:00'))).total_seconds() <= args.max_age_hours*3600
    except (ValueError,TypeError,AttributeError):return False
def download(url):
    return json.loads(subprocess.run(['curl','-fsSL','--retry','1','--connect-timeout','5','--max-time','15','-A','open-prompts-popularity-collector','-H','Accept: application/json',url],check=True,capture_output=True).stdout)
def collect_x(entry):
    source=entry['sourceUrl'];match=re.fullmatch(r'https://x.com/([^/]+)/status/(\d+)',source)
    author,post=match.groups();legacy=media.get(entry['id'],{})
    candidates=[prior['works'].get(entry['id']), {'sourceUrl':legacy.get('sourceUrl'),'likes':legacy.get('likes'),'observedAt':legacy.get('metricsCheckedAt'),'method':'original-post-syndication','scope':'post'}]
    validated=[]
    for candidate in candidates:
        if not candidate or candidate.get('sourceUrl')!=source or number(candidate.get('likes')) is None:continue
        try:
            stamp=datetime.datetime.fromisoformat(candidate.get('observedAt','').replace('Z','+00:00'))
            if stamp.tzinfo is None:continue
            validated.append((stamp,candidate))
        except (ValueError,TypeError,AttributeError):continue
    previous=max(validated,key=lambda item:item[0])[1] if validated else None
    if previous and fresh(previous.get('observedAt')):return entry['id'],previous
    try:
        path=CACHE/(post+'.json')
        tweet=None
        if path.exists() and fresh(datetime.datetime.fromtimestamp(path.stat().st_mtime,datetime.timezone.utc).isoformat()):tweet=json.loads(path.read_text())
        else:
            tweet=download(f'https://cdn.syndication.twimg.com/tweet-result?id={post}&token=0')
            if tweet.get('id_str')==post and number(tweet.get('favorite_count')) is not None:
                CACHE.mkdir(exist_ok=True);path.write_text(json.dumps(tweet))
        if tweet.get('id_str')!=post or tweet.get('user',{}).get('screen_name','').lower()!=author.lower():raise ValueError('post identity mismatch')
        likes=number(tweet.get('favorite_count'))
        if likes is None:raise ValueError('likes unavailable')
        observed=datetime.datetime.fromtimestamp(path.stat().st_mtime,datetime.timezone.utc).isoformat()
        return entry['id'],{'sourceUrl':source,'likes':likes,'observedAt':observed,'scope':'post','method':'original-post-syndication'}
    except Exception as error:
        return entry['id'],{**(previous or {'sourceUrl':source,'likes':None,'observedAt':None,'scope':'post'}),'lastAttemptAt':now.isoformat(),'error':type(error).__name__}
def repo_key(entry):
    url=urllib.parse.urlparse(entry['sourceUrl']);parts=url.path.strip('/').split('/')
    return '/'.join(parts[:2]) if url.hostname=='github.com' and len(parts)>=2 else None
def collect_repo(key):
    previous=prior['repositories'].get(key)
    if previous and fresh(previous.get('observedAt')) and number(previous.get('stars')) is not None:return key,previous
    try:
        response=download(f'https://api.github.com/repos/{key}')
        if response.get('full_name','').lower()!=key.lower():raise ValueError('repository mismatch')
        stars=number(response.get('stargazers_count'))
        if stars is None:raise ValueError('stars unavailable')
        return key,{'sourceUrl':f'https://github.com/{key}','stars':stars,'observedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'repository','method':'github-rest-api'}
    except Exception as error:
        observed=page_observations.get(key)
        if observed and observed.get('sourceUrl')==f'https://github.com/{key}' and number(observed.get('stars')) is not None and fresh(observed.get('observedAt')):
            return key,observed
        return key,{**(previous or {'sourceUrl':f'https://github.com/{key}','stars':None,'observedAt':None,'scope':'repository'}),'lastAttemptAt':now.isoformat(),'error':type(error).__name__}

def main():
    global args, now, records, media, prior, page_observations
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--max-age-hours', type=int, default=72)
    parser.add_argument('--workers', type=int, default=6)
    args=parser.parse_args()
    now=datetime.datetime.now(datetime.timezone.utc)
    records=json.loads((ROOT/'src/data/imports/motion-catalog.json').read_text())
    media=json.loads((ROOT/'src/data/imports/motion-media-enrichment.json').read_text())
    prior=json.loads(TARGET.read_text()) if TARGET.exists() else {'works':{},'repositories':{}}
    observations_path=ROOT/'src/data/imports/motion-github-observations.json'
    page_observations=json.loads(observations_path.read_text()) if observations_path.exists() else {}
    x=[e for e in records if re.fullmatch(r'https://x.com/([^/]+)/status/(\d+)',e['sourceUrl'])]
    repos=sorted({repo_key(e) for e in records if repo_key(e)})
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        works=dict(pool.map(collect_x,x));repositories=dict(pool.map(collect_repo,repos))
    result={'schemaVersion':1,'collectedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'works':works,'repositories':repositories}
    TARGET.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(f"X likes: {sum(number(e.get('likes')) is not None for e in works.values())}/{len(x)}; repository stars: {sum(number(e.get('stars')) is not None for e in repositories.values())}/{len(repos)}",flush=True)

if __name__ == '__main__':
    main()
