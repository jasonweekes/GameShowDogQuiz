# Breed Rush (the Dog Quiz)

Team dog-breed quiz game ("Breed Rush: the ultimate dog showdown") built with Next.js (App Router) + Tailwind + Prisma + Supabase (Postgres).
A team sees a dog photo from the [Dog CEO API](https://dog.ceo/dog-api/) and picks the breed from 4 multiple-choice options.

> **Next.js version note:** this is Next.js 16 with `cacheComponents` on. APIs differ from older versions.
> Read `node_modules/next/dist/docs/` before changing routing/data-fetching code (see `AGENTS.md`).

## Commands

```bash
npm run dev                  # dev server on http://localhost:3000
npm run build && npm start   # production build
npm run lint
npm test                     # unit tests (Vitest): leaderboard list, /api/scores route, game ticket
npm run test:watch           # re-run tests on every save
npx prisma migrate deploy    # apply existing migrations to the Supabase database
npx prisma migrate dev       # create a new migration after changing schema.prisma
npx prisma generate          # regenerate client into src/generated/prisma (gitignored)
npx prisma studio            # browse saved scores
npm run ingest               # (re)load docs/ into the chatbot vector database
```

Setup on a fresh clone: `npm install`, copy `.env.example` to `.env` and fill in the Supabase `DATABASE_URL` and `DIRECT_URL` (plus `ANTHROPIC_API_KEY` and `VOYAGE_API_KEY` for the chatbot), then `npx prisma migrate deploy`, `npx prisma generate` and `npm run ingest`.

## Game rules

- Setup is a 3-step wizard: **1) number of questions** (5, 10, 15, 20), **2) number of teams** (1–4), **3) team names** (required, max 20 chars, unique; a "Surprise me" button suggests names).
- Teams **take turns** on one screen, and every team gets its **own questions**: no breed or photo repeats anywhere in the game, so nobody can learn from another team’s turn. One extra photo is held back for the tie-breaker.
- **Scoring:** a correct answer is worth 3 points (`POINTS_PER_QUESTION`). Wrong or timed out = 0.
- **Hints** (button or `H`) are taken out of the question's value, so a hint never makes a score negative:
  - Hint 1 (slight, −1 pt → worth 2): a gentle nudge about the kind of dog (its group: hound, terrier, herding...), never letters or the name. Text comes from `src/data/breedGroups.ts`. Shown as small, quiet text.
  - Hint 2 (bigger, −2 pts total → worth 1): also shows the first letter and crosses out ONE wrong answer.
- **Pause** (button, `P` or `Esc`): stops the clock and hides the photo and choices behind an overlay. Switching browser tabs auto-pauses. Paused time never counts toward a team's time.
- 15 seconds per question. The clock starts when the photo has loaded. Running out counts as wrong (and costs the full 15s).
- A team's total time = sum of its time per question (feedback and paused time are not counted).
- Ranking: most points wins. Teams level on the top score play a **tie-breaker** (`src/components/TieBreaker.tsx`): a fresh photo, a 3-2-1 countdown, then each tied team has a buzzer (tap, or press the team number). The first to buzz answers within 10s: right = wins; wrong or timed out = the next tied team may buzz (the wrong choice is crossed out); nobody right, or nobody buzzes within 20s = the lower total time wins; identical time = a tie. It does not change scores or what is saved to the database. The winner is passed to the results page as `tieBreak` (in `FinishedGame`).
- Keyboard: `A`–`D` or `1`–`4` answer, `H` hint, `P`/`Esc` pause, `Enter`/`Space` continue after an answer.
- Scores are saved to the database when the game ends and shown on `/leaderboard` (top 20).
- **Saving is checked on the server** (`src/app/api/scores/route.ts`): `/api/questions` hands out a signed **game ticket** (`src/lib/gameToken.ts`, HMAC, valid 3 hours) and `/api/scores` only saves results that carry it, for that question count and team count, after at least 1 s per question across all teams. Each team's numbers must also be consistent (`correct` ≤ score ≤ 3 × `correct`, score ≥ 3 × `correct` − hints, hints ≤ 2 per question, time between half a second and 15 s per question). Cross-site posts and non-JSON bodies are refused, and `/api/questions` and `/api/scores` are rate limited per client (30 per 10 minutes). The ticket cannot prove the answers were honest (see "Known limitation" below) and a ticket can be reused until it expires.
- Sound effects (Web Audio) can be muted from the header; the choice is kept in localStorage.

