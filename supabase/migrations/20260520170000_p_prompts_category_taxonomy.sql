-- Remap legacy 10-category keys to the 7-tier gallery/submit taxonomy.
UPDATE p_prompts
SET category = CASE category
  WHEN 'landscape' THEN 'scenes'
  WHEN 'portrait' THEN 'portraitPhoto'
  WHEN 'architecture' THEN 'designUi'
  WHEN 'animal' THEN 'scenes'
  WHEN 'illustration' THEN 'artStyles'
  WHEN 'realism' THEN 'portraitPhoto'
  WHEN 'game' THEN 'gameFantasy'
  WHEN 'cinematic' THEN 'scenes'
  WHEN 'scifi' THEN 'gameFantasy'
  WHEN 'abstract' THEN 'styleEra'
  ELSE category
END
WHERE category IN (
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
);
