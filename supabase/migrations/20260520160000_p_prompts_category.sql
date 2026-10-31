-- Dedicated style category for prompts (submit form primary category key).
ALTER TABLE p_prompts ADD COLUMN IF NOT EXISTS category text;

-- Backfill from legacy tags that embedded the category key.
UPDATE p_prompts p
SET category = (
  SELECT t.tag
  FROM unnest(p.tags) AS t(tag)
  WHERE t.tag IN (
    'artStyles',
    'portraitPhoto',
    'designUi',
    'gameFantasy',
    'scenes',
    'productCommercial',
    'styleEra',
    'landscape',
    'portrait',
    'architecture',
    'animal',
    'illustration',
    'realism',
    'game',
    'cinematic',
    'scifi',
    'abstract'
  )
  LIMIT 1
)
WHERE p.category IS NULL OR btrim(p.category) = '';

CREATE INDEX IF NOT EXISTS p_prompts_category_idx ON p_prompts (category);