## Dog API reference

- Random image for a breed: `GET https://dog.ceo/api/breed/<breed>/images/random` → `{ "message": "<image url>", "status": "success" }`
- Images are hosted on `images.dog.ceo` (allowed in `next.config.ts`).
- The breed ids below come from the `<select class="dog-selector">` on the saved demo page (`DogPics/Dog API - Demo.html`).
  That page's dropdown is filled by JavaScript, so the saved HTML itself has no options; the list was pasted in by the user.
- **Path rule:** the API nests sub-breeds, so an id with a hyphen must be split on the **first** hyphen:
  `bulldog-boston` → `/breed/bulldog/boston/images/random`, `rough-collie` → `/breed/rough/collie/images/random`.
  Single-word ids stay flat (`affenpinscher`, `mix`). Using the hyphenated id directly returns 404. Implemented in `breedPath()` in `src/lib/dog.ts`.
- `mix` is in the list but is excluded from the quiz (not one identifiable breed).

## Available breeds

Source of truth in code: `src/data/breeds.ts`. Keep this table in sync with it.

165 breeds (id | label | API path):

| id | label | API path |
| --- | --- | --- |
| `affenpinscher` | affenpinscher | `affenpinscher` |
| `african-wild` | wild african | `african/wild` |
| `airedale` | airedale | `airedale` |
| `akita` | akita | `akita` |
| `appenzeller` | appenzeller | `appenzeller` |
| `australian-kelpie` | kelpie australian | `australian/kelpie` |
| `australian-shepherd` | shepherd australian | `australian/shepherd` |
| `bakharwal-indian` | indian bakharwal | `bakharwal/indian` |
| `basenji` | basenji | `basenji` |
| `beagle` | beagle | `beagle` |
| `bluetick` | bluetick | `bluetick` |
| `borzoi` | borzoi | `borzoi` |
| `bouvier` | bouvier | `bouvier` |
| `boxer` | boxer | `boxer` |
| `brabancon` | brabancon | `brabancon` |
| `briard` | briard | `briard` |
| `buhund-norwegian` | norwegian buhund | `buhund/norwegian` |
| `bulldog-boston` | boston bulldog | `bulldog/boston` |
| `bulldog-english` | english bulldog | `bulldog/english` |
| `bulldog-french` | french bulldog | `bulldog/french` |
| `bullterrier-staffordshire` | staffordshire bullterrier | `bullterrier/staffordshire` |
| `cattledog-australian` | australian cattledog | `cattledog/australian` |
| `cavapoo` | cavapoo | `cavapoo` |
| `chihuahua` | chihuahua | `chihuahua` |
| `chippiparai-indian` | indian chippiparai | `chippiparai/indian` |
| `chow` | chow | `chow` |
| `clumber` | clumber | `clumber` |
| `cockapoo` | cockapoo | `cockapoo` |
| `collie-border` | border collie | `collie/border` |
| `coonhound` | coonhound | `coonhound` |
| `corgi-cardigan` | cardigan corgi | `corgi/cardigan` |
| `cotondetulear` | cotondetulear | `cotondetulear` |
| `dachshund` | dachshund | `dachshund` |
| `dalmatian` | dalmatian | `dalmatian` |
| `dane-great` | great dane | `dane/great` |
| `danishswedish-farmdog` | farmdog danishswedish | `danishswedish/farmdog` |
| `deerhound-scottish` | scottish deerhound | `deerhound/scottish` |
| `dhole` | dhole | `dhole` |
| `dingo` | dingo | `dingo` |
| `doberman` | doberman | `doberman` |
| `elkhound-norwegian` | norwegian elkhound | `elkhound/norwegian` |
| `entlebucher` | entlebucher | `entlebucher` |
| `eskimo` | eskimo | `eskimo` |
| `finnish-lapphund` | lapphund finnish | `finnish/lapphund` |
| `frise-bichon` | bichon frise | `frise/bichon` |
| `gaddi-indian` | indian gaddi | `gaddi/indian` |
| `german-shepherd` | shepherd german | `german/shepherd` |
| `greyhound-indian` | indian greyhound | `greyhound/indian` |
| `greyhound-italian` | italian greyhound | `greyhound/italian` |
| `groenendael` | groenendael | `groenendael` |
| `havanese` | havanese | `havanese` |
| `hound-afghan` | afghan hound | `hound/afghan` |
| `hound-basset` | basset hound | `hound/basset` |
| `hound-blood` | blood hound | `hound/blood` |
| `hound-english` | english hound | `hound/english` |
| `hound-ibizan` | ibizan hound | `hound/ibizan` |
| `hound-plott` | plott hound | `hound/plott` |
| `hound-walker` | walker hound | `hound/walker` |
| `husky` | husky | `husky` |
| `keeshond` | keeshond | `keeshond` |
| `kelpie` | kelpie | `kelpie` |
| `kombai` | kombai | `kombai` |
| `komondor` | komondor | `komondor` |
| `kuvasz` | kuvasz | `kuvasz` |
| `labradoodle` | labradoodle | `labradoodle` |
| `labrador` | labrador | `labrador` |
| `leonberg` | leonberg | `leonberg` |
| `lhasa` | lhasa | `lhasa` |
| `malamute` | malamute | `malamute` |
| `malinois` | malinois | `malinois` |
| `maltese` | maltese | `maltese` |
| `mastiff-bull` | bull mastiff | `mastiff/bull` |
| `mastiff-english` | english mastiff | `mastiff/english` |
| `mastiff-indian` | indian mastiff | `mastiff/indian` |
| `mastiff-tibetan` | tibetan mastiff | `mastiff/tibetan` |
| `mexicanhairless` | mexicanhairless | `mexicanhairless` |
| `mix` | mix | `mix` |
| `mountain-bernese` | bernese mountain | `mountain/bernese` |
| `mountain-swiss` | swiss mountain | `mountain/swiss` |
| `mudhol-indian` | indian mudhol | `mudhol/indian` |
| `newfoundland` | newfoundland | `newfoundland` |
| `otterhound` | otterhound | `otterhound` |
| `ovcharka-caucasian` | caucasian ovcharka | `ovcharka/caucasian` |
| `papillon` | papillon | `papillon` |
| `pariah-indian` | indian pariah | `pariah/indian` |
| `pekinese` | pekinese | `pekinese` |
| `pembroke` | pembroke | `pembroke` |
| `pinscher-miniature` | miniature pinscher | `pinscher/miniature` |
| `pitbull` | pitbull | `pitbull` |
| `pointer-german` | german pointer | `pointer/german` |
| `pointer-germanlonghair` | germanlonghair pointer | `pointer/germanlonghair` |
| `pomeranian` | pomeranian | `pomeranian` |
| `poodle-medium` | medium poodle | `poodle/medium` |
| `poodle-miniature` | miniature poodle | `poodle/miniature` |
| `poodle-standard` | standard poodle | `poodle/standard` |
| `poodle-toy` | toy poodle | `poodle/toy` |
| `pug` | pug | `pug` |
| `puggle` | puggle | `puggle` |
| `pyrenees` | pyrenees | `pyrenees` |
| `rajapalayam-indian` | indian rajapalayam | `rajapalayam/indian` |
| `redbone` | redbone | `redbone` |
| `retriever-chesapeake` | chesapeake retriever | `retriever/chesapeake` |
| `retriever-curly` | curly retriever | `retriever/curly` |
| `retriever-flatcoated` | flatcoated retriever | `retriever/flatcoated` |
| `retriever-golden` | golden retriever | `retriever/golden` |
| `ridgeback-rhodesian` | rhodesian ridgeback | `ridgeback/rhodesian` |
| `rottweiler` | rottweiler | `rottweiler` |
| `rough-collie` | collie rough | `rough/collie` |
| `saluki` | saluki | `saluki` |
| `samoyed` | samoyed | `samoyed` |
| `schipperke` | schipperke | `schipperke` |
| `schnauzer-giant` | giant schnauzer | `schnauzer/giant` |
| `schnauzer-miniature` | miniature schnauzer | `schnauzer/miniature` |
| `segugio-italian` | italian segugio | `segugio/italian` |
| `setter-english` | english setter | `setter/english` |
| `setter-gordon` | gordon setter | `setter/gordon` |
| `setter-irish` | irish setter | `setter/irish` |
| `sharpei` | sharpei | `sharpei` |
| `sheepdog-english` | english sheepdog | `sheepdog/english` |
| `sheepdog-indian` | indian sheepdog | `sheepdog/indian` |
| `sheepdog-shetland` | shetland sheepdog | `sheepdog/shetland` |
| `shiba` | shiba | `shiba` |
| `shihtzu` | shihtzu | `shihtzu` |
| `spaniel-blenheim` | blenheim spaniel | `spaniel/blenheim` |
| `spaniel-brittany` | brittany spaniel | `spaniel/brittany` |
| `spaniel-cocker` | cocker spaniel | `spaniel/cocker` |
| `spaniel-irish` | irish spaniel | `spaniel/irish` |
| `spaniel-japanese` | japanese spaniel | `spaniel/japanese` |
| `spaniel-sussex` | sussex spaniel | `spaniel/sussex` |
| `spaniel-welsh` | welsh spaniel | `spaniel/welsh` |
| `spitz-indian` | indian spitz | `spitz/indian` |
| `spitz-japanese` | japanese spitz | `spitz/japanese` |
| `springer-english` | english springer | `springer/english` |
| `stbernard` | stbernard | `stbernard` |
| `terrier-american` | american terrier | `terrier/american` |
| `terrier-andalusian` | andalusian terrier | `terrier/andalusian` |
| `terrier-australian` | australian terrier | `terrier/australian` |
| `terrier-bedlington` | bedlington terrier | `terrier/bedlington` |
| `terrier-border` | border terrier | `terrier/border` |
| `terrier-boston` | boston terrier | `terrier/boston` |
| `terrier-cairn` | cairn terrier | `terrier/cairn` |
| `terrier-dandie` | dandie terrier | `terrier/dandie` |
| `terrier-fox` | fox terrier | `terrier/fox` |
| `terrier-irish` | irish terrier | `terrier/irish` |
| `terrier-kerryblue` | kerryblue terrier | `terrier/kerryblue` |
| `terrier-lakeland` | lakeland terrier | `terrier/lakeland` |
| `terrier-norfolk` | norfolk terrier | `terrier/norfolk` |
| `terrier-norwich` | norwich terrier | `terrier/norwich` |
| `terrier-patterdale` | patterdale terrier | `terrier/patterdale` |
| `terrier-russell` | russell terrier | `terrier/russell` |
| `terrier-scottish` | scottish terrier | `terrier/scottish` |
| `terrier-sealyham` | sealyham terrier | `terrier/sealyham` |
| `terrier-silky` | silky terrier | `terrier/silky` |
| `terrier-tibetan` | tibetan terrier | `terrier/tibetan` |
| `terrier-toy` | toy terrier | `terrier/toy` |
| `terrier-welsh` | welsh terrier | `terrier/welsh` |
| `terrier-westhighland` | westhighland terrier | `terrier/westhighland` |
| `terrier-wheaten` | wheaten terrier | `terrier/wheaten` |
| `terrier-yorkshire` | yorkshire terrier | `terrier/yorkshire` |
| `tervuren` | tervuren | `tervuren` |
| `vizsla` | vizsla | `vizsla` |
| `waterdog-spanish` | spanish waterdog | `waterdog/spanish` |
| `weimaraner` | weimaraner | `weimaraner` |
| `whippet` | whippet | `whippet` |
| `wolfhound-irish` | irish wolfhound | `wolfhound/irish` |

