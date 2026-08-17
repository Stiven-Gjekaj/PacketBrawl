# AGENTS.md

These are the rules for anyone who does work in this repository, human or
agent. They apply to every change, including a change started without a
request.

## Who writes a commit

- A human is the writer of each commit. An agent is not.
- Set `git config user.name` and `git config user.email` one time. Then do not
  change them.
- Do not add your name to a commit message, a pull request, or a review
  comment.
- Do not add a `Co-Authored-By` line.
- Do not add a link to your session.
- Do not add a footer that says a tool made the text.
- Make these changes in the configuration of the tool. Do not remove the text
  by hand each time. `.claude/settings.json` does this for Claude Code.
- Reason: a commit shows that a human read the code. That human answers
  questions about the code six months later. An agent cannot do this.

## How to write

- Write all text in this repository in ASD-STE100 Simplified Technical
  English. This includes the source code, the comments, the documentation, the
  commit messages, the examples, and the pull requests.
- Use short sentences. Use the active voice. Use the present tense. Write one
  instruction in one sentence.
- Do not use an em-dash.
- Do not use an emoji.

## Commits

- Each commit has one change only.
- Split a feature into many commits. One commit does one step.
- Put the code and its tests in the same commit.
- Put the documentation in a different commit.
- If you change a name in many files, put that change alone in one commit. Do
  not change what the code does in that commit.
- Write the subject line in the present tense, with a type in front of it:
  `feat:`, `fix:`, `test:`, `docs:`, `ci:`, `chore:`, `style:`.
- Do not put a version number in the subject line. A commit does not change
  the version.
- Run `pnpm verify` before you commit, and read its exit code. Every commit is
  a step a reader can stop at, so every commit builds and passes.
- Do not open a pull request unless a human asks for it.

## The rule this project lives by

`packages/sim` is the whole of the game's logic and it depends on nothing. No
framework, no DOM, no clock, and no random source that a state does not carry.

- Do not add a dependency to `packages/sim`. It has none, and the test in
  `packages/sim/test/boundary.test.ts` refuses any import that is not a file
  beside it.
- Do not widen the `types` or `lib` settings of `packages/sim/tsconfig.json`
  to make something compile. Those settings are what stops `document` and
  `process` reaching the rules. Put the code that needs them somewhere else.
- If a change to the rules needs a React file touched, the boundary is broken.
  Fix the boundary, not the symptom.
- Every change to the rules ships with tests.
- A change to the generator or to the state hash invalidates every recorded
  match. Make it on purpose, and say so.

## How to work

- Run the code. Do not only say that it will work.
- Read the exit code of the thing you ran. The exit code of a pipeline is the
  exit code of the last command in it, which is usually not the one you care
  about.
- Tell the human when the results disagree with what you said.

## What to measure

- Measure the thing you tell the human. Do not measure something near it.
- Reason: a size is not a state. A watcher looked at the size of a directory
  and said a download was complete. One gigabyte was still to come.
- Reason: a search for some names is not a search for all of them. A search
  for three program names said no task was running. A watcher was running, and
  its name was not one of the three.
- Give the number you can prove. Do not give a number you worked out from a
  part of it.

## What a test can hold on to

- A test asks the code a question. Do not let it ask the example
  configuration a question.
- Build the state a test needs inside the test.
- A test can pass for the wrong reason. A check that reads a directory must
  first assert the directory has something in it, or a rename turns the check
  green while it enforces nothing.
- Match the shape of the file, not one form of it. A search for a call must
  ignore the comment that explains the call is refused.

## What to keep

- Look in a directory before you delete it. The size of a directory is not the
  contents of it.
- Put each thing the human chooses into the repository. Do not keep it only in
  a working directory.
- Prefer deleting a feature over adding a flag that turns it off.
