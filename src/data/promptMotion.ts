/** 精选公开作品。原文不翻译；媒体保留在来源站点，不存入仓库。
 * 核对日期：2026-10-21。模型沿用作者/来源标注，未独立复现。
 * collectionUrl 为收录来源；sourceUrl / promptSourceUrl 为作者原帖及指令出处。
 */
export const MOTION_CATEGORIES = ["Product UI", "Phone", "Charts", "Diagrams", "Kinetic type", "Shapes", "Particles", "Characters", "Photos", "Music", "Code"] as const;
export type MotionCategory = (typeof MOTION_CATEGORIES)[number];
export type MotionEntry = {
  id: string; title: string; author: string; type: 'Prompt' | 'Skill'; model: string;
  categories: MotionCategory[]; prompt: string; sourceUrl: string; promptSourceUrl: string;
  collectionUrl: string; poster: string; video?: string; width: number; height: number; skillUrl?: string; requiresReference?: boolean;
};
export const MOTION_ENTRIES: MotionEntry[] = [
  {
    "id": "kinetic-type",
    "title": "Kinetic type",
    "author": "techhalla",
    "type": "Prompt",
    "model": "Opus 5.5",
    "categories": [
      "Kinetic type"
    ],
    "prompt": "You are a world-class motion designer doing a 20.00s kinetic identity bumper for TechHalla — an AI creator known for stealable workflows, not vibes. This piece must feel like the best designer in the room made a street-poster that moves. Showreel stakes: if this is weak, you don’t get hired.\n\nDURATION: exactly 20.00 seconds. LOOPABLE: frame 0 == frame last (position, opacity, cursor if any).\nFORMAT: one HTML file, 1080×1080 (square, X-native). 60fps.\nPALETTE (strict):\n- bg # 0A0A0A\n- magenta # FF2BD6\n- acid green # B8FF00\n- white # F5F5F5 only for primary readable type when needed\nNo other hues. No gradients on UI chrome. Magenta/green may misregister (print offset) by 2–4px on impact frames only.\n\nTYPE SYSTEM (use all three; never one font for everything):\n1) Display / scream: Archivo Black (or equivalent ultra-condensed black) — 1–4 words max\n2) Urban grotesque: Syne ExtraBold — secondary hits, stacked lines\n3) Mono / “prompt code”: IBM Plex Mono Medium — small labels, timestamps, fake prompt crumbs\nTracking: display −40 to −80; mono +20. Optical kerning. No cute script fonts.\n\nMESSAGE (locked — do not soften, do not add filler slogans):\nBeat hits in this exact order:\n1. STOP SCROLLING\n2. AI VIDEO ISN’T EXPENSIVE\n3. BAD PROMPTING IS\n4. WORKFLOWS > WISHES\n5. STEAL THE PROMPT\n6. @ TECHHALLA\nSupporting crumbs (mono, ≤18 chars, never full sentences): JSON · H3 · SEEDANCE · 0 KEYFRAMES · MAGNIFIC · COPY/PASTE\n\nNARRATIVE ARC (20s):\n0.0–2.5s COLD OPEN — “STOP SCROLLING” slams in from below with spring overshoot; magenta smear trail; acid green baseline ticks across like a waveform.\n2.5–6.5s THESIS A — “AI VIDEO ISN’T EXPENSIVE” locks to a poster grid (baseline grid 8px). Letters scramble (seeded Fisher–Yates per glyph) then snap on the beat.\n6.5–10.5s THESIS B — “BAD PROMPTING IS” replaces it via mask wipe through the letterforms (the outgoing line is the mask). Magenta/green channel split on the cut.\n10.5–14.5s PROOF FLASH — rapid kinetic stack: WORKFLOWS > WISHES, then mono crumbs orbit a central block like a terminal. One fake “prompt block” types 3 lines max, then gets crossed by an acid green strikethrough that becomes a underline for STEAL THE PROMPT.\n14.5–17.5s BRAND LOCK — @ TECHHALLA centers; display weight. A thick magenta bar and a thin acid green rule form an L-bracket mark (custom, not a logo download).\n17.5–20.0s SETTLE / LOOP — hold lockup; micro-breath (scale 1.000→1.012→1.000); last frame == first ready for loop.\n\nCONCRETE TECHNIQUES (required — implement, don’t approximate):\n1. seek(t) pure function of time. No CSS transitions. No setInterval. No React state across frames.\n2. Springs = closed-form step responses. Stack one spring per target change so motion stays deterministic.\n3. Kinetic type: per-glyph spring (y, opacity, blur). Stagger = 1/16 note at 120 BPM (125ms).\n4. Print misregistration: on accent frames only, duplicate text layer offset (±2–4px) in magenta and acid green at 40% opacity.\n5. Mask reveal: destination text revealed by animating a path mask derived from the outgoing word’s outlines.\n6. Camera: one orthographic camera; only punch-in (1.0→1.08) and horizontal smash-pans timed to beats — never random drift.\n7. Motion blur: render 4 subframes per frame, blend (tmix-style).\n8. Beat grid: 120 BPM, downbeat at t=0. Something must land on every beat for the first 16 beats; after that, every other beat is ok.\n9. Pre-pass: before full render, export one still per major beat (8 frames). Fix cramped type, orphan words, low contrast — then render.\n\nBANNED:\nGeneric AI clichés (brains, robots, neural nets, sparkles), soft gradients, bouncy cartoon easing, particle explosions, stock “futuristic HUD”, long paragraphs, narrator essay energy, Canva-deck energy, extra slogans beyond the locked message, purple/blue neon, glassmorphism.",
    "sourceUrl": "https://x.com/techhalla/status/2103411244468498547",
    "promptSourceUrl": "https://x.com/techhalla/status/2103411247618146715",
    "collectionUrl": "https://github.com/yihui-dev/awesome-opus5-5-videos/blob/main/prompts/techhalla-498547.md",
    "poster": "/motion-posters/kinetic-type.webp",
    "video": "https://video.twimg.com/amplify_video/2103409564657885184/vid/avc1/720x720/sRUCrID2I-a6mKxe.mp4",
    "requiresReference": false,
    "width": 720,
    "height": 720
  },
  {
    "id": "infinite-zoom",
    "title": "Infinite zoom",
    "author": "koldo2k",
    "type": "Prompt",
    "model": "Opus 5.5",
    "categories": [
      "Photos",
      "Music"
    ],
    "prompt": "Build a looping \"infinite zoom\" animation, After Effects style: the camera\ntravels from landscape to landscape by flying through vintage objects.\n\nLOOK: vintage collage realistic photo landscapes + black & white newspaper\ncutout objects (halftone, white paper border, soft shadow). Film grain,\nvignette, light flicker.\n\nWORLDS (loop): snowy mountains → pocket watch (swinging on its chain) →\nsea cliffs → box camera lens → desert dunes → magnifying glass →\nmisty lake → hand mirror → back to start.\nExtras: floating hat, phone, umbrella, gramophone, key; a 1950s man walking\ntoward the watch; a whale swimming across the cliffs sky.\n\nHOW:\n- Generate everything via the Magnific MCP (Seedream 5 Pro landscapes,\nGPT 2.5 transparent cutouts, depth maps, Kling 2.5 animation, Lyria 3\nmusic). List the generations + credit cost and wait for my OK first.\n- Split each landscape into 3 depth layers from its depth map and fill the\nhidden areas. Parallax: layer scale = camera^Z, Z between 0.45 and 1.22.\n- Each portal's glass holds the next world; cut seamlessly when it fills\nthe frame.\n- Constant speed: exponential zoom to a fixed point, each segment's duration\nproportional to log(zoom). Verify the cuts frame by frame.\n- Man & whale: generate on pure green (#00B140), animate in place with\nKling, key out every frame, build a seamless loop (ping-pong if needed).\n- Cutouts animate at 15 fps (on twos).\n- 20 s loop, 1920×1080, 30 fps. Music: 96 BPM, cut to exactly 8 bars = 20 s.\n\nDELIVER: an interactive artifact (viewer, AE-style timeline, music +\nMP4 download) and a rendered MP4 with music under 30 MB.\nShow me screenshots before each expensive step.",
    "sourceUrl": "https://x.com/koldo2k/status/2103129343253778767",
    "promptSourceUrl": "https://x.com/koldo2k/status/2103129347791986942",
    "collectionUrl": "https://jasonzhu.ai/en/prompts/claude-opus-5-5/2103129343253778767",
    "poster": "/motion-posters/infinite-zoom.webp",
    "video": "https://video.twimg.com/amplify_video/2103123431558348801/vid/avc1/1280x720/5HkHcQH3RIq33O0m.mp4",
    "requiresReference": true,
    "width": 1280,
    "height": 720
  },
  {
    "id": "overthinking",
    "title": "Overthinking showreel",
    "author": "gizakdag",
    "type": "Prompt",
    "model": "Opus 5.5",
    "categories": [
      "Kinetic type"
    ],
    "prompt": "Make a dynamic 15-second motion graphics video that shows what an incredible motion designer you are, like it’s your showreel exploring the concept of “Overthinking,” inspired by the attached graphics.",
    "sourceUrl": "https://x.com/gizakdag/status/2103566030916239768",
    "promptSourceUrl": "https://x.com/gizakdag/status/2103566030916239768",
    "collectionUrl": "https://github.com/yihui-dev/awesome-opus5-5-videos/blob/main/prompts/gizakdag-239768.md",
    "poster": "/motion-posters/overthinking.webp",
    "video": "https://video.twimg.com/amplify_video/2103565216839602176/vid/avc1/720x1280/BVaEtJ4epEF6k7sv.mp4",
    "requiresReference": true,
    "width": 720,
    "height": 1280
  },
  {
    "id": "motion-showreel",
    "title": "Motion showreel",
    "author": "prasenx",
    "type": "Prompt",
    "model": "Opus 5.5",
    "categories": [
      "Music",
      "Shapes"
    ],
    "prompt": "make a dynamic 15-second motion graphics video that shows what an incredible motion designer you are, like it's your showreel for a résumé. go all out.\n\ncompose the soundtrack yourself, fully synthesized in code. no samples, no audio files, no VST instruments. every cut and transition must land on the beat.\n\n1920x1080, 60fps. render the final video with the music mixed in as an MP4 and tell me where it's saved.",
    "sourceUrl": "https://x.com/prasenx/status/2103538744695693512",
    "promptSourceUrl": "https://x.com/prasenx/status/2103706945123487925",
    "collectionUrl": "https://github.com/yihui-dev/awesome-opus5-5-videos/blob/main/prompts/prasenx-693512.md",
    "poster": "/motion-posters/motion-showreel.webp",
    "video": "https://video.twimg.com/amplify_video/2103537567853666304/vid/avc1/1280x720/1__01sgChnfv1K8u.mp4",
    "requiresReference": false,
    "width": 1280,
    "height": 720
  },
  {
    "id": "ui-morph",
    "title": "UI morph showreel",
    "author": "twoclipping",
    "type": "Prompt",
    "model": "Opus 5.5",
    "categories": [
      "Product UI",
      "Charts",
      "Shapes"
    ],
    "prompt": "<inputs>\nAsk me for: 8 to 12 UI states I want the shape to become (e.g. button, loader, player, slider, toggle, tabs, chart, command palette, toast), pure black and white or one accent color, and a royalty-free song around 120 BPM (e.g. Mixkit, free for commercial use).\n</inputs>\n\n<direction>\nDribbble-level UI motion. One shape, never cut: every state is the same element morphing its size, radius and color while its content swaps with a short blur. A cursor drives every change with real clicks and drags. Light warm-gray canvas, black and white components, one clean UI font (Geist). Springs everywhere, a tiny overshoot at most. The camera zooms so each state fills the frame. The last frame is the first frame, so it loops.\nBanned: bouncy easing, particle bursts, glows, gradients on UI chrome, mismatched icon strokes, dead time, anything that looks like a template.\n</direction>\n\n<structure>\n120 BPM, 7 bars, something happens on every beat.\nButton → loader → check → dynamic island → music player with a play/pause morph → scrub the progress bar → it becomes a volume slider that stretches when dragged past max → a toggle flips on the beat → the knob becomes a liquid tab indicator → the tabs open into a chart that draws itself, with a tooltip on hover → it collapses into ⌘K → type to filter → enter → toast → back to the button.\n</structure>\n\n<build>\n1. One HTML file, square 1440x1440. Every style is computed from time inside seek(t): no CSS transitions, no timers, no state carried between frames.\n2. Springs are closed-form step responses. A value that changes target many times is the sum of one spring per change, so it stays a pure function of time.\n3. The tab indicator's two edges ride different springs, so the leading edge stretches ahead of the trailing one. Same trick for the toggle knob.\n4. Drags are direct manipulation: while the cursor is held, the value is computed from its position. On release it springs back from wherever it was.\n5. Analyze the song with numpy for the beat grid and start on a downbeat. Place every UI sound by its measured peak.\n6. Render with Playwright: 4 subframes per frame, blended with ffmpeg tmix for motion blur at 60fps.\n7. Render one frame per beat before the full render. Fix anything off the grid, cramped or hard to read.\n</build>\n\n<gotchas>\nNever put will-change on anything the camera scales or the text renders blurry. Text that swaps inside a morphing container needs its own enter and exit timing or it overlaps. Make the last frame identical to the first, cursor position and speed included, or the loop stutters.\n</gotchas>\n\n<start>\nAsk me for the inputs, then show me the state list on the beat grid before you write any code.\n</start>",
    "sourceUrl": "https://x.com/twoclipping/status/2103273003555402193",
    "promptSourceUrl": "https://x.com/twoclipping/status/2103273003555402193",
    "collectionUrl": "https://github.com/yihui-dev/awesome-opus5-5-videos/blob/main/prompts/twoclipping-402193.md",
    "poster": "/motion-posters/ui-morph.webp",
    "video": "https://video.twimg.com/amplify_video/2103272964967804928/vid/avc1/720x720/18beFxJGrO4tjaDQ.mp4",
    "requiresReference": false,
    "width": 720,
    "height": 720
  },
  {
    "id": "photo-print",
    "title": "Photo print app launch film",
    "author": "twoclipping",
    "type": "Prompt",
    "model": "Opus 5.5",
    "categories": [
      "Product UI",
      "Phone",
      "Photos",
      "Music"
    ],
    "prompt": "<inputs>\nAsk me for: a one-word brand name for the wordmark (a verb works best), 9 to 12 high-res photos, a royalty-free song around 120 BPM with a drop and a quiet breakdown (Mixkit, free for commercial use), and a free stock clip of a plain wall with moving plant shadows (Pexels).\n</inputs>\n\n<direction>\nAn Apple-keynote launch film, 2D only, one continuous take. Every scene is made out of the previous one: nothing fades, blurs or cuts. Objects change shape instead: text rises out of a mask line, icons pop from zero on a spring, bars draw across, pages push, and a black shape floods the whole frame and contracts into the next scene. Warm off-white canvas, black UI, iOS 26 liquid glass over the photos. Archivo (wdth 125, weight 800) for the wordmark, Geist for UI. A cursor drives every change with real clicks, drags and long-presses. The camera zooms screen-studio style so each moment fills the square, and the cursor scales with it.\nBanned: crossfades, blur-ins, brightness \"developing\", 3D flips, particles, glows, holds longer than 1s, anything that looks like a template.\n</direction>\n\n<structure>\n120 BPM, 54 beats, something happens on every beat.\nOpen: the wordmark squeezes into its own period like an accordion, the dot grows into a black pill, a label rises inside it. Click: six iris blades close over the label and snap open onto a photo. The circle becomes a square, shrinks, the grid unfolds from behind it like a paper map (center, plus, corners), reflows into a bento, and a click zooms into one tile, landing exactly on the drop.\nGlass: a glass word pops in letter by letter, melts into a droplet that stretches into a glass toolbar. The adjust icon turns it into a slider. Dragging relights the photo from day to golden hour (two aligned shots), and the knob turns into a glass lens while held. It lifts into a glass orb, the next photo opens inside it as a circle, and the orb expands into a lock screen: glass clock digits, date, and a home bar that stretches into a glass music player.\nStage: the lock screen pulls back into a phone (the bezel grows out of the screen edge). The Dynamic Island stretches like liquid, pinches off, flies over and grows into a Mac window that rolls up like a blind. Long-press the wallpaper, drag it onto a Safari tab, the page pushes in, drop it and it becomes the hero of a landing page. Scroll: the hero morphs into a framed print on a product card, with the mat and molding growing out of the photo's edge. Pick a frame color (it paints across) and a size, then the nav button flies down into \"Order print\".\nOrder: one black shape keeps morphing: Ordered ✓ → Printing % → On its way (a van on a route) → Delivered ✓.\nWall: the delivered circle floods the frame edge to edge, holds black for a beat, and contracts into the framed print hanging on the real wall footage. The same iris opens onto the print, closes again, the frame floods the screen and contracts into the pill → the dot → the letters spring back out, landing on the beat return. Last frame = first frame.\n</structure>\n\n<build>\n1. One HTML file, square 1440x1440. Every style is computed from time inside an async seek(t): no CSS transitions, no timers, no state between frames.\n2. Springs are closed-form step responses. A value with many targets is the sum of one spring per change, so it stays a pure function of time.\n3. Liquid glass: each glass element holds its own clone of the scene behind it, filtered with an SVG feImage displacement map (a rounded-rect distance field) through three feDisplacementMaps at slightly different scales for chromatic edges, plus a rim light. Glass letters: a canvas distance field per glyph gives the map, mask and highlights.\n4. Goo: blur + alpha threshold, then composite the source atop it so the glass stays sharp inside.\n5. Iris: 6 blades around a hexagonal aperture. Each blade is its two vertices, both edge extensions and the SHORT arc between them.\n6. Wordmark squeeze: every letter moves toward the dot by the same factor and its drawn width follows (narrow the wdth axis, scale the rest), so the letters stay touching.\n7. Footage: re-encode all-intra (ffmpeg -g 1), load it as a blob URL, await 'seeked' before drawing each frame.\n8. Sound: a downloaded SFX for every event (Mixkit), never synthesized, each placed by its measured peak. The song starts on a downbeat: the zoom lands on the drop, the wall sits in the breakdown, the wordmark returns with the beat. Loudnorm to -14 LUFS.\n9. Render with Playwright: 4 subframes per frame blended with ffmpeg tmix, 60fps. Check one frame per beat, then scan for single-frame pops (frame-difference spikes 3x their neighbours).\n</build>\n\n<gotchas>\nbackdrop-filter: url() misreads displacement maps in Chromium, so clone the scene instead. A flood must overscale past the corners and take about 0.3s, or half the screen changes in one frame. A child with visibility: visible shows through a hidden parent, so use inherit. Text that swaps inside a morphing shape needs its own mask. python http.server can't range-seek video, so use the blob URL.\n</gotchas>\n\n<start>\nAsk me for the inputs, then show me the beat map and 4 stills (open, glass, stage, wall) before you write the full film.\n</start>",
    "sourceUrl": "https://x.com/twoclipping/status/2103835273813496100",
    "promptSourceUrl": "https://x.com/twoclipping/status/2103835273813496100",
    "collectionUrl": "https://github.com/yihui-dev/awesome-opus5-5-videos/blob/main/prompts/twoclipping-496100.md",
    "poster": "/motion-posters/photo-print.webp",
    "video": "https://video.twimg.com/amplify_video/2103830256347910144/vid/avc1/720x720/5ECca-LUMDVtwt7a.mp4",
    "requiresReference": true,
    "width": 720,
    "height": 720
  },
  {
    "id": "mathematics",
    "title": "Mathematics motion showreel",
    "author": "Math_files",
    "type": "Prompt",
    "model": "Opus 5.5",
    "categories": [
      "Charts",
      "Diagrams"
    ],
    "prompt": "make a dynamic 20-second motion graphics video related to mathematics that shows what an incredible motion designer with mathematics skills you are, like it's your showreel for a résumé. go all out",
    "sourceUrl": "https://x.com/Math_files/status/2104486181853610052",
    "promptSourceUrl": "https://x.com/Math_files/status/2104486181853610052",
    "collectionUrl": "https://prompt-motion.com/math-files-39c9d0",
    "poster": "/motion-posters/mathematics.webp",
    "video": "https://video.twimg.com/amplify_video/2104485588590280704/vid/avc1/1280x720/UN0_vD9WEQKmJB1H.mp4",
    "width": 1280,
    "height": 720
  },
  {
    "id": "recursion",
    "title": "Recursion explained in genres",
    "author": "emollick",
    "type": "Prompt",
    "model": "Opus 5.5",
    "categories": [
      "Characters",
      "Code"
    ],
    "prompt": "A video explaining recursion, where every explanation about recursion has a radically different video style, make this self-referential & clever & fast moving.",
    "sourceUrl": "https://x.com/emollick/status/2103688362960019567",
    "promptSourceUrl": "https://x.com/emollick/status/2103688362960019567",
    "collectionUrl": "https://github.com/yihui-dev/awesome-opus5-5-videos/blob/main/prompts/emollick-019567.md",
    "poster": "/motion-posters/recursion.webp",
    "video": "https://video.twimg.com/amplify_video/2103687838420131840/vid/avc1/1280x720/t4wbzHKUlltQRbjh.mp4",
    "width": 1280,
    "height": 720
  },
  {
    "id": "cinetic",
    "title": "Cinetic skill launch film",
    "author": "LexnLin",
    "type": "Skill",
    "model": "Opus 5.5",
    "categories": [
      "Product UI",
      "Code"
    ],
    "prompt": "npx skills add Leonxlnx/cinetic",
    "sourceUrl": "https://x.com/LexnLin/status/2106891315371737480",
    "promptSourceUrl": "https://x.com/LexnLin/status/2106891315371737480",
    "collectionUrl": "https://prompt-motion.com/lexnlin-6161a6",
    "poster": "/motion-posters/cinetic.webp",
    "skillUrl": "https://github.com/Leonxlnx/cinetic",
    "video": "https://video.twimg.com/amplify_video/2106887230614573056/vid/avc1/1280x720/dRWhX8JMghv5hJEt.mp4",
    "width": 1280,
    "height": 720
  },
  {
    "id": "typingmind",
    "title": "TypingMind logo reveal",
    "author": "tdinh_me",
    "type": "Prompt",
    "model": "Opus 5.5",
    "categories": [
      "Shapes"
    ],
    "prompt": "Create an impressive motion design video of a slow-reveal transition that assembles and eventually reveals the TypingMind logo.",
    "sourceUrl": "https://x.com/tdinh_me/status/2103704250329301409",
    "promptSourceUrl": "https://x.com/tdinh_me/status/2103704250329301409",
    "collectionUrl": "https://github.com/yihui-dev/awesome-opus5-5-videos/blob/main/prompts/tdinh-me-301409.md",
    "poster": "/motion-posters/typingmind.webp",
    "video": "https://video.twimg.com/amplify_video/2103703848015835136/vid/avc1/1280x720/GlBriVishnQMcY9g.mp4",
    "requiresReference": true,
    "width": 1280,
    "height": 720
  },
  {
    "id": "starry-night",
    "title": "Starry Night cat-spotting game",
    "author": "MandelDuck",
    "type": "Prompt",
    "model": "Opus 5.5",
    "categories": [
      "Characters"
    ],
    "prompt": "can you make a 3d game where you walk around and spot cats inside of a van gogh painting? we can start with stary night and its town",
    "sourceUrl": "https://x.com/MandelDuck/status/2103802923465768972",
    "promptSourceUrl": "https://x.com/MandelDuck/status/2103802923465768972",
    "collectionUrl": "https://github.com/yihui-dev/awesome-opus5-5-videos/blob/main/prompts/mandelduck-768972.md",
    "poster": "/motion-posters/starry-night.webp",
    "video": "https://video.twimg.com/amplify_video/2103802857933721600/vid/avc1/1280x708/mDjEpSSAAjiu_m8j.mp4",
    "width": 1280,
    "height": 708
  },
  {
    "id": "enxovaly",
    "title": "Enxovaly baby app promo",
    "author": "gabrielbuzziv",
    "type": "Prompt",
    "model": "Opus 5.5",
    "categories": [
      "Product UI",
      "Phone"
    ],
    "prompt": "make a dynamic 15-second motion graphics video that shows what an incredible motion designer you are, like it's your showreel for a résumé. go all out.",
    "sourceUrl": "https://x.com/gabrielbuzziv/status/2103589440258187408",
    "promptSourceUrl": "https://x.com/gabrielbuzziv/status/2103590703289057430",
    "collectionUrl": "https://prompt-motion.com/gabrielbuzziv-4ff0c6",
    "poster": "/motion-posters/enxovaly.webp",
    "video": "https://video.twimg.com/amplify_video/2103589369307127808/vid/avc1/1280x720/ru94M24D1mbIZMhM.mp4",
    "width": 1280,
    "height": 720
  },
  {
    "id": "bold-type",
    "title": "Bold kinetic type showreel",
    "author": "shneural",
    "type": "Prompt",
    "model": "Opus 5.5",
    "categories": [
      "Kinetic type",
      "Shapes",
      "Particles"
    ],
    "prompt": "make a dynamic 15-second motion graphics video that shows what an incredible motion designer you are, like it's your showreel for a résumé. go all out.",
    "sourceUrl": "https://x.com/shneural/status/2103151003272962130",
    "promptSourceUrl": "https://x.com/shneural/status/2103151003272962130",
    "collectionUrl": "https://prompt-motion.com/shneural-2abdfa",
    "poster": "/motion-posters/bold-type.webp",
    "video": "https://video.twimg.com/amplify_video/2103149570440024064/vid/avc1/1280x720/mlmcQzB4C3BEWPQS.mp4",
    "width": 1280,
    "height": 720
  },
  {
    "id": "particle-showreel",
    "title": "Motion designer showreel",
    "author": "himanshutwtxs",
    "type": "Prompt",
    "model": "Opus 5.5",
    "categories": [
      "Diagrams",
      "Kinetic type",
      "Particles"
    ],
    "prompt": "make a dynamic 15-second motion graphics video that shows what an incredible motion designer you are, like it's your showreel for a résumé. go all out",
    "sourceUrl": "https://x.com/himanshutwtxs/status/2103495232637882858",
    "promptSourceUrl": "https://x.com/himanshutwtxs/status/2103495232637882858",
    "collectionUrl": "https://prompt-motion.com/himanshutwtxs-5f4b43",
    "poster": "/motion-posters/particle-showreel.webp",
    "video": "https://video.twimg.com/amplify_video/2103494828042670081/vid/avc1/1280x720/YvTsYCqOKw5N-ECI.mp4",
    "width": 1280,
    "height": 720
  }
];
export const MOTION_RESOURCES = [
  { title: 'claude-motion', author: 'whaleyxbt', url: 'https://github.com/whaleyxbt/claude-motion' },
  { title: 'motion-prompt', author: 'showheyohtaki', url: 'https://github.com/showheyohtaki/motion-prompt' },
  { title: 'HyperFrames', author: 'heygen-com', url: 'https://github.com/heygen-com/hyperframes' },
  { title: 'Remotion', author: 'remotion-dev', url: 'https://github.com/remotion-dev/remotion' },
];