## Code map

- `src/data/breeds.ts` – breed list, `QUIZ_BREEDS`, `breedLabel()`
- `src/lib/dog.ts` – `breedPath()`, `getRandomImage()`
- `src/lib/quiz.ts` – `buildQuiz(count, teams)`: a separate question set per team plus one spare tie-breaker question; every answer breed and photo is distinct across the whole quiz. Each question gets 3 distractors (sometimes look-alikes sharing the first word, e.g. other terriers). Photos are fetched with 10 requests in flight and spare candidates cover failed ones.
- `src/lib/types.ts` – shared constants (`MAX_TEAMS`, `QUESTION_COUNTS`, `SECONDS_PER_QUESTION`, `POINTS_PER_QUESTION`, `HINT_COSTS`) and types
- `src/lib/sfx.ts` (synth sounds + mute), `src/lib/confetti.ts` (canvas confetti), `src/lib/teams.ts` (team colours, name ideas)
- `src/lib/session.ts` – sessionStorage hand-off between setup → play → results
- `src/lib/prisma.ts` – Prisma client (Postgres via `@prisma/adapter-pg`, connects with `DATABASE_URL`)
- `src/app/api/questions/route.ts` – `GET ?count=N&teams=T` → `{ sets: Question[][], tiebreak: Question | null, token: string | null }` (no tie-breaker question for a solo game; `token` is the game ticket)
- `src/app/api/scores/route.ts` – `POST` saves a game's team results (needs the ticket, see Game rules), `GET` leaderboard
- `src/components/ScoreList.tsx` – the leaderboard table (medals, stats line, empty state); `src/app/leaderboard/page.tsx` only fetches the top 20 and passes them in
- Tests live next to the code as `*.test.ts(x)` and run with `npm test` (`vitest.config.mts`): `ScoreList.test.tsx`, `src/app/api/scores/route.test.ts` (database replaced by spies), `src/lib/gameToken.test.ts`. They need no database, network or API keys.
- `src/lib/ratelimit.ts` – `clientKey()` (trusted client address) and `createRateLimiter()` (in-memory, size-capped), used by all three API routes
- `src/lib/gameToken.ts` – `issueGameToken()` / `verifyGameToken()`, signed with `GAME_TOKEN_SECRET` or, if unset, a key derived from `DATABASE_URL`
- `src/components/Setup.tsx` (wizard), `Play.tsx` (timer, pause, hints, keyboard), `TieBreaker.tsx` (buzzer round), `TimerRing.tsx`, `Results.tsx` (podium), `SoundToggle.tsx` – the game screens
- `src/data/breedGroups.ts` – each breed’s group and the gentle hint text per group
- `src/app/leaderboard/page.tsx` – server component reading the DB
- `src/app/globals.css` – light theme (white base, orange + blue complements): design tokens, `.glass`, `.btn*`, `.choice`, `.answer`, animations. Display font is Fredoka (`font-display`), chosen because Bungee made "15s" look like "155".

