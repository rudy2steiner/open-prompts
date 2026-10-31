"""从本地 awesome-ai-motion-prompts 导入目录，并生成非黑帧 WebP 封面。
用法：python3 scripts/import-motion-catalog.py /path/to/awesome-ai-motion-prompts
依赖：Pillow。保留来源与核验状态，不执行提示词内容。
"""
import concurrent.futures
import io
import json
import pathlib
import re
import sys
import subprocess
import urllib.request
from PIL import Image, ImageStat

source = pathlib.Path(sys.argv[1]).resolve()
root = pathlib.Path(__file__).resolve().parents[1]
output = root / 'public/motion-posters'
output.mkdir(parents=True, exist_ok=True)
entries = json.loads((source / 'data/videos.json').read_text())

def import_entry(entry):
    record = {key: entry.get(key) for key in ['id', 'title', 'author', 'model', 'prompt', 'sourceUrl', 'promptSourceUrl', 'collectionUrl', 'video', 'skillUrl', 'requiresReference']}
    record.update(type=entry.get('type') or 'Prompt', category=entry['primaryCategory'], categories=entry.get('categories', []), width=entry.get('width') or 16, height=entry.get('height') or 9)
    provenance = entry.get('provenance') or {}
    record['promptStatus'] = provenance.get('promptStatus', 'collected')
    record['poster'] = None
    record['promptSourceUrl'] = record['promptSourceUrl'] or record['sourceUrl']
    poster = entry.get('poster')
    if not poster:
        existing = output / (entry['id'].removeprefix('motion-') + '.webp')
        if existing.is_file():
            poster = str(existing)
    if not poster:
        return record
    try:
        if poster.startswith('https://'):
            cached = output / f"catalog-{entry['id']}.webp"
            if cached.is_file():
                image = Image.open(cached)
            else:
                result = subprocess.run(['curl', '-fsSL', '--retry', '1', '--connect-timeout', '8', '--max-time', '25', poster], capture_output=True, check=True)
                image = Image.open(io.BytesIO(result.stdout))
        else:
            image = Image.open(source / poster)
        # 取均匀分布的候选帧，优先选择有亮度与细节的画面，跳过片头黑场。
        count = getattr(image, 'n_frames', 1)
        best, best_score = None, -1
        for index in sorted({int((count - 1) * fraction) for fraction in [.15, .3, .5, .7, .85]}):
            image.seek(index)
            frame = image.convert('RGB')
            frame.thumbnail((960 if entry['id'] == 'motion-showreel' else 640, 720))
            stats = ImageStat.Stat(frame.convert('L'))
            score = stats.stddev[0] + min(stats.mean[0], 100) * .3
            if score > best_score:
                best, best_score = frame.copy(), score
        if best is not None and best_score > 8:
            assert re.fullmatch(r'[A-Za-z0-9_.-]+', entry['id'])
            filename = f"catalog-{entry['id']}.webp"
            best.save(output / filename, 'WEBP', quality=80)
            record.update(poster=f'/motion-posters/{filename}', width=best.width, height=best.height)
    except Exception as error:
        print(f"封面导入失败 {entry['id']}: {error}", file=sys.stderr)
    return record

with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    records = list(pool.map(import_entry, entries))
path = root / 'src/data/imports/motion-catalog.json'
path.write_text(json.dumps(records, ensure_ascii=False, separators=(',', ':')) + '\n')
print(f"导入 {len(records)} 条，生成 {sum(bool(e['poster']) for e in records)} 张封面")

# 同步上游后复用已核验媒体，防止覆盖补齐结果。
if (root / 'src/data/imports/motion-media-enrichment.json').exists():
    subprocess.run([sys.executable, str(root / 'scripts/apply-motion-media.py'), '--source', str(source)], check=True)
