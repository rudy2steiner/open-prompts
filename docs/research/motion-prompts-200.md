# X Motion 案例候选：200 条新增原帖

采集时间：2026-10-20T17:25:04.908154+00:00。共 200 条，179 位作者；排除当前页面已有案例，并按原生视频所属帖子去重。

## 核验范围

- 200 条均通过 X 公开嵌入元数据核验：作者账号匹配，存在原生视频、视频地址和封面地址。
- 保留 x.com 作者原帖、video.twimg.com 视频、pbs.twimg.com 封面；未下载视频，也未加入页面。
- 56 条附有提示词原帖线索，尚未逐条核验提示词全文；其余标记为未收集。未批量转载第三方画廊提示词。
- 标题与模型来自收录目录，模型尚未逐条与作者声明交叉验证。自动分类仅供初筛；未判断成片质量，未确认 Prompt / Skill 类型，缺少明确分类的保留空数组。
- 有视频代表媒体元数据存在，不代表已逐条播放验证；X 视频地址后续可能失效。

## 模型线索分布

| 目录报告模型 | 数量 |
| --- | ---: |
| GPT-6 Astra | 18 |
| Kimi K3 | 6 |
| Claude Fable 5 | 5 |
| opus-5.5 | 161 |
| sonnet-5.5 | 3 |
| fable-5.5 | 4 |
| opus-5.5, fable-5.5 | 3 |

## 采集来源

