---
name: open-learning
description: Teach a learner through Open Learning's live shared paper when they ask to learn, understand, work through, or be taught a topic. Use the installed open-learning CLI during the explanation; use ordinary conversation for one-shot factual answers.
---

# Open Learning

Teach through Codex Voice while using the Open Learning paper as shared working memory. Speech carries the explanation and questions. The paper carries the exact problem, the learner's work, the current hint, and attention marks. Run every paper operation through the local `open-learning` CLI; it launches the desktop app when needed and returns compact JSON.

## Start and observe

Open one paper and retain its `session_id` and `version`:

    open-learning board open '{"title":"相遇问题","language":"zh","objective":"理解相向而行为什么用速度和"}'

Apply one atomic teaching move against the current version:

    open-learning board patch '{"session_id":"<id>","base_version":1,"operations":[{"op":"put_node","id":"problem","kind":"problem","owner":"student","body":"甲乙相距 240 km，分别以 60 km/h 和 40 km/h 相向而行，几小时相遇？"},{"op":"mark","id":"problem","spans":["相向而行"]},{"op":"focus","ids":["problem"]}]}'

Read learner events and current state before responding:

    open-learning board read '{"session_id":"<id>","scope":"all","since_version":2}'

The learner answers inside the Open Learning app. Never submit an answer on the learner's behalf. Read the resulting `answer`, `select`, or `tap_blank` event, then decide the next spoken question and patch.

## Paper objects

- `problem`: the exact learner problem. Normally use `owner: "student"` so Codex cannot rewrite it.
- `step`: one learner-visible reasoning step.
- `example`: an analogous worked example, never the learner's requested problem. It may use `steps` and `revealed` for progressive disclosure.
- `question`: a short prompt the learner answers on the paper. Add a `check` when the app can judge it.
- `concept`: one compact rule or definition needed now.

All objects accept stable `id`, optional `title`, short `body`, and `owner` (`ai` or `student`). Student-owned objects are immutable to Codex except for focus and marks.

Supported answer checks:

    {"type":"numeric","expect":2.4,"tolerance":0.01}
    {"type":"expression","expect":"60t + 40t = 240"}
    {"type":"choice","expect":"B","options":["A","B","C"]}

Expression checking uses a small arithmetic grammar, not a computer algebra system. Ask the learner to explain the reasoning even after a correct check.

## Patch operations

- `put_node`: add or replace one AI-owned object, or add the initial student-owned problem.
- `remove_node`: remove an AI-owned object.
- `mark`: highlight exact text spans in an object.
- `focus`: point attention at one object.
- `reveal`: reveal more steps of an example.
- `collapse`: hide an AI-owned scaffold that has served its purpose.
- `clear`: remove AI-owned teaching material while preserving learner-owned work.

Keep no more than six uncollapsed objects visible. Reuse stable IDs instead of appending a transcript.

## Teaching loop

1. Ask only for the learning goal or prior knowledge that changes the lesson.
2. Open the paper once and put the exact problem on it.
3. Patch one cognitive move: mark a phrase, focus a line, add one question, reveal one analogous step, or remove a scaffold.
4. In voice, explain at most two short sentences, then ask the learner to predict, calculate, compare, or explain.
5. Wait for the learner. Read paper events before reacting.
6. Respond to the learner's model: keep a correct step, focus the misconception, or give the smallest useful hint.
7. Finish only after the learner produces a key step and can transfer the idea to a new case.

Do not write the complete solution to the learner's problem before they have attempted the key step. If a worked demonstration is needed, use different numbers in an `example`, reveal one step at a time, and return to the original problem.

If the user explicitly asks for a direct answer rather than teaching, answer normally and do not open the paper.

## Recovery

- `VERSION_CONFLICT`: read with the last known version, incorporate learner events, and retry from the returned current version.
- `BOARD_FULL`: collapse or remove an AI-owned scaffold, then retry.
- `OWNER_PROTECTED`: preserve learner work and change only AI-owned material.
- `APP_NOT_INSTALLED`: ask the user to install the Open Learning desktop app.
- Other connection errors: report the compact CLI error; do not claim the paper changed.

Do not create subagents for the MVP teaching loop.
