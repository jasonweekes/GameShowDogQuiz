# docs/ – the chatbot's knowledge base

These eight markdown files are the documents that the chatbot (Tiffee) answers from. They are split into passages, turned into vectors and stored in the Supabase vector database by `npm run ingest`.

| File | What it covers |
| --- | --- |
| `01-how-to-play.md` | Setup wizard, turns, timer, pause, keyboard shortcuts |
| `02-scoring-and-hints.md` | Points, hint costs, tie-breaks, leaderboard |
| `03-breed-groups.md` | The seven breed groups and example breeds |
| `04-breed-spotting-tips.md` | Ears, tails, coats and look-alike breeds |
| `05-dog-care-basics.md` | Feeding, exercise, grooming, vet care |
| `06-dog-training-and-behavior.md` | Reward-based training and body language |
| `07-about-the-app-and-troubleshooting.md` | How the app works and common problems |
| `08-companion-dogs.md` | Which breeds make good companions for different moods; Tiffee uses it when a question is off-topic |

After editing or adding a file here, run `npm run ingest` again. This README itself is not ingested.
