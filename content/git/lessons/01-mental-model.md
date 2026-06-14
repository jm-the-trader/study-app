# Git's Mental Model

> **The one-sentence version:** A branch in Git is not a copy of your files — it's just a *movable pointer to a commit*. Once that clicks, every branching technique becomes obvious.

Most Git confusion comes from imagining branches as folders or copies. They aren't. Let's build the correct model from the ground up.

## Commits: immutable snapshots

A **commit** is a full **snapshot** of your tracked files at a moment in time, plus metadata: author, message, timestamp, and — crucially — a pointer to its **parent** commit(s). Each commit is identified by a **hash** (SHA-1/SHA-256) computed from its content.

> 🔑 Commits form a **chain** (actually a directed acyclic graph). Each points back to its parent, so the history is a linked list of snapshots. Because the hash is derived from content *plus parent*, changing anything in the past changes every hash after it — history is effectively immutable.

```
A ◄── B ◄── C          (each arrow = "parent of")
```

## Branches: just movable labels

A **branch** is a tiny file containing one commit hash — a **pointer**. That's it. `main` is a label stuck on a commit. When you add a commit, Git moves the label forward to the new commit.

```
A ◄── B ◄── C
              ▲
            main
```

Create a branch and you've created *another label on the same commit* — essentially free, instant, no copying:

```
A ◄── B ◄── C
              ▲
       main, feature   ← both point at C
```

> 💡 This is why Git branching is so cheap and central to its workflow: a new branch is a ~40-byte pointer, not a duplicate of your project. Branch liberally.

## HEAD: where you are

**`HEAD`** is a pointer to *the branch you're currently on* (or directly to a commit — "detached HEAD"). It answers "what does my next commit attach to?"

```
A ◄── B ◄── C
              ▲
            main ◄── HEAD     ("I'm on main")
```

Commit while on `feature`, and `feature` (and `HEAD` with it) advances; `main` stays put. That divergence is the whole basis of branching:

```
        D ◄── feature ◄── HEAD
       /
A ◄── B ◄── C ◄── main
```

## The three areas

Changes move through three places — know them or `git status` is mysterious:

1. **Working directory** — your actual files on disk.
2. **Staging area (index)** — the snapshot you're *building* for the next commit.
3. **Repository (.git)** — committed history.

```
working dir  ──git add──►  staging area  ──git commit──►  repository
```

`git add` stages; `git commit` snapshots the staging area into a new commit; `git checkout`/`git restore` pull from the repo back into your working dir. `git status` and `git diff` (working↔staged) / `git diff --staged` (staged↔repo) show what's where.

## Refs, tags, and the rest

Branches and `HEAD` are kinds of **refs** (named pointers in `.git/refs`). Other refs:

- **Tags** — pointers that *don't move* (mark releases, e.g. `v1.2.0`).
- **Remote-tracking refs** — `origin/main` records where the remote's `main` was at your last fetch.

Everything you do — merge, rebase, reset — is really just **moving pointers around a graph of immutable commits**. Hold that picture and the rest of this topic is mechanical.

## Seeing the graph

```bash
git log --oneline --graph --all --decorate   # the picture, in your terminal
git show HEAD          # the current commit's snapshot + diff
git cat-file -p HEAD   # the raw commit object (parent, tree, author)
```

Alias the first one — visualizing the commit graph turns "what is rebase doing?" from mystery into observation.

## Check yourself

1. If a branch is "just a pointer," what actually happens to `main` when you make a commit while on it?
2. What does `HEAD` point to, and how is that different from what a branch points to?
3. Name the three areas a change passes through and the command that moves it between each.

## Key takeaways

- **Commits** are immutable snapshots linked to their parents by content-derived **hashes**.
- A **branch is a movable pointer** to a commit — creating one is nearly free, so branch freely.
- **`HEAD`** points to your current branch (the attach point for your next commit).
- Changes flow **working dir → staging → repository**; nearly every Git operation is just **moving pointers** over the commit graph.