Known limitation: `/api/questions` returns the correct answer to the browser, so a determined player could cheat. Fine for a classroom game.

## Database (Prisma + Supabase Postgres)

- Two connection strings in `.env` (never commit it; `.env.example` shows the shape):
  - `DATABASE_URL` – transaction pooler, port **6543**, `?pgbouncer=true`. Used by the running app (`src/lib/prisma.ts`).
  - `DIRECT_URL` – session pooler, port **5432**. Used by the Prisma CLI (`prisma.config.ts`) for migrations and Studio.
- Use the **pooler** hosts (`aws-0-<region>.pooler.supabase.com`, user `postgres.<project-ref>`). The direct `db.<ref>.supabase.co` host is IPv6-only and does not resolve on many networks.
- Migrations live in `prisma/migrations/`. They are applied with `npx prisma migrate deploy` (it needs no shadow database, which Supabase doesn't allow). Both app tables and `_prisma_migrations` have **Row Level Security enabled with no policies**, so Supabase's public REST/anon API can't read or write them; Prisma connects as the owner (`postgres`), which bypasses RLS.
- A changed password in `.env` can take a few minutes to start working on the 6543 pooler.
- Models:
- `Game { id, questionCount, createdAt, results[] }`
- `TeamResult { id, gameId, teamName, score (points), total (max points = questions × 3), correct, hintsUsed, timeSeconds, createdAt }`

## Chatbot: Tiffee (built)

A dog button in the bottom-right corner opens a chat panel. Hovering the button makes the cartoon dog run (legs, tail, ears and speed lines animate); it also runs while Tiffee is thinking. Tiffee is hidden on `/play` so she can't be used to look up answers during a live question.

**How it works (retrieval-augmented generation):**

1. **Documents:** the 8 markdown files in `docs/` (see `docs/README.md`; the README itself is not ingested).
2. **Ingest:** `npm run ingest` (`scripts/ingest.ts`) splits each file at its `##` headings into passages of at most ~900 characters (`src/lib/chunking.ts`), embeds them with Voyage AI and stores them in Supabase. Re-run it after editing any document. It replaces the whole table, so deleted documents disappear too.
3. **Vector database:** Supabase Postgres + **pgvector**, table `DocChunk` (`embedding vector(512)`, HNSW cosine index, RLS on). Prisma can't read or write the vector column, so `src/lib/vector.ts` uses raw SQL through `pg`. The Prisma model exists only so migrations stay in sync; don't use `prisma.docChunk`.
4. **Embeddings:** `src/lib/embeddings.ts` calls the Voyage AI REST API (`voyage-4-lite`, 512 dimensions; `input_type` is `"document"` for stored passages and `"query"` for questions). Needs `VOYAGE_API_KEY`. It retries on 429/5xx; ingest waits it out, while chat queries try only twice so a player is not kept waiting. **Voyage free accounts without a payment method are limited to 3 requests and 10K tokens a minute**, which means about 3 chat questions a minute and a slow ingest; add a payment method in the Voyage dashboard to lift it (the free token allowance still applies). Vectors from different models cannot be compared, so changing the model or dimensions needs a migration that resizes the column plus a fresh `npm run ingest`.
5. **Chat API:** `POST /api/chat` (`src/app/api/chat/route.ts`) embeds the question once and searches the vector database twice: the 4 closest passages across all documents, and the whole companion-dogs guide (`08-companion-dogs.md`, ranked). Passages scoring at least 0.25 (cosine similarity) go to Claude as reference; a question counts as **on-topic** only if its best passage scores at least 0.34 (measured with Voyage: real questions 0.36 and up, off-topic ones up to 0.31). Re-measure these cutoffs if the embedding model changes.
   - **On-topic** (game, breeds, dog care, training, choosing a dog): Claude answers from the passages only, in a few short sentences, streamed back as plain text.
   - **Off-topic** (homework, maths, essays, code, weather, jokes...): Tiffee does **not** do the task. She says it is outside her job, shows a line of empathy, and recommends one or two breeds from the companion guide that suit the person's situation (calm study buddy for stress, a clown for boredom, a cuddly giant for loneliness...), then invites them back to the game or dogs. The prompt also tells her to switch to a warm, serious reply pointing to a trusted adult or helpline if someone shows real distress.
   - Plain game or breed questions do not get dog recommendations (the companion guide is only sent for off-topic or choosing-a-dog questions).
   - **No API key, or Claude errors:** Tiffee replies from the best passages herself; off-topic questions get the best-matching companion passage, or the all-round pick if nothing matches.
   The passages used are returned in the `x-sources` header. `GET /api/chat` reports whether the AI is configured.
6. **UI:** `src/components/ChatWidget.tsx` (panel, streaming, suggestion chips, source chips) and `src/components/DogRunner.tsx` (the SVG dog). Dog animation CSS is under "Tiffee the dog" in `globals.css`.

**Claude settings:** model is `claude-haiku-5-5` by default (the cheapest; this endpoint is public and has no login); set `CHAT_MODEL` in `.env` to change it (`claude-opus-5-5` answers better but costs about 40 times as much). Effort is `low` and replies are capped at 1024 output tokens (thinking counts toward that cap; if it eats the whole cap, Tiffee answers from the passages). The server-side refusal fallback (`fallbacks: "default"`) is sent only for models that support it: Haiku has none. Claude only sees the top 5 companion passages plus the all-round pick. Limits: 20 questions a minute per client (`src/lib/ratelimit.ts`, which counts the address your host adds, not the first `x-forwarded-for` value the caller can write), and at most `CHAT_DAILY_LIMIT` (default 1500) Claude answers a day per server instance, after which Tiffee answers from the passages. Both are in memory, so on serverless also set spend limits in the Anthropic console.

**Deploying:** the embeddings are an HTTP API call, so Tiffee works on serverless hosts such as Vercel (set `DATABASE_URL`, `DIRECT_URL`, `ANTHROPIC_API_KEY` and `VOYAGE_API_KEY` in the host's environment settings). The in-memory rate limit in `/api/chat` is per server instance, so on serverless it is only a loose guard. GitHub Pages cannot host this app (static files only).
