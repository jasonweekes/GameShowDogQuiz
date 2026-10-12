# Breed Rush – the ultimate dog showdown

A team dog-breed quiz game. Teams take turns guessing the breed from a photo before a 15 second countdown runs out, using hints (that cost points) if they get stuck. Scores are saved to a leaderboard, and a helper chatbot called **Tiffee** answers questions about the game and dogs.

- **1–4 teams**, 5 / 10 / 15 / 20 questions, live scoreboard, pause button, keyboard shortcuts
- **164 breeds** with photos from the [Dog CEO API](https://dog.ceo/dog-api/)
- **Leaderboard** stored in Supabase Postgres
- **Tiffee** the chatbot: answers from 8 documents in `docs/`, stored in a Supabase pgvector database, written by the Claude API

Built with Next.js 16 (App Router), Tailwind CSS, Prisma and Supabase.

> **This is a server app, so it cannot run on GitHub Pages.** GitHub Pages only hosts static files (HTML, CSS, JavaScript). Breed Rush needs a server for the quiz questions, the leaderboard database and the chatbot. Deploy it to a host that runs Next.js, such as [Vercel](https://vercel.com), or run it locally.

## Run it locally

```bash
npm install
cp .env.example .env     # then fill in the values (see below)
npx prisma migrate deploy
npm run ingest           # loads docs/ into the chatbot's vector database
npm run dev              # http://localhost:3000
```

Environment variables (`.env`, never committed):

| Variable | What it is |
| --- | --- |
| `DATABASE_URL` | Supabase **transaction pooler** string (port 6543). Used by the running app. |
| `DIRECT_URL` | Supabase **session pooler** string (port 5432). Used by Prisma migrations. |
| `ANTHROPIC_API_KEY` | Lets Tiffee write answers with Claude. Optional: without it Tiffee shows the best matching passages. |
| `VOYAGE_API_KEY` | Voyage AI key for Tiffee's document search (embeddings). Needed for `npm run ingest` and the chatbot. Accounts without a payment method are limited to 3 requests a minute. |
| `CHAT_MODEL` | Optional. Claude model for Tiffee (default `claude-opus-5-5`). |

Use the Supabase **pooler** hosts (`aws-0-<region>.pooler.supabase.com`); the direct `db.<ref>.supabase.co` host is IPv6-only and fails on many networks.

## Project guide

`CLAUDE.md` documents the game rules, the full breed list, the database, and how the chatbot works. The chatbot's documents live in `docs/`; run `npm run ingest` after editing them.

`DogPics/` holds the saved Dog CEO demo page that the original breed list came from. It is reference material and is not part of the app.
