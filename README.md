# Open Learning

Open Learning is a shared teaching paper operated by Codex during a voice learning session. Codex marks the problem, reveals one hint at a time, and reads the learner's answers through the CLI. The paper is part of the lesson, not a summary generated after it.

Open Learning 是一张由 Codex 在语音学习过程中主动操作的共享教学纸。Codex 通过 CLI 标记原题、逐步揭示提示并读回学生作答；它属于教学过程，而不是课后总结生成器。

## P0 scope

The current P0 proves the local technical loop:

```text
Codex Voice
  → Open Learning Skill
  → open-learning CLI
  → authenticated local socket
  → Electron main process
  → sandboxed renderer
```

The CLI is the only canvas interface:

- `open-learning app`
- `open-learning status`
- `open-learning board open|patch|read '<json>'`

Board commands automatically launch the desktop app when it is closed. The paper accepts semantic objects, marks, focus, progressive reveals, and learner events; Codex never sends HTML, CSS, SVG, or absolute coordinates. See [`docs/CLI_FIRST_ARCHITECTURE.md`](docs/CLI_FIRST_ARCHITECTURE.md) for the architecture decision.

## Run locally

Requirements: macOS and Node.js 22 or newer.

```bash
npm install
npm run check
npm start
```

In another terminal, exercise the same CLI used by Codex:

```bash
npm run cli -- status
npm run cli -- board open '{"title":"Linear equations","language":"en","objective":"Explain each move without giving away the solution"}'
```

During local development, the bundled Plugin manifest is under `plugins/open-learning`.

Install the Plugin from Codex:

1. Open **Plugins** in Codex.
2. Choose **Add Marketplace**.
3. Add `https://github.com/xmili233/open_learning`.
4. Install **Open Learning**, then start a new Codex task.

The Electron app checks the local Codex Plugin list every five seconds and continues automatically once the installed Plugin is enabled. The Plugin contains the teaching Skill; the installed desktop app provides the CLI.

Build an unsigned macOS PKG with:

```bash
npm run package:mac
```

The PKG installs both `/Applications/Open Learning.app` and `/usr/local/bin/open-learning`. `npm run check` rebuilds and tests the renderer, bundled CLI, local IPC, and board state.

The first real Voice test must happen in a new Codex Voice task after the Plugin is installed. P0 passes only when the Skill invokes the CLI, the board appears before the corresponding spoken explanation, and it can be modified repeatedly during the lesson.

## Project status

- Product decision: [`docs/MVP_PROPOSAL.md`](docs/MVP_PROPOSAL.md)
- Architecture decision: [`docs/CLI_FIRST_ARCHITECTURE.md`](docs/CLI_FIRST_ARCHITECTURE.md)
- Research basis: [`docs/research/mvp-foundations.md`](docs/research/mvp-foundations.md)
- Product UI source of truth: [`DESIGN.md`](DESIGN.md)
- UI change proposal template: [`docs/design/UI_CHANGE_TEMPLATE.md`](docs/design/UI_CHANGE_TEMPLATE.md)
- Current stage: P0 shared-paper loop implemented

The Electron renderer uses React, TypeScript, Vite, Tailwind CSS 4, and locally
owned shadcn/ui component source. Add product components through the shadcn CLI;
do not build parallel custom versions of established UI primitives.

Not included yet: code signing and release automation, a general-purpose whiteboard, cloud sync, user accounts, or subagents.

## License

MIT
