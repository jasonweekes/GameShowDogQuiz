---
name: owasp-security-audit
description: Run a full OWASP Top 10:2025 security audit of this codebase. Launches 10 read-only Opus agents in parallel (one per category), then produces a single report of security flaws ranked from Critical to Low with advice on how to fix each. Audit only: nothing is changed. Use when the user asks for a security audit, OWASP review, vulnerability scan or security check.
---

# OWASP Top 10:2025 security audit

This skill produces a **report only**. Do not fix anything, do not edit or create files, and do not run commands that change state. The ten auditor agents are read-only (tools: Read, Grep, Glob) and run on Opus.

## Step 1: Launch all ten agents in parallel

Send **one message containing ten `Agent` tool calls** so they run concurrently. Use these `subagent_type` values:

| # | subagent_type | Category |
| --- | --- | --- |
| A01 | `owasp-a01-broken-access-control` | Broken Access Control |
| A02 | `owasp-a02-security-misconfiguration` | Security Misconfiguration |
| A03 | `owasp-a03-supply-chain-failures` | Software Supply Chain Failures |
| A04 | `owasp-a04-cryptographic-failures` | Cryptographic Failures |
| A05 | `owasp-a05-injection` | Injection |
| A06 | `owasp-a06-insecure-design` | Insecure Design |
| A07 | `owasp-a07-authentication-failures` | Authentication Failures |
| A08 | `owasp-a08-integrity-failures` | Software or Data Integrity Failures |
| A09 | `owasp-a09-logging-alerting-failures` | Security Logging and Alerting Failures |
| A10 | `owasp-a10-exceptional-conditions` | Mishandling of Exceptional Conditions |

Use the same short prompt for each (the agent already knows its category and output format):

> Audit the codebase in the current working directory for your OWASP category. Read-only. Follow your output format exactly and return only that report.

Run them in the foreground and wait for all ten to finish (the report needs every result). If the user gave extra scope (a folder, a branch's changes), append it to the prompt.

## Step 2: Collect and check results

- Note any agent that failed, timed out, or returned something that does not follow the format. Do not silently drop it: list it in the report as "audit incomplete" for that category. Offer to re-run just that agent.
- Do not invent findings. Use only what the agents reported.
- Discard findings with no `file:line` evidence, or mention them separately as "unverified".

## Step 3: Merge, de-duplicate and rank

- If the same flaw (same file and root cause) is reported by several agents, keep **one** entry and list every category that reported it.
- Spot-check any Critical or High finding yourself by reading the cited lines (Read/Grep only). If it is wrong, downgrade or remove it and say so. Keep this to the top findings; do not redo the audit.
- Rank every finding by severity, then by confidence, then by how easy it is to exploit:
  - **Critical**: exploitable now with serious data, money or system impact.
  - **High**: exploitable with real impact.
  - **Medium**: needs conditions, or has limited impact.
  - **Low**: minor issue or hardening.
  - **Info**: observation only (list briefly).
- Re-rate agent severities where they are inconsistent with this scale so the ordering is fair across categories.

## Step 4: Write the report (in chat only)

Use this structure:

1. **Title and verdict:** `OWASP Top 10:2025 Security Audit: Breed Rush`, today's date, and one or two sentences on overall posture.
2. **Summary table:** one row per category (A01 to A10) with status (Flaws found / Clean / Incomplete) and counts per severity, plus a total row.
3. **Findings, ranked High to Low:** grouped under headings Critical, High, Medium, Low, Info (omit empty groups). Number each finding (`#1`, `#2`...) and give:
   - **Title** and category tag(s) (e.g. `A05, A08`)
   - **Where:** clickable `file:line` links
   - **What is wrong:** short evidence
   - **Impact:** what an attacker gains
   - **How to fix:** concrete, specific advice (code-level direction, not a vague "validate input")
   - **Confidence**
4. **Clean categories:** for each category with no flaws, one line on what was checked.
5. **Suggested fix order:** a short numbered list of the first things to do, quick wins first among equal severities.
6. **Limits of this audit:** state that it is a static read of the code by AI agents, that `npm audit` and runtime testing were not run (so A03 is a manual review), and that findings should be verified before acting.
7. **Closing line:** nothing was changed; offer to fix selected findings if the user asks.

Keep the report scannable: no padding, no repeated text between findings. Do not save it to a file unless the user asks.
