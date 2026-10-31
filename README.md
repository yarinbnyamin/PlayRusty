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
- **Boss fights on the real compiler.** Hidden `#[test]`s hit the boss; read real compiler errors to win.
- **XP, stars and badges**, saved in your browser. No account needed.

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
4. Every boss needs `starter` (must fail its tests), `solution` (must pass), `tests` and 1–3 `hints`.
5. Run `npm test` and `npm run verify:rust` before opening a pull request.

## Deploying

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, verifies the Rust content, builds,
and publishes to GitHub Pages. In the repository's **Settings → Pages**, set **Source** to
**GitHub Actions** once. The repository must be named `PlayRusty` to match the Vite `base`.

## Credits

- Curriculum: [rustlings](https://github.com/rust-lang/rustlings) by the rustlings team and contributors
  (MIT). PlayRusty follows its topics in the same order and turns them into islands, puzzles and bosses.
- Compiler: the official [Rust Playground](https://play.rust-lang.org).
- Ferris the crab is the unofficial Rust mascot, released into the public domain by Karen Rustad Tölva.
  PlayRusty's Ferris is an original drawing in that spirit.

## License

[MIT](LICENSE)
