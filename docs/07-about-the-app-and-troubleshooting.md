# About Breed Rush and Troubleshooting

## What the app is

Breed Rush is a team dog-breed quiz game for one to four teams. It is a Next.js web app. The dog photos come from the free Dog CEO API, the scores are stored in a Supabase Postgres database, and the helper chatbot (Tiffee) searches the documents in the docs folder using a vector database.

## Where the dog photos come from

Each question asks the Dog CEO API (dog.ceo) for a random photo of a chosen breed using the address pattern `https://dog.ceo/api/breed/<breed>/images/random`. The reply contains a link to a picture hosted on images.dog.ceo. The quiz uses a list of about 164 breeds. Breeds with a type, such as Boston Bulldog, are written as two parts in the API address: bulldog and boston. The word "mix" appears in the breed list but is left out of the quiz because it is not one identifiable breed.

## How questions are built

For each game the app picks different breeds at random, one per question, and fetches a photo for each. Every team gets its own set of questions, and no breed or photo is repeated across the whole game, so a later team cannot learn from an earlier team's turn. One extra photo is held back for a tie-breaker. The app then adds three wrong answers to each question. Sometimes the wrong answers are look-alike breeds from the same family, for example other terriers, which makes a question harder. The four answers are shuffled.

## Where scores are stored

Finished games are saved in a Supabase Postgres database in two tables: Game (one row per game) and TeamResult (one row per team, with points, correct answers, hints used and time). The tables are locked down so the public Supabase API cannot read them; only the app can.

## Troubleshooting

- **The photo is slow to appear.** The photos come from a free public service and can take a few seconds. The countdown does not start until the photo has loaded, so you lose no time.
- **The leaderboard is empty.** Scores are only saved when a game reaches the results screen. Finish a whole game and press "See results". If the page says "Scores saved to the leaderboard", the game was recorded.
- **The game says the dogs ran off.** The app could not load enough photos. Press "Try again". This usually means the photo service was briefly unreachable.
- **I switched tabs and the game paused.** This is on purpose. Switching tabs pauses the clock so nobody loses time or peeks. Press Resume to carry on.
- **There is no sound.** Use the speaker button in the top right to turn sound on. Your choice is remembered by the browser. Browsers only allow sound after you click something on the page.
- **The countdown stays at 15.** The clock waits for the photo to finish loading. Once the picture is visible the clock starts.
- **I closed the page in the middle of a game.** Progress is not saved until the end of the game, so you need to start a new game.

## The helper chatbot

Tiffee, the dog button in the bottom right corner, answers questions about the game rules, scoring and hints, dog breeds, how to tell breeds apart, and basic dog care. It looks up the best matching passages from the project documents using a vector database and answers from them. Tiffee is hidden during a live question so it cannot be used to cheat; you can use it on the setup, results and leaderboard pages. Tiffee is not a vet, so for health worries about a real dog always ask a veterinarian. If you ask Tiffee for something outside his job, such as homework, maths, essays or coding, he will not do it. Instead he kindly says so and suggests a dog breed that would make a comforting companion for how you might be feeling, using the companion dogs guide.
