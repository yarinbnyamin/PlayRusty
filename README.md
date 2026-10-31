# PlayRusty 🦀

**Learn Rust by playing.** PlayRusty is a free browser game that teaches Rust from zero, following the
same path as [rustlings](https://github.com/rust-lang/rustlings): sail an archipelago with Ferris the crab,
learn one concept per island, solve puzzles, and defeat each island's boss by fixing real Rust code that's
compiled by the real Rust compiler.

**Play it:** https://yarinbnyamin.github.io/PlayRusty/

> 🙏 **Built on rustlings.** PlayRusty is a gamified take on
> [rustlings](https://github.com/rust-lang/rustlings), the Rust community's small exercises for learning to
> read and write Rust. Its curriculum, topic order and exercise style are the backbone of this game. All
> credit for that path goes to the rustlings team and contributors. If you enjoy PlayRusty, go star and use
> rustlings too.

## Features

- **Two learner modes.** New to programming? You get the general basics too. Already know another language?
  Skip them and get "Coming from Python/JS/Java/C++" notes instead.
- **Short lessons with runnable examples.** Edit any example and run it on the
  [Rust Playground](https://play.rust-lang.org).
- **Four puzzle types:** fill the gap, pick the fix, predict the output, spot the bug.
- **Boss fights on the real compiler.** Beat each boss one round at a time: hidden `#[test]`s land the hits, failed tests cost hearts, and you read real compiler errors to win.
- **XP, stars and badges**, saved in your browser. No account needed.
- **Skip ahead like Duolingo.** Already know a topic? Fight the island's boss straight away, or jump to a
  locked island by beating its boss. Lessons you skip stay open for XP and stars.
- **Copyright-free soundtrack.** Calm music on the map and a tenser theme in boss fights, synthesised live
  in your browser with Web Audio. Mute with ♪ or set the volume in Settings.

Islands 1–3 (Variables, Functions, If) are playable now; the rest of the rustlings topics are on the map
as "coming soon".

## Development

You need Node 22.4+ (24 recommended) and, for checking Rust content, a Rust toolchain with `cargo`.

```bash
npm install
npm run dev          # http://localhost:5173/PlayRusty/
npm test             # unit + content tests
npm run verify:rust  # compiles every boss and runnable example with cargo
npm run build        # static site in dist/
```

## Adding an island

1. Create `src/content/islands/NN-topic.ts` exporting an `Island`. Copy an existing island for the shape.
   Use the `rs` template tag for Rust code, and don't put backticks inside `rs` templates.
2. Add it to `islands` in `src/content/index.ts`. It disappears from the "coming soon" list automatically.
3. Follow the teaching rule: never use a concept in a puzzle or boss before a tutorial page teaches it.
   Give every stage pages for both modes (`all`, or both `beginner` and `experienced`).
4. Every boss needs 3–6 `rounds`. Each round needs a `title`, a `task`, a `starter` (must fail its tests), a `solution` (must pass), `tests` and one `hint`. Every starter and solution is a complete program with `fn main`.
5. Run `npm test` and `npm run verify:rust` before opening a pull request.

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, verifies the Rust content, builds,
and publishes to GitHub Pages. In the repository's **Settings → Pages**, set **Source** to
**GitHub Actions** once. The repository must be named `PlayRusty` to match the Vite `base`.

## How this was built

PlayRusty was built with [Claude Code](https://claude.com/claude-code) in one session over October 30–31, 2026.
**Claude Opus 5.5** led the work: it designed the game with the author, wrote the spec and plans, and
reviewed every task. **Claude Sonnet 5.5** sub-agents wrote the code, one task at a time. Opus reviewed
each task before the next one started, then reviewed the whole branch at the end.

| | |
|---|---|
| Active build time | about 2.7 hours (13 hours wall clock, including breaks) |
| Output tokens | about 834,000 in total |
| Claude Opus 5.5 (lead and reviewer) | about 587,000 output tokens |
| Claude Sonnet 5.5 (sub-agent implementers) | about 247,000 output tokens |

Active time counts only stretches with no gap over 15 minutes. The token counts come from the session
transcripts and cover the original game plus the skip-ahead and soundtrack features.

## Credits

- Curriculum: [rustlings](https://github.com/rust-lang/rustlings) by the rustlings team and contributors
  (MIT). PlayRusty follows its topics in the same order and turns them into islands, puzzles and bosses.
- Compiler: the official [Rust Playground](https://play.rust-lang.org).
- Ferris the crab is the unofficial Rust mascot, released into the public domain by Karen Rustad Tölva.
  PlayRusty's Ferris is an original drawing in that spirit.

## License

[MIT](LICENSE)
