# Scoring, Hints and the Leaderboard

This guide explains exactly how points, hints, tie-breaks and the leaderboard work in Breed Rush.

## Points per question

A correct answer is worth **3 points**. A wrong answer, or a question that times out, is worth **0 points**. The maximum score for a team is therefore 3 times the number of questions: 15 points for a 5 question game, 30 for 10 questions, 45 for 15 questions and 60 for 20 questions.

## Hints cost points

Stuck on a dog? Press the Hint button or the H key. A hint is paid for out of the value of that one question, so a score can never go below zero because of a hint.

- **Hint 1 (the slight hint): costs 1 point.** It shows the first letter of the breed, how many words are in the name and how many letters it has. The question is now worth 2 points.
- **Hint 2 (the bigger hint): costs 2 points in total, which is 1 more point.** It keeps the first hint on screen and also removes two of the wrong answers, leaving the right answer and one wrong one. The question is now worth 1 point.

A badge on the photo always shows how much the current question is worth: 3, 2 or 1 points. If you use a hint and still answer wrong, you simply earn 0 for that question. Using a hint always gives a worse result than answering correctly without one, but it is better than answering wrong.

### Example

A team answers a question correctly after using only the first hint. It earns 3 minus 1, which is 2 points. If it had used both hints and been right, it would earn 3 minus 2, which is 1 point.

## How time is counted

Each team's total time is the sum of the time it spent on each question, measured from the moment the photo appears until the answer is chosen. A timed-out question counts as the full 15 seconds. The short pause that shows whether the answer was right, and any time the game is paused, is not counted. The time is only used to break ties.

## Who wins

1. The team with the **most points** wins.
2. If two teams have the same points, the team with the **lower total time** wins.
3. If points and time are both identical, the game is shown as a tie.

## The results screen

The results screen lists each team with its points, how many questions it got right, how many hints it used and its total time. The top three teams stand on an animated podium.

## The leaderboard

Every finished game is saved to a database (Supabase) and the best 20 team results are shown on the Leaderboard page, which you can open from the trophy button in the header. Results are sorted by points, highest first, and ties are sorted by the faster time. Each row shows the team name, correct answers out of the total, hints used and time. The leaderboard keeps results between sessions, so scores are still there when you restart the app.

## Why a score might not be saved

A score is saved only when a game reaches the results screen. If you quit from the pause menu or close the page early, that game is not recorded. If the results screen says "Couldn't save scores", press Retry to try again.