- [awesome-opus-5.5-video](https://github.com/zhuyansen/awesome-opus-5.5-video)
- [awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos)
- [motionpromptgallery 公开元数据](https://github.com/mikenevermiss/motionpromptgallery/blob/main/data/items.json)（仅发现线索）
- 原帖核验使用 X 公开嵌入元数据，逐条证据 URL 和核验时间见 JSON。

## 文件与复查

- 数据：`src/data/imports/motion-prompts-candidates.json`。未被页面导入。
- 采集器：`python3 scripts/collect-motion-cases.py --count 200`；运行时从公开源重新发现并核验，来源更新后结果可能变化。`--extra` 可传入额外候选 JSON，`--cache` 可指定临时缓存目录。
- 下一步按成片质量筛选，再核验作者公开提示词，确认模型、分类和 Prompt / Skill 类型后入页。

## 候选清单

| # | 效果线索 | 作者原帖 | 目录报告模型 | 提示词线索 |
| ---: | --- | --- | --- | --- |
| 1 | AdCar TV one-shot launch video | [@d4m1n](https://x.com/d4m1n/status/2096258259459964963) | GPT-6 Astra | 未收集 |
| 2 | T cells: a 5-minute explainer from one line | [@DeryaTR_](https://x.com/DeryaTR_/status/2095659170661904804) | GPT-6 Astra | 未收集 |
| 3 | Atomik 33-second launch film | [@makwanatejas170](https://x.com/makwanatejas170/status/2096555742597988400) | GPT-6 Astra | 未收集 |
| 4 | Changelog highlight video (no skill installed) | [@leon7hao](https://x.com/leon7hao/status/2096844989900914865) | GPT-6 Astra | 未收集 |
| 5 | The Watermelon Test (rubber bands, Three.js) | [@vib3coded](https://x.com/vib3coded/status/2104994617573970308) | GPT-6 Astra | 未收集 |
| 6 | Octo Jelly: squishable gummy octopus (WebGPU) | [@vib3coded](https://x.com/vib3coded/status/2104466170275324190) | GPT-6 Astra | 未收集 |
| 7 | Jellyfish Jelly: squishable gummy jellyfish (WebGPU) | [@vib3coded](https://x.com/vib3coded/status/2104651061336117614) | GPT-6 Astra | 未收集 |
| 8 | Pixel-art cheetah run | [@HarshithLucky3](https://x.com/HarshithLucky3/status/2103120423005425972) | GPT-6 Astra | 未收集 |
| 9 | Cracking aquarium simulation | [@UnslothAI](https://x.com/UnslothAI/status/2082528683747873194) | Kimi K3 | 未收集 |
| 10 | Gargantua black-hole geodesic raytracer (WebGL2) | [@devloper_hs](https://x.com/devloper_hs/status/2079590483727442205) | Kimi K3 | 未收集 |
| 11 | Voxel soccer goal animation | [@Zmthanh](https://x.com/Zmthanh/status/2079553757302710442) | Kimi K3 | 未收集 |
| 12 | Procedural 3D cherry blossom tree | [@zhodonx](https://x.com/zhodonx/status/2080178541979664741) | Claude Fable 5 | 未收集 |
| 13 | Maglev train in a glass vacuum tube | [@Pixel_Neuron](https://x.com/Pixel_Neuron/status/2080454415400493332) | Claude Fable 5 | 未收集 |
| 14 | Infinite paper machine | [@RoundtableSpace](https://x.com/RoundtableSpace/status/2081533777340506251) | Claude Fable 5 | 未收集 |
| 15 | Voxel soccer goal animation | [@Zmthanh](https://x.com/Zmthanh/status/2079198084689723560) | Claude Fable 5 | 未收集 |
| 16 | Galaxy flythrough from real orbital physics | [@Argona0x](https://x.com/Argona0x/status/2101055500599054437) | GPT-6 Astra | 未收集 |
| 17 | Exploded-view animation of a Japanese flower shop | [@KanaWorks_AI](https://x.com/KanaWorks_AI/status/2097153139795468365) | GPT-6 Astra | 未收集 |
| 18 | Dieline-to-box folding carton animation | [@Salmaaboukarr](https://x.com/Salmaaboukarr/status/2096612394281603144) | GPT-6 Astra | 未收集 |
| 19 | Nuclear blast simulation over a 3D city | [@ashishthakur___](https://x.com/ashishthakur___/status/2096562462674079868) | GPT-6 Astra | 未收集 |
| 20 | Wordless 3D cat short: one treat button | [@boboga777](https://x.com/boboga777/status/2097900087901106244) | GPT-6 Astra | 未收集 |
| 21 | 禅境·古寺: 64-second Zen temple build-process video | [@huoshan007](https://x.com/huoshan007/status/2098697876155076820) | GPT-6 Astra | 未收集 |
| 22 | Tokyo Tower day-and-night 3D film | [@wafffle_dev](https://x.com/wafffle_dev/status/2102276620124062065) | GPT-6 Astra | 未收集 |
| 23 | Abiogenesis to multicellular life in raw WebGL | [@yume_arasaki](https://x.com/yume_arasaki/status/2096040448477515874) | GPT-6 Astra | 未收集 |
| 24 | 3D pelican riding a bicycle | [@aibuilderclub_](https://x.com/aibuilderclub_/status/2096213850383331489) | GPT-6 Astra | 未收集 |
| 25 | Shot-by-shot iPhone 17 Pro commercial recreation | [@chatcutapp](https://x.com/chatcutapp/status/2096925943575330908) | GPT-6 Astra | 未收集 |
| 26 | Recursive pelican-on-a-bicycle looping animation | [@1littlecoder](https://x.com/1littlecoder/status/2077880380900937865) | Kimi K3 | 未收集 |
| 27 | Animated personal website with cursor reactions | [@nicky_sap](https://x.com/nicky_sap/status/2077857190707429411) | Kimi K3 | 未收集 |
| 28 | Solar system orrery that predicts eclipses | [@tetumemo](https://x.com/tetumemo/status/2064477582930989357) | Claude Fable 5 | 未收集 |
| 29 | "Enter the K": Kimi K3 launch site as a scroll-driven type film | [@jumperz](https://x.com/jumperz/status/2077841331037094042) | Kimi K3 | 未收集 |
| 30 | 15-second motion designer showreel (the original viral prompt) | [@stephanlivera](https://x.com/stephanlivera/status/2103315922098470926) | opus-5.5 | [待核验](https://x.com/stephanlivera/status/2103315922098470926) |
| 31 | AI-made video demo | [@devteamdrew](https://x.com/devteamdrew/status/2102436464323661880) | opus-5.5 | 未收集 |
| 32 | Motion Design Launch Video | [@uxmiles](https://x.com/uxmiles/status/2104618175803609305) | opus-5.5 | 未收集 |
| 33 | Unspecified animation made in 15 minutes | [@achxvi](https://x.com/achxvi/status/2103918792845963545) | opus-5.5 | 未收集 |
| 34 | High-energy motion graphics showreel | [@crvdesign0](https://x.com/crvdesign0/status/2103817034618339682) | opus-5.5 | [待核验](https://x.com/crvdesign0/status/2103817034618339682) |
| 35 | Animated rebuttal to AI doom predictions | [@_brightmirror](https://x.com/_brightmirror/status/2104078568137675107) | opus-5.5 | 未收集 |
| 36 | Frame replication quality test | [@AQS_kr](https://x.com/AQS_kr/status/2103751625932255482) | opus-5.5 | 未收集 |
| 37 | Multi-AI-tool dance motion graphics | [@sankakuten91256](https://x.com/sankakuten91256/status/2103483923783373039) | opus-5.5 | 未收集 |
| 38 | 15-second motion showreel rendered with Remotion | [@ajith_io](https://x.com/ajith_io/status/2103449416325890146) | opus-5.5 | [待核验](https://x.com/ajith_io/status/2103449416325890146) |
| 39 | Event promotional short video | [@tkm_hmng8](https://x.com/tkm_hmng8/status/2105255710531674358) | opus-5.5 | 未收集 |
| 40 | Motion showreel generated at xhigh effort | [@kenn](https://x.com/kenn/status/2103337314021937232) | opus-5.5 | [待核验](https://x.com/kenn/status/2103470894215782716) |
| 41 | Animated pixel art wizard casting a spell | [@majidmanzarpour](https://x.com/majidmanzarpour/status/2102476258948927543) | opus-5.5 | [待核验](https://x.com/majidmanzarpour/status/2102476499387383834) |
| 42 | Motion design launch video | [@gauravsbuilding](https://x.com/gauravsbuilding/status/2104370091672711402) | opus-5.5 | [待核验](https://x.com/gauravsbuilding/status/2104370091672711402) |
| 43 | Multi-agent generated narrated video | [@AndrewOnXYZ](https://x.com/AndrewOnXYZ/status/2102512879258009818) | opus-5.5 | 未收集 |
| 44 | NVIDIA Blackwell GPU zoom-through animation | [@lucian__03](https://x.com/lucian__03/status/2103494418477260830) | opus-5.5 | 未收集 |
| 45 | Personalized motion showreel using memory | [@tetumemo](https://x.com/tetumemo/status/2103407771102421285) | opus-5.5 | [待核验](https://x.com/tetumemo/status/2103407779520369086) |
| 46 | Motion showreel from a Turkish prompt | [@leodavincs3](https://x.com/leodavincs3/status/2103425994610643203) | opus-5.5 | [待核验](https://x.com/leodavincs3/status/2103426198659633558) |
| 47 | UDC conference motion design video | [@johncodunayo](https://x.com/johncodunayo/status/2105270766996701686) | opus-5.5 | 未收集 |
| 48 | Pixel character dodging meteors on a rainbow space track | [@riku720720](https://x.com/riku720720/status/2102515055116063144) | opus-5.5 | [待核验](https://x.com/riku720720/status/2102515058010132554) |
| 49 | Rick Astley's dance as moving blocks in HTML | [@petergostev](https://x.com/petergostev/status/2103033635397898433) | opus-5.5 | [待核验](https://x.com/petergostev/status/2103082371570340234) |
| 50 | Beat-synced motion graphics with code breakdown | [@aiehon_aya](https://x.com/aiehon_aya/status/2103403361022419005) | opus-5.5 | 未收集 |
| 51 | UX decision explainer animation | [@moguzbulbul](https://x.com/moguzbulbul/status/2104206095313215591) | opus-5.5 | 未收集 |
| 52 | Voiceover with Motion Graphics | [@tu_u_k](https://x.com/tu_u_k/status/2104629219607114206) | opus-5.5 | 未收集 |
| 53 | Jelly wobble transparency effect site | [@MatoToushi](https://x.com/MatoToushi/status/2104778232683999363) | opus-5.5 | 未收集 |
| 54 | Real-time cartoon spinner for agent activity | [@anshuc](https://x.com/anshuc/status/2105773281936650247) | sonnet-5.5 | 未收集 |
| 55 | TypingMind product intro motion video | [@tdinh_me](https://x.com/tdinh_me/status/2103703135902740699) | opus-5.5 | [待核验](https://x.com/tdinh_me/status/2103705073494987058) |
| 56 | Procedurally drawn galloping horse animation | [@victormustar](https://x.com/victormustar/status/2102707412704919910) | opus-5.5 | 未收集 |
| 57 | Attempt to recreate a dance team's video | [@2irl4u](https://x.com/2irl4u/status/2102707564215755116) | opus-5.5 | 未收集 |
| 58 | Apple Liquid Glass style UI motion showcase | [@motion_conquest](https://x.com/motion_conquest/status/2103510103622308152) | opus-5.5 | [待核验](https://x.com/motion_conquest/status/2103777971534495911) |
| 59 | Recreated challenge video effect | [@blueemi99](https://x.com/blueemi99/status/2109633997638938935) | opus-5.5 | 未收集 |
| 60 | Cool animation generated from simple prompt | [@cherry_mx_reds](https://x.com/cherry_mx_reds/status/2105816670896009224) | fable-5.5 | [待核验](https://x.com/cherry_mx_reds/status/2105816670896009224) |
| 61 | Visual reading of a Karpathy tweet | [@rileybrown](https://x.com/rileybrown/status/2109423417870954979) | opus-5.5 | 未收集 |
| 62 | Short generated animated video | [@imjustnewatai](https://x.com/imjustnewatai/status/2105808539495354669) | fable-5.5 | 未收集 |
| 63 | One-shot animated video demo | [@shapelayer](https://x.com/shapelayer/status/2102562623824757136) | opus-5.5 | 未收集 |
| 64 | Channel-building video skill demo | [@xiaohu](https://x.com/xiaohu/status/2110729141289107485) | opus-5.5 | 未收集 |
| 65 | Game reward settlement animation | [@op7418](https://x.com/op7418/status/2103724883301814408) | opus-5.5 | 未收集 |
| 66 | Frame-by-frame JavaScript animation | [@strawhatsu4](https://x.com/strawhatsu4/status/2102457111787745405) | opus-5.5 | 未收集 |
| 67 | One-shot motion video demo | [@chhddavid](https://x.com/chhddavid/status/2102666619029999989) | opus-5.5 | 未收集 |
| 68 | 15-second motion designer showreel by @robj3d3 | [@robj3d3](https://x.com/robj3d3/status/2103875898349088830) | opus-5.5 | [待核验](https://x.com/robj3d3/status/2103875898349088830) |
| 69 | Motion design made from PDF playbook | [@flxrnc](https://x.com/flxrnc/status/2110726928315654630) | opus-5.5 | 未收集 |
| 70 | Animating a hero design from static images | [@adriankuleszo](https://x.com/adriankuleszo/status/2103452143055483132) | opus-5.5 | 未收集 |
| 71 | Code-generated video demo | [@bridgemindai](https://x.com/bridgemindai/status/2103530750767206626) | opus-5.5 | 未收集 |
| 72 | Piano composition with JS-drawn animation | [@kevin_t_ngo](https://x.com/kevin_t_ngo/status/2103482164193165711) | opus-5.5 | 未收集 |
| 73 | 15-second motion designer showreel by @leonabboud | [@leonabboud](https://x.com/leonabboud/status/2103576084499358051) | opus-5.5 | [待核验](https://x.com/leonabboud/status/2103578764018139349) |
| 74 | Code-Generated Audiovisual Animation | [@AndyL5cc](https://x.com/AndyL5cc/status/2104060535415476361) | opus-5.5 | 未收集 |
| 75 | Day-of-week kinetic motion graphic with BGM | [@nokonoko_1203](https://x.com/nokonoko_1203/status/2105922366190784915) | opus-5.5 | [待核验](https://x.com/nokonoko_1203/status/2105922366190784915) |
| 76 | CoAnimator app animation demo | [@rege_dev](https://x.com/rege_dev/status/2102498682931441977) | opus-5.5 | 未收集 |
| 77 | 80-second glass and gold-leaf mosaic film | [@LCSlates](https://x.com/LCSlates/status/2102503027340988559) | opus-5.5 | [待核验](https://x.com/LCSlates/status/2102503028859211905) |
| 78 | 20 animation styles compilation | [@yasinozmeen](https://x.com/yasinozmeen/status/2104086740600254919) | opus-5.5 | 未收集 |
| 79 | Dot battle motion study | [@aicreataro](https://x.com/aicreataro/status/2106236856979607569) | opus-5.5 | 未收集 |
| 80 | Violin score with animation | [@Hesamation](https://x.com/Hesamation/status/2103535326325055843) | opus-5.5 | [待核验](https://x.com/Hesamation/status/2103535326325055843) |
| 81 | Graphic posts and animation from one prompt | [@nazmijavierl](https://x.com/nazmijavierl/status/2102712897701097828) | opus-5.5 | 未收集 |
| 82 | Design brought to life with animation | [@Onethirdesigner](https://x.com/Onethirdesigner/status/2103749509616648627) | opus-5.5 | [待核验](https://x.com/Onethirdesigner/status/2103824534201827630) |
| 83 | Attempt to match a reference motion design | [@makwanatejas170](https://x.com/makwanatejas170/status/2103922986155917592) | opus-5.5 | 未收集 |
| 84 | Animation examples for promo and course videos | [@mahiru35628](https://x.com/mahiru35628/status/2102802579499700704) | opus-5.5 | 未收集 |
| 85 | Four-minute 2D animation made with up to 15 agents | [@ALSK_ai](https://x.com/ALSK_ai/status/2103135536634630632) | opus-5.5 | [待核验](https://x.com/ALSK_ai/status/2103136199036850579) |
| 86 | Rhythmic motion graphics clip | [@Sultan_Magfory](https://x.com/Sultan_Magfory/status/2103913014680535156) | opus-5.5 | 未收集 |
| 87 | Distilbook motion graphics showreel | [@ajith_io](https://x.com/ajith_io/status/2103469807375208546) | opus-5.5 | [待核验](https://x.com/ajith_io/status/2103469807375208546) |
| 88 | Preferred AI workflow demo | [@nikolay_dp](https://x.com/nikolay_dp/status/2103906337998696678) | opus-5.5 | 未收集 |
| 89 | 15-second motion designer showreel by @condzxyz | [@condzxyz](https://x.com/condzxyz/status/2103556754550469102) | opus-5.5 | [待核验](https://x.com/condzxyz/status/2103556754550469102) |
| 90 | One-hour Opus 5.5 creation | [@Tanjim38](https://x.com/Tanjim38/status/2102666513409036770) | opus-5.5 | 未收集 |
| 91 | Showreel built from AI dance clips | [@AbaneChan](https://x.com/AbaneChan/status/2103903213363806575) | opus-5.5 | [待核验](https://x.com/AbaneChan/status/2103903213363806575) |
| 92 | Reusable prompt template for a product motion video | [@ann_nnng](https://x.com/ann_nnng/status/2103723183899852885) | opus-5.5 | [待核验](https://x.com/ann_nnng/status/2103759390386057227) |
| 93 | Video generated from single prompt | [@bitfish](https://x.com/bitfish/status/2103647787795824856) | opus-5.5 | 未收集 |
| 94 | 301 recreated viral video effects | [@yihui_indie](https://x.com/yihui_indie/status/2104122905961595267) | opus-5.5 | 未收集 |
| 95 | Motion graphics video | [@pratyushrungta](https://x.com/pratyushrungta/status/2104525735713206557) | opus-5.5 | 未收集 |
| 96 | Motion design animation showcase | [@charliejhills](https://x.com/charliejhills/status/2105580875299836388) | opus-5.5 | 未收集 |
| 97 | VTuber motion graphics in 5 minutes | [@shimotti_ai](https://x.com/shimotti_ai/status/2103831579575587190) | opus-5.5 | 未收集 |
| 98 | Bookmark UI micro-animation | [@kippe07](https://x.com/kippe07/status/2103036199774585026) | opus-5.5 | 未收集 |
| 99 | One-prompt motion demo clip | [@Saccc_c](https://x.com/Saccc_c/status/2105985484472377531) | opus-5.5, fable-5.5 | 未收集 |
| 100 | Anatomy reveal motion design skill demo | [@0xMovez](https://x.com/0xMovez/status/2110735931401457935) | opus-5.5 | 未收集 |
| 101 | Motion piece made with a design tool | [@javiiarchive](https://x.com/javiiarchive/status/2103897550449516644) | opus-5.5 | 未收集 |
| 102 | Beat-Synced Motion Graphics Music Video | [@minchoi](https://x.com/minchoi/status/2106946461980307633) | opus-5.5 | 未收集 |
| 103 | One-shot Blender animation by Opus 5.5 | [@meowman_sol](https://x.com/meowman_sol/status/2109637765684199564) | opus-5.5 | 未收集 |
| 104 | Short motion design video | [@blueemi99](https://x.com/blueemi99/status/2106031355922387163) | opus-5.5, fable-5.5 | 未收集 |
| 105 | AI hype demo video | [@dannypostma](https://x.com/dannypostma/status/2103794099929452699) | opus-5.5 | 未收集 |
| 106 | Cosmos motion piece via HyperFrames | [@kaolti](https://x.com/kaolti/status/2103481296018092204) | opus-5.5 | [待核验](https://x.com/kaolti/status/2103481493532148036) |
| 107 | Video made by Opus 5.5 | [@adipandaio](https://x.com/adipandaio/status/2103541815660228657) | opus-5.5 | 未收集 |
| 108 | Image-based motion graphics | [@ponzponz15](https://x.com/ponzponz15/status/2106307178579857797) | opus-5.5 | 未收集 |
| 109 | One-shot Opus 5.5 creation | [@nateherk](https://x.com/nateherk/status/2103611727661482117) | opus-5.5 | 未收集 |
| 110 | 3D comment display for livestream | [@balaena01](https://x.com/balaena01/status/2103636165907956131) | opus-5.5 | 未收集 |
| 111 | Cocktail recipe explainer motion graphic | [@Ror_Fly](https://x.com/Ror_Fly/status/2102853258582880547) | opus-5.5 | [待核验](https://x.com/Ror_Fly/status/2102853258582880547) |
| 112 | Scroll-triggered generative web redesign tool | [@0xCarnagee](https://x.com/0xCarnagee/status/2103616720007032874) | opus-5.5 | 未收集 |
| 113 | Motion graphic video made for a friend | [@Saeiid](https://x.com/Saeiid/status/2103823130057757180) | opus-5.5 | 未收集 |
| 114 | One-shot video from a casual instruction | [@Suzacque](https://x.com/Suzacque/status/2102677738066956688) | opus-5.5 | 未收集 |
| 115 | Video made with slop cannon MCP | [@boneGPT](https://x.com/boneGPT/status/2102484877941911734) | opus-5.5 | 未收集 |
| 116 | Apple-style launch video made with the brag skill | [@0xhrushi](https://x.com/0xhrushi/status/2103392921559126157) | opus-5.5 | [待核验](https://x.com/0xhrushi/status/2103569630963105854) |
| 117 | Drone-style cliff camera work without a drone | [@socialwithaayan](https://x.com/socialwithaayan/status/2111448458079133856) | opus-5.5 | [待核验](https://x.com/socialwithaayan/status/2111448482162901092) |
| 118 | 15-second motion design showreel (detailed prompt) | [@darel023](https://x.com/darel023/status/2103424524297420829) | opus-5.5 | [待核验](https://x.com/darel023/status/2103424524297420829) |
| 119 | Motion design studio built with GrokBot and Opus 5.5 | [@0xRafy](https://x.com/0xRafy/status/2108673427590590971) | opus-5.5 | 未收集 |
| 120 | Behind the scenes: coded motion graphics video | [@shneural](https://x.com/shneural/status/2103472385563459833) | opus-5.5 | 未收集 |
| 121 | Typography motion graphics animation | [@higgsfield_ai](https://x.com/higgsfield_ai/status/2103963588012744859) | opus-5.5 | 未收集 |
| 122 | JavaScript animation via Replit Animation | [@samuel_spitz](https://x.com/samuel_spitz/status/2103293794594816100) | opus-5.5 | 未收集 |
| 123 | Another Opus 5.5 showreel-style video | [@americanhodl8](https://x.com/americanhodl8/status/2103959107862663337) | opus-5.5 | 未收集 |
| 124 | Marketing video made with Opus 5.5 | [@cocona_ailab](https://x.com/cocona_ailab/status/2102752076107497980) | opus-5.5 | 未收集 |
| 125 | Eminem Godzilla video redrawn in JavaScript | [@abhinavflac](https://x.com/abhinavflac/status/2106638839666373114) | fable-5.5 | 未收集 |
| 126 | Personalized motion video about the creator's account | [@superalesha](https://x.com/superalesha/status/2103578446056321426) | opus-5.5 | 未收集 |
| 127 | Motion graphics dance video recreated in After Effects | [@sankakuten91256](https://x.com/sankakuten91256/status/2103672459392319995) | opus-5.5 | 未收集 |
| 128 | Fake handwriting stroke order animation | [@ivy432hz](https://x.com/ivy432hz/status/2103812196270805155) | opus-5.5 | 未收集 |
| 129 | Live2D-style rigging from a single illustration | [@manaimovie](https://x.com/manaimovie/status/2102797971570196520) | opus-5.5 | 未收集 |
| 130 | Interactive art-style video generator | [@chetaslua](https://x.com/chetaslua/status/2102501773705670994) | opus-5.5 | 未收集 |
| 131 | Motion graphics video made within a usage limit | [@YarHmm](https://x.com/YarHmm/status/2103505435802341449) | opus-5.5 | 未收集 |
| 132 | Compilation of film visual technique demos | [@Kutinawa_VGamer](https://x.com/Kutinawa_VGamer/status/2103476071018766790) | opus-5.5 | [待核验](https://x.com/Kutinawa_VGamer/status/2103476071018766790) |
| 133 | Beat-synced showreel from real clips | [@twoclipping](https://x.com/twoclipping/status/2102554209166000267) | opus-5.5 | [待核验](https://x.com/twoclipping/status/2102554209166000267) |
| 134 | Animated Midjourney image montage | [@ciguleva](https://x.com/ciguleva/status/2104051187825946929) | opus-5.5 | 未收集 |
| 135 | Layered motion graphics via Tesseract | [@trymirage](https://x.com/trymirage/status/2103542300844474452) | opus-5.5 | 未收集 |
| 136 | Motion graphics video from designer showreel prompt | [@konmari_tweet](https://x.com/konmari_tweet/status/2103639233693159742) | opus-5.5 | [待核验](https://x.com/konmari_tweet/status/2103639233693159742) |
| 137 | Open-ended surprise-me AI video | [@mhmtycllll](https://x.com/mhmtycllll/status/2102552313134973187) | opus-5.5 | [待核验](https://x.com/mhmtycllll/status/2102552313134973187) |
| 138 | Motion design animation from a single prompt | [@flxrnc](https://x.com/flxrnc/status/2109629188525420930) | opus-5.5 | 未收集 |
| 139 | Interactive typography book design | [@premiumtantan](https://x.com/premiumtantan/status/2109024841290654186) | opus-5.5 | 未收集 |
| 140 | Reels made with Opus 5.5 | [@javiiarchive](https://x.com/javiiarchive/status/2105283486487896448) | opus-5.5 | [待核验](https://x.com/javiiarchive/status/2105571402669572354) |
| 141 | 15-second motion graphics showreel (product update) | [@SebastianRoehl](https://x.com/SebastianRoehl/status/2103912457836323096) | opus-5.5 | [待核验](https://x.com/SebastianRoehl/status/2103912457836323096) |
| 142 | Professional 30-second product showreel | [@HO_BA](https://x.com/HO_BA/status/2103845264649761062) | opus-5.5 | [待核验](https://x.com/HO_BA/status/2103845264649761062) |
| 143 | Agency intro motion design video | [@baptistelcx](https://x.com/baptistelcx/status/2103437700783038710) | opus-5.5 | 未收集 |
| 144 | Quick 15-minute motion design piece | [@vikktorrrre](https://x.com/vikktorrrre/status/2103829638799618407) | opus-5.5 | 未收集 |
| 145 | Motion design and sound engineering demo | [@kloss_xyz](https://x.com/kloss_xyz/status/2103557735086428547) | opus-5.5 | [待核验](https://x.com/kloss_xyz/status/2103560107921723834) |
| 146 | VRM model character intro animation | [@tegnike](https://x.com/tegnike/status/2103588966834245694) | opus-5.5 | 未收集 |
| 147 | 'The First Spark' procedural hand-drawn short | [@morpheusdv](https://x.com/morpheusdv/status/2102910531560731063) | opus-5.5 | [待核验](https://x.com/morpheusdv/status/2102910588565225905) |
| 148 | Pro-AI accelerationist code-made edit | [@holytrinity](https://x.com/holytrinity/status/2102894936316420109) | opus-5.5 | [待核验](https://x.com/holytrinity/status/2102904969410367828) |
| 149 | Impressive video made by Opus 5.5 | [@peterpawlak](https://x.com/peterpawlak/status/2103882998223400979) | opus-5.5 | 未收集 |
| 150 | SuperX motion graphics showreel | [@robj3d3](https://x.com/robj3d3/status/2104649947610239253) | sonnet-5.5 | [待核验](https://x.com/robj3d3/status/2104649947610239253) |
| 151 | Persian-language motion graphics showreel | [@MatinSenPai](https://x.com/MatinSenPai/status/2103562127474819150) | opus-5.5 | [待核验](https://x.com/MatinSenPai/status/2103566393186648558) |
| 152 | Promotional mascot motion graphics video | [@patchy_dog](https://x.com/patchy_dog/status/2103862188624785635) | opus-5.5 | 未收集 |
| 153 | Symbol-based lyric motion graphics | [@8co28](https://x.com/8co28/status/2102680701762216081) | opus-5.5 | 未收集 |
| 154 | Motion clip with improved sound effects | [@LexnLin](https://x.com/LexnLin/status/2109718604883370450) | opus-5.5 | 未收集 |
| 155 | Company commercial motion graphic | [@showheyohtaki](https://x.com/showheyohtaki/status/2104095944686051492) | opus-5.5 | [待核验](https://x.com/showheyohtaki/status/2104096048381858103) |
| 156 | 90-second motion design and sound demo | [@kloss_xyz](https://x.com/kloss_xyz/status/2103624187017572421) | opus-5.5 | 未收集 |
| 157 | Generated animated clip | [@driftauz](https://x.com/driftauz/status/2111109055955763570) | opus-5.5 | 未收集 |
| 158 | Impressive AI-generated video | [@GregorySchier](https://x.com/GregorySchier/status/2103573891629371497) | opus-5.5 | 未收集 |
| 159 | Seamless looping motion design animation | [@0xkerazcity](https://x.com/0xkerazcity/status/2109705700930957328) | opus-5.5 | 未收集 |
| 160 | Visualization of encryption in secure file transfer | [@SyntaxDiffusion](https://x.com/SyntaxDiffusion/status/2103182358635532377) | opus-5.5 | [待核验](https://x.com/SyntaxDiffusion/status/2103182361366032407) |
| 161 | Showreel motion graphic for a media tool | [@ismailfahmi](https://x.com/ismailfahmi/status/2103759320664219750) | opus-5.5 | 未收集 |
| 162 | 30-second motion promo for Kody | [@kentcdodds](https://x.com/kentcdodds/status/2103638102333858193) | opus-5.5 | [待核验](https://x.com/kentcdodds/status/2103638494388076905) |
| 163 | Anime opening edit of a martial arts clip | [@aimikoda](https://x.com/aimikoda/status/2110119492076404869) | opus-5.5 | [待核验](https://x.com/aimikoda/status/2110120443390709934) |
| 164 | Showreel motion graphics for a media analytics brand | [@ismailfahmi](https://x.com/ismailfahmi/status/2103557833153466403) | opus-5.5 | [待核验](https://x.com/ismailfahmi/status/2103557833153466403) |
| 165 | Collaborative Short Video | [@AiwithSaif7](https://x.com/AiwithSaif7/status/2106268181413429416) | opus-5.5 | 未收集 |
| 166 | Extended motion designer showreel | [@himanshutwtxs](https://x.com/himanshutwtxs/status/2103620708601639016) | opus-5.5 | 未收集 |
| 167 | 15-Second Motion Graphics Showcase | [@Saccc_c](https://x.com/Saccc_c/status/2106376222309761094) | opus-5.5, fable-5.5 | [待核验](https://x.com/Saccc_c/status/2106376222309761094) |
| 168 | Beat-synced K-pop motion graphics music video | [@minchoi](https://x.com/minchoi/status/2110001964402831512) | opus-5.5 | [待核验](https://x.com/minchoi/status/2110001968080957534) |
| 169 | Code-generated personal style video | [@sarpstar](https://x.com/sarpstar/status/2110741762159288825) | opus-5.5 | 未收集 |
| 170 | Viral video based on trending topics | [@DrClownPhD](https://x.com/DrClownPhD/status/2103510971046096906) | opus-5.5 | [待核验](https://x.com/DrClownPhD/status/2103510971046096906) |
| 171 | 15-second motion graphics showreel for a website | [@melvynx](https://x.com/melvynx/status/2103714680577638493) | opus-5.5 | [待核验](https://x.com/melvynx/status/2103714680577638493) |
| 172 | Dot-themed motion video | [@seiiiiiiiiiiru](https://x.com/seiiiiiiiiiiru/status/2107018580265201724) | opus-5.5 | 未收集 |
| 173 | Live streaming UI built on generated video | [@aimikoda](https://x.com/aimikoda/status/2109915723074097287) | opus-5.5 | [待核验](https://x.com/aimikoda/status/2110023187505242221) |
| 174 | One-shot video generated with Opus 5.5 and Codex | [@yuno_miyako2](https://x.com/yuno_miyako2/status/2110016393886445964) | opus-5.5 | 未收集 |
| 175 | Quick ad video from one prompt | [@Nour_Sofanati](https://x.com/Nour_Sofanati/status/2103653780327641130) | opus-5.5 | 未收集 |
| 176 | Retro game card-reveal UX experiment | [@nickfromlater](https://x.com/nickfromlater/status/2102504454721347822) | opus-5.5 | 未收集 |
| 177 | Self-introduction video made in minutes | [@shinjiko9](https://x.com/shinjiko9/status/2103643458913304872) | opus-5.5 | 未收集 |
| 178 | Impressive motion design output | [@rjrazzle](https://x.com/rjrazzle/status/2103413999421509764) | opus-5.5 | 未收集 |
| 179 | Professional-quality single-prompt creation | [@ailker](https://x.com/ailker/status/2103523453810921944) | opus-5.5 | 未收集 |
| 180 | Motion animation video for an Obsidian template | [@eryidebiji](https://x.com/eryidebiji/status/2103596524018221133) | opus-5.5 | 未收集 |
| 181 | Keyboard typing animation without keyframes | [@seeconvm](https://x.com/seeconvm/status/2110770664101527568) | opus-5.5 | 未收集 |
| 182 | Motion short about task delegation | [@kelanoo](https://x.com/kelanoo/status/2108199183983497433) | opus-5.5 | [待核验](https://x.com/kelanoo/status/2108199189134053863) |
| 183 | Unity particle VFX logo transformation | [@_3912657840](https://x.com/_3912657840/status/2103417471063736729) | opus-5.5 | 未收集 |
| 184 | Code-painted animation | [@chetaslua](https://x.com/chetaslua/status/2106833074302710023) | fable-5.5 | 未收集 |
| 185 | Motion design built in After Effects via MCP | [@higgsfield_ai](https://x.com/higgsfield_ai/status/2103853474098352326) | opus-5.5 | 未收集 |
| 186 | Ancient royal courtyard sword fight | [@Viniai_](https://x.com/Viniai_/status/2109906127035187408) | opus-5.5 | 未收集 |
| 187 | Motion design recreated from reference clip | [@gxjo_dev](https://x.com/gxjo_dev/status/2108632470551933011) | opus-5.5 | 未收集 |
| 188 | Cracked retro game launch video | [@doseofcreative](https://x.com/doseofcreative/status/2110407591503491372) | opus-5.5 | [待核验](https://x.com/doseofcreative/status/2110407591503491372) |
| 189 | UI animation showcase | [@kevin_t_ngo](https://x.com/kevin_t_ngo/status/2111974919353544757) | opus-5.5 | 未收集 |
| 190 | YouTube intro animation | [@franperez_fp](https://x.com/franperez_fp/status/2104709328238199145) | sonnet-5.5 | 未收集 |
| 191 | Self-introduction motion graphics from a script | [@kumiko_shiraki](https://x.com/kumiko_shiraki/status/2103771566982959414) | opus-5.5 | [待核验](https://x.com/kumiko_shiraki/status/2103771566982959414) |
| 192 | 15-second motion designer showreel by @jasonzhou1993 | [@jasonzhou1993](https://x.com/jasonzhou1993/status/2103663364958515541) | opus-5.5 | [待核验](https://x.com/jasonzhou1993/status/2103663364958515541) |
| 193 | Birds emerging from a glass sphere | [@HBCoop_](https://x.com/HBCoop_/status/2107139305324122491) | opus-5.5 | 未收集 |
| 194 | Motion design piece with custom 3D models | [@MengTo](https://x.com/MengTo/status/2103825139964227999) | opus-5.5 | 未收集 |
| 195 | 10-second motion showreel remake | [@mattiapomelli](https://x.com/mattiapomelli/status/2103757371357229129) | opus-5.5 | 未收集 |
| 196 | Motion design animation recreation | [@kaif9998](https://x.com/kaif9998/status/2109923678607876522) | opus-5.5 | 未收集 |
| 197 | GrokBot motion animation | [@0xMovez](https://x.com/0xMovez/status/2106078367833591915) | opus-5.5 | 未收集 |
| 198 | Self-portrait website with piano score and spiral line | [@chetaslua](https://x.com/chetaslua/status/2108902793797091808) | opus-5.5 | 未收集 |
| 199 | Single-prompt AI-generated video | [@akshaymarch7](https://x.com/akshaymarch7/status/2103546306849644678) | opus-5.5 | 未收集 |
| 200 | 30-second showreel as a niche branding agency | [@jacksonfall](https://x.com/jacksonfall/status/2103925420211229164) | opus-5.5 | [待核验](https://x.com/jacksonfall/status/2103925420211229164) |
