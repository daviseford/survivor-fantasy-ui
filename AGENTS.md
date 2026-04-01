# Agent Instructions

See `CLAUDE.md` for the repository instructions and workflow guidance.

Additional rules for Codex:

- Never commit directly to `main`.
- Always create a feature branch before committing.
- Never open a PR from `main`.
- Before any commit, run `git branch --show-current` and confirm it is not `main`.
- If already on `main`, create a new branch first and continue there.
- If a commit is accidentally made on `main`, stop and ask before rewriting history.
