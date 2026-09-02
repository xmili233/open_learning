# CLI-first architecture

> Status: accepted
>
> Date: 2026-08-31

## Decision

Open Learning has one product interface: the `open-learning` CLI.

```text
Codex Voice
  → Open Learning Skill
  → open-learning CLI
  → authenticated local IPC
  → Electron main process
  → sandboxed teaching canvas
```

The Skill decides the teaching move. The CLI executes it. Electron owns the live state and presentation. The Plugin contains the Skill only; it does not carry a second transport or a background protocol server.

## First principles

1. The canvas must change progressively during teaching. Each CLI call is one observable teaching move.
2. Codex should learn one small interface. Process startup, retries, socket discovery, authentication, and rendering stay behind it.
3. Installing the desktop product must install the interface. The macOS PKG installs both `Open Learning.app` and `/usr/local/bin/open-learning`.
4. A closed app is not an error path. Any board command launches the app, waits until its local IPC is ready, and then performs the requested operation.
5. The renderer never accepts HTML, CSS, SVG, coordinates, shell commands, or arbitrary files. The CLI accepts only the board's validated semantic JSON operations.
6. Results are compact JSON with stable error codes. Speech carries explanation; the paper carries the problem, learner work, changes, and attention.

## CLI interface

```text
open-learning app
open-learning status
open-learning board open '<json>'
open-learning board patch '<json>'
open-learning board read '<json>'
```

Use `-` instead of the JSON argument to read one object from stdin. Commands other than help write exactly one JSON object. Invalid input and runtime failures write a JSON error to stderr and exit non-zero.

`board open`, `board patch`, and `board read` preserve the existing board schemas and optimistic `base_version` checks. This keeps the state model independent from the caller while avoiding a second public interface.

## Installation and launch

The macOS PKG places the app in `/Applications` and installs a small launcher at `/usr/local/bin/open-learning`. The launcher uses the Electron executable already shipped with the app as the Node runtime for the bundled CLI, so users do not need a separate Node.js installation.

When a board command runs:

1. The CLI probes the authenticated local IPC with `status`.
2. If unavailable, it starts the installed Electron executable without `ELECTRON_RUN_AS_NODE`.
3. It waits up to ten seconds for the private runtime descriptor and socket.
4. It validates and sends the board operation.
5. It prints the compact result and exits.

The macOS pilot is the current packaging target. Future Windows or Linux installers must provide the same CLI interface and automatic launch behavior; they may use platform-specific installer and process adapters internally.

## Ownership

| Module | Owns | Does not own |
| --- | --- | --- |
| Skill | Teaching sequence, board economy, when to read or patch | Process management or transport |
| CLI | Command parsing, app launch, readiness, IPC calls, machine output | Teaching policy or rendering |
| Electron main | Board state, validation, authenticated IPC, renderer updates | Codex conversations or shell access |
| Renderer | Paper layout, learner interaction, local answer checks, accessible presentation | Node.js, filesystem, raw IPC, agent commands |

## Rejected architecture

The STDIO MCP adapter was deleted. It duplicated the CLI-shaped operation surface, required an eagerly configured protocol process, and made application lifecycle a separate concern. Keeping it as a compatibility layer would create two public interfaces and two paths to test, document, install, and debug.

## Acceptance

- `open-learning status` reports whether the app is running without launching it.
- A board command succeeds when the app starts closed.
- `open`, multiple `patch` calls, and `read` complete through the CLI and local IPC.
- A learner answer advances the board version and appears as an event in the next `read`.
- A patch based on the pre-answer version fails with `VERSION_CONFLICT` instead of overwriting the learner action.
- Removing the CLI makes the Plugin unable to operate the canvas; there is no hidden alternative path.
- A built macOS PKG contains the app, bundled CLI, and installer script for `/usr/local/bin/open-learning`.
