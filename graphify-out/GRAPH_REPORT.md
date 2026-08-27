# Graph Report - sites  (2026-08-27)

## Corpus Check
- 22 files · ~1,293,751 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 224 nodes · 372 edges · 22 communities (16 shown, 6 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `fc18e340`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- app.js
- vetra.js
- renderGym
- apex-structure/js/script.js
- Библиотека стилей по нишам (пополняется референсами Михаила)
- landing-draft — черновой лендинг для холодного лида
- Проверка базы лидов v2 (2GIS + Яндекс.Карты) — 2026-07-14
- server.js
- exercises.js
- figure.js
- style.md — паспорт стиля: портфолио Суюхана
- swipeDeck
- build.js
- Что прислать, чтобы сайт стал настоящим
- plan.js
- portfolio/js/script.js
- body.js
- leads-status.md
- README.md
- niche-insights.md
- taste/README.md

## God Nodes (most connected - your core abstractions)
1. `init()` - 15 edges
2. `boot()` - 15 edges
3. `haptic()` - 13 edges
4. `renderGym()` - 11 edges
5. `landing-draft — черновой лендинг для холодного лида` - 11 edges
6. `Библиотека стилей по нишам (пополняется референсами Михаила)` - 11 edges
7. `fromKey()` - 10 edges
8. `renderMe()` - 10 edges
9. `openExercise()` - 10 edges
10. `renderDay()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `shiftDay()` --calls--> `dayKey()`  [EXTRACTED]
  trener/app/js/app.js → trener/app/js/app.js  _Bridges community 2 → community 0_
- `boot()` --calls--> `swipeDeck()`  [EXTRACTED]
  vetra/maket/js/vetra.js → vetra/maket/js/vetra.js  _Bridges community 11 → community 1_

## Import Cycles
- None detected.

## Communities (22 total, 6 thin omitted)

### Community 0 - "app.js"
Cohesion: 0.08
Nodes (53): addMeal(), allDishes(), askDish(), askMeal(), askPortion(), askSet(), askWeight(), BASE_DISHES (+45 more)

### Community 1 - "vetra.js"
Cohesion: 0.11
Nodes (28): accordion(), bands(), boot(), calc(), fmt(), update(), channelPeek(), checkVisible() (+20 more)

### Community 2 - "renderGym"
Cohesion: 0.20
Nodes (19): bestBefore(), dayKey(), fromKey(), isPlannedDay(), loadGym(), loadGymHistory(), migrateGym(), niceDate() (+11 more)

### Community 3 - "apex-structure/js/script.js"
Cohesion: 0.29
Nodes (9): animateCount(), tick(), apply(), calcTotal(), fmt(), loop(), maxOffset(), renderPrice() (+1 more)

### Community 4 - "Библиотека стилей по нишам (пополняется референсами Михаила)"
Cohesion: 0.17
Nodes (11): Банкетный зал / свадьбы (Астория, Золотой ключ, Давыл, Varis), Библиотека стилей по нишам (пополняется референсами Михаила), Бургерная / гастробар / пиво, Коктейль-бар / ночное (Zero, Галәм, Брежнев), Национальная кухня: чайхана, узбекская, кавказская (Ак пиала, Бахор, Абшерон, Арба), Премиум (Каба, Pera), Референсы от Михаила, Семейный ресторан / европейская кухня (+3 more)

### Community 5 - "landing-draft — черновой лендинг для холодного лида"
Cohesion: 0.17
Nodes (11): landing-draft — черновой лендинг для холодного лида, SEO-минимум, Выход для Михаила, Железные правила, Какие данные брать из строки CSV, Контекст бизнеса, Обязательная проверка лида ПЕРЕД генерацией, Публикация (+3 more)

### Community 6 - "Проверка базы лидов v2 (2GIS + Яндекс.Карты) — 2026-07-14"
Cohesion: 0.25
Nodes (7): ЗАКРЫТЫ (по Яндексу) — 1, ЗВОНИТЬ С ПОДГОТОВКОЙ: есть псевдосайт (clients.site / obiz / мессенджер) — 5, ЗВОНИТЬ: сайта нет нигде — 25, Остальные группы из v1 без изменений, Проверка базы лидов v2 (2GIS + Яндекс.Карты) — 2026-07-14, РЕДИЗАЙН — 1, СКИП: настоящий сайт нашёлся на Яндексе — 4

### Community 7 - "server.js"
Cohesion: 0.25
Nodes (6): fs, http, META, MIME, path, SCREENS

### Community 8 - "exercises.js"
Cohesion: 0.29
Nodes (5): animateStick(), apply(), frame(), EXERCISES, STAND

### Community 9 - "figure.js"
Cohesion: 0.29
Nodes (5): animateHuman(), apply(), frame(), SEG, SHAPE

### Community 10 - "style.md — паспорт стиля: портфолио Суюхана"
Cohesion: 0.29
Nodes (6): style.md — паспорт стиля: портфолио Суюхана, Движение, Запрещено, Компоненты, Палитра, Шрифты

### Community 11 - "swipeDeck"
Cohesion: 0.48
Nodes (7): swipeDeck(), fly(), go(), release(), render(), stop(), reset()

### Community 12 - "build.js"
Cohesion: 0.33
Nodes (5): fs, META, path, SCREENS, undescribed

### Community 13 - "Что прислать, чтобы сайт стал настоящим"
Cohesion: 0.40
Nodes (4): 1. Обязательное (без этого сайт нельзя показывать), 2. Сильно добавляет продаж, 3. Решить один раз, Что прислать, чтобы сайт стал настоящим

### Community 15 - "portfolio/js/script.js"
Cohesion: 0.50
Nodes (3): burger, nav, observer

## Knowledge Gaps
- **74 isolated node(s):** `burger`, `nav`, `observer`, `fs`, `path` (+69 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `boot()` connect `vetra.js` to `swipeDeck`?**
  _High betweenness centrality (0.011) - this node is a cross-community bridge._
- **Why does `swipeDeck()` connect `swipeDeck` to `vetra.js`?**
  _High betweenness centrality (0.007) - this node is a cross-community bridge._
- **Why does `typeDemo()` connect `vetra.js` to `swipeDeck`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `init()` (e.g. with `askDish()` and `askWeight()`) actually correct?**
  _`init()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `burger`, `nav`, `observer` to the rest of the system?**
  _74 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `app.js` be split into smaller, more focused modules?**
  _Cohesion score 0.08311688311688312 - nodes in this community are weakly interconnected._
- **Should `vetra.js` be split into smaller, more focused modules?**
  _Cohesion score 0.11491935483870967 - nodes in this community are weakly interconnected._