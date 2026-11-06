# Notes

Each `.md` file here becomes a page at `/notes/<file-name>.html` and a card in the **Notes** section of the home page. The section and its nav link only appear once at least one note is published.

```markdown
---
title: How I evaluate my RAG pipeline
date: 2026-11-06
summary: One sentence for the card on the home page.
draft: true
---

Write the note in Markdown: ## headings, paragraphs, - lists, 1. lists,
> quotes, ``` code fences, `code`, **bold**, *italic* and [links](https://example.com).
```

- `draft: true` keeps a note off the site. Delete the line (or set it to `false`) to publish.
- Preview drafts locally with `NOTES_DRAFTS=1 npm run dev`.
- Files starting with `_` and this README are ignored.
