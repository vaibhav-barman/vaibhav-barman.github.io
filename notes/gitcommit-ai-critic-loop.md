---
title: Making an LLM commit assistant check its own work
date: 2026-11-06
summary: How GitCommit AI pairs deterministic rules with an LLM faithfulness check, and why it refuses to commit when anything changes.
draft: true
---

> Draft written from the project README. Rewrite it in your own words, add what you learned, then delete `draft: true` to publish.

Most commit-message tools send the diff to a model and print whatever comes back. GitCommit AI treats the first draft as a proposal that has to pass review.

## The pipeline

1. A **diff analyst** (LLM) reads the staged diff and recent history.
2. **Context retrieval** is deterministic: it detects the repository's convention (Conventional Commits with or without scope, gitmoji, `[BRACKET]` prefixes or plain) and picks past commits as examples, scored on scope, path, change type and keyword overlap with recency decay.
3. A **generator** (LLM) drafts the message in that style.
4. A **critic** checks the draft: deterministic rules first, then an LLM faithfulness check against the diff. A rejected draft goes back to the generator until it passes or the round cap is reached.
5. You confirm, and a **staleness check** refuses to commit if the staged tree or `HEAD` changed while it was working.

## Why deterministic code does most of the work

Everything the agents consume comes from deterministic code, and LLM calls happen in one package only. That keeps the expensive, unpredictable part small and makes the rest testable without a network.

## Measuring it

The evaluation harness replays a repository's last N commits through the full graph, using only the history older than each commit, and scores the result against the real message: convention, subject length, imperative mood, capitalization, punctuation, scope, and critic findings before and after reflection. It has an offline mode that needs no API key.

## What I'd do next

- Publish live evaluation results across providers.
- (Add your own lessons here.)
