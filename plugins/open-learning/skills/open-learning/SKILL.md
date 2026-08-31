---
name: open-learning
description: Teach a concept through Open Learning's live canvas when the user asks to learn, understand, or be taught a topic with Open Learning. Operate the installed desktop app through its open-learning CLI during the explanation; use ordinary conversation for one-shot factual answers.
---

# Open Learning

Treat the board as a shared teaching surface, not a transcript or end-of-lesson summary. Run every board operation through the local `open-learning` CLI. Board commands automatically launch the desktop app and return one compact JSON object.

## CLI interface

Open a fresh board and keep its returned `session_id` and `version`:

```bash
open-learning board open '{"title":"Bayesian updating","language":"en","objective":"See how evidence changes belief"}'
```

Apply one atomic teaching move using the current version:

```bash
open-learning board patch '{"session_id":"<id>","base_version":1,"operations":[{"op":"put_node","id":"prior","kind":"concept","title":"Prior","body":"Belief before evidence"},{"op":"focus","ids":["prior"]}]}'
```

Read before referring to a learner selection or recovering from a version conflict:

```bash
open-learning board read '{"session_id":"<id>","scope":"selection_and_focus","since_version":2}'
```

Operations are `put_node`, `remove_node`, `put_edge`, `remove_edge`, `focus`, and `clear`. Node kinds are `concept`, `step`, `example`, and `question`. A patch may include `layout` with `intent` (`flow`, `compare`, or `cluster`), `direction`, and `preserve_existing`.

## Teaching loop

1. Ask only for the learning goal and prior knowledge that would change the lesson. Completion: the next teaching move is clear.
2. Run `open-learning board open` once. Completion: an empty session is ready.
3. Before explaining a spatial, relational, sequential, or comparative idea, run one compact `board patch`. Then refer to the visible objects in speech. Completion: the learner can connect the spoken explanation to the current board state.
4. Ask for a prediction, comparison, explanation, or transfer answer. When the learner selects or refers to an object, run `board read` before changing it. Completion: the learner's current model has been tested, not merely acknowledged.
5. Patch the board in response: focus the relevant objects, replace a mistaken assumption, show a counterexample, or clear scaffolding that has served its purpose. Repeat until the learner can explain the mechanism and solve one new application.

## Board economy

- Use `concept` for a mechanism or rule, `step` for a transformation, `example` for a case or counterexample, and `question` for an unresolved prompt.
- Batch one teaching move into one patch. Keep titles and bodies short.
- Let speech carry intuition and interaction; let the board carry objects, relationships, state changes, and attention.
- Preserve useful object IDs across patches. Remove temporary material instead of accumulating a knowledge graph.
- Use layout intents such as `flow`, `compare`, or `cluster`; let the app choose coordinates.

If the CLI returns `APP_NOT_INSTALLED`, ask the user to install the Open Learning desktop app. For other errors, use the returned code to correct the input or retry after reading the board. Do not claim that an after-the-fact diagram was live board use. Do not create subagents in the MVP workflow.
