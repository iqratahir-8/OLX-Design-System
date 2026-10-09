# Working on this repo

This is the OLX Pakistan design system. Read `PROGRESS.md` first: it has the current
status, open work, how to run things and the pitfalls already hit. Use the
`olx-design-system` skill (`.claude/skills/olx-design-system/SKILL.md`) for any OLX design
or front-end work.

## Keep PROGRESS.md as the log

With every change you commit, in the same commit or PR:

1. **Add an entry at the top of the change log** in `PROGRESS.md`. Put it under today's date, newest first, and write:
   - what changed and why, in plain words;
   - the PR (`iqratahir-8/OLX-Design-System#N`), once it exists.
2. **Update the sections above the log** if the change affects them:
   - "What is done";
   - "What is not done";
   - counts and sizes;
   - links;
   - "Moving to another account";
   - "Gotchas learned the hard way" (add anything that cost time to work out).
3. **Change the "Status as of" date** at the top.

Don't leave a change out of the log because it's small. The log is how the next session, or the next account, knows what happened.

## Other rules

- **Font.** Geomanist only, in Regular (400), Book (500) and Medium (600). Never Geomanist Bold or Thin.
- **Generated files.** After changing tokens, CSS or captures, re-run `npm run build` (tokens) and `npm run manifest` (`design-system.json`). Keep `storybook/tokens`, `storybook/css` and `storybook/fonts` in sync with the root copies.
- **Shared branch.** Fetch before pushing; the Mac session and cloud sessions share branches. Never force-push over someone else's commits.
