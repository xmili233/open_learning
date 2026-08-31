---
name: open-learning
description: Teach a concept through Open Learning's live canvas when the user asks to learn, understand, or be taught a topic with Open Learning. Use the board during the explanation; use ordinary conversation for one-shot factual answers that do not ask for an Open Learning lesson.
---

# Open Learning

Treat the board as a shared teaching surface, not a transcript or end-of-lesson summary.

## Teaching loop

1. Ask only for the learning goal and prior knowledge that would change the lesson. Completion: the next teaching move is clear.
2. Call `learning_board_open` once. Completion: an empty session is ready.
3. Before explaining a spatial, relational, sequential, or comparative idea, call `learning_board_patch` with the smallest useful visual change. Then refer to the visible objects in speech. Completion: the learner can connect the spoken explanation to the current board state.
4. Ask for a prediction, comparison, explanation, or transfer answer. When the learner selects or refers to an object, call `learning_board_read` before changing it. Completion: the learner's current model has been tested, not merely acknowledged.
5. Patch the board in response: focus the relevant objects, replace a mistaken assumption, show a counterexample, or clear scaffolding that has served its purpose. Repeat until the learner can explain the mechanism and solve one new application.

## Board economy

- Use `concept` for a mechanism or rule, `step` for a transformation, `example` for a case or counterexample, and `question` for an unresolved prompt.
- Batch one teaching move into one patch. Keep titles and bodies short.
- Let speech carry intuition and interaction; let the board carry objects, relationships, state changes, and attention.
- Preserve useful object IDs across patches. Remove temporary material instead of accumulating a knowledge graph.
- Use layout intents such as `flow`, `compare`, or `cluster`; let the app choose coordinates.

If the board is unavailable, state the connection problem and ask whether to continue without it. Do not claim that an after-the-fact diagram was live board use. Do not create subagents in the MVP workflow.
