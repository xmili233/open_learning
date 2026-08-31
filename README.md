# Open Learning

Open Learning is a live teaching canvas operated by Codex during a voice learning session. Codex draws, changes, focuses, and clears visual teaching objects while it explains. The canvas is part of the lesson, not a summary generated after it.

Open Learning 是一块由 Codex 在语音学习过程中主动操作的实时教学画板。Codex 会在讲解前或讲解过程中绘制、修改、聚焦和清除教学对象；画板是教学过程的一部分，而不是课后总结生成器。

## P0 scope

The current P0 proves the local technical loop:

```text
Codex / MCP client
  → Open Learning STDIO MCP server
  → authenticated local socket
  → Electron main process
  → sandboxed renderer
```

It includes three MCP tools:

- `learning_board_open`
- `learning_board_patch`
- `learning_board_read`

The board accepts semantic objects and relationships. Codex never sends HTML, CSS, SVG, or absolute coordinates.

## Run locally

Requirements: macOS and Node.js 22 or newer.

```bash
npm install
npm run check
npm start
```

Keep the Electron app open before connecting the MCP server. During local development, the bundled Plugin manifest is under `plugins/open-learning`.

Install the Plugin from Codex:

1. Open **Plugins** in Codex.
2. Choose **Add Marketplace**.
3. Add `https://github.com/xmili233/open_learning`.
4. Install **Open Learning**, then start a new Codex task.

The Electron app checks the local Codex Plugin list every five seconds and
continues automatically once the installed Plugin is enabled.

`npm run build:mcp` produces the self-contained MCP runtime stored inside the Plugin. `npm run check` rebuilds and tests that exact runtime.

The first real Voice test must happen in a new Codex Voice task after the Plugin/MCP server is installed. P0 passes only when the board appears before the corresponding spoken explanation and can be modified repeatedly during the lesson.

## Project status

- Product decision: [`docs/MVP_PROPOSAL.md`](docs/MVP_PROPOSAL.md)
- Research basis: [`docs/research/mvp-foundations.md`](docs/research/mvp-foundations.md)
- Product UI source of truth: [`DESIGN.md`](DESIGN.md)
- UI change proposal template: [`docs/design/UI_CHANGE_TEMPLATE.md`](docs/design/UI_CHANGE_TEMPLATE.md)
- Current stage: P0 implementation

The Electron renderer uses React, TypeScript, Vite, Tailwind CSS 4, and locally
owned shadcn/ui component source. Add product components through the shadcn CLI;
do not build parallel custom versions of established UI primitives.

Not included yet: production packaging, code signing, a general-purpose whiteboard, cloud sync, user accounts, or subagents.

## License

MIT
