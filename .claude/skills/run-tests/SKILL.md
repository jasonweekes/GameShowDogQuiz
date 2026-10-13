---
name: run-tests
description: Run the Breed Rush automated unit test suite (Vitest) and report the results. Use when the user asks to run the tests, check that nothing broke, verify a change, or says "run the test suite". Accepts an optional file or test-name filter. Runs and reports only; it does not edit code.
allowed-tools: Bash(npm test:*), Bash(npm run test:*), Read, Grep, Glob
---

# Run the test suite

Runs the project's unit tests (Vitest, `npm test`) and reports what passed and what failed. It does not change any code.

## Step 1: Run the tests

From the project root (the folder containing `package.json`), run:

```bash
npm test
```

If the user gave a filter, such as a file name, a folder or part of a test name (`/run-tests ScoreList`, `/run-tests scores route`), pass it after `--`:

```bash
npm test -- ScoreList
```

Notes:
- The tests need no database, network, dev server or API keys, so there is nothing to start first.
- If it fails because `vitest` is not found or `node_modules` is missing, tell the user to run `npm install` (it also runs `prisma generate`) and stop. Do not install anything yourself.
- Never use `test:watch`; it never exits.
- Ignore the `npm notice` lines about a newer npm version. They are not a problem with the tests.

## Step 2: Report the result

Start with a one-line verdict, for example: **All 108 tests passed (3 files, about 1 s).** or **3 of 108 tests failed.**

If everything passed, add a one-line list of what the suite covers (leaderboard table, `/api/scores` route, game ticket), taken from the files that ran. Then stop.

If anything failed, for each failing test give:
- the test name and its file, as a clickable link, for example [route.test.ts:120](src/app/api/scores/route.test.ts:120)
- what was expected and what actually happened (one or two lines from the output)
- a short, plain-language guess at the cause, after reading the test and the code it exercises with Read/Grep. Say whether it looks like a bug in the code or an outdated test, and how sure you are.

Also report:
- tests that were skipped, and any "no test files found" message (the filter probably matched nothing, so say which filter you used)
- errors that stop a file from loading at all (import or syntax errors), which show up as a failed file instead of failed tests

## Rules

- Run and report only. Do not edit code, tests or config, and do not "fix" a failing test to make it pass. End a failure report by offering to fix the cause if the user wants.
- Do not claim the app works because the unit tests pass. Say what the tests cover, and mention it if a change touches something the suite does not test (for example the chat route, the quiz builder or the game screens).
- Do not retry a failing run hoping it passes. If a failure looks flaky, say so and rerun once with the same filter to confirm.
