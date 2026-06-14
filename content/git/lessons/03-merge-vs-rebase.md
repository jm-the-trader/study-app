# Merge vs. Rebase

This is the most-debated topic in Git — and once you understand what each *actually does*, the "debate" turns into "the right tool for the situation." Both integrate one branch into another; they just produce different histories.

## Merge: combine, preserving history

You saw this last lesson. `git merge` ties two diverged lines together with a **merge commit**. It is **non-destructive** — your existing commits are untouched; a new commit records the joining.

```
        D ◄── E ◄── feature
       /
A ◄── B ◄── C ◄── main

git switch main && git merge feature:

        D ◄── E ──────┐
       /               ▼
A ◄── B ◄── C ◄─────── M ◄── main
```

✅ Truthful record of what happened and when. ❌ Many merge commits can make history a tangled "railroad yard."

## Rebase: replay your commits onto a new base

`git rebase` takes your branch's commits, sets them aside, moves your branch's starting point to the tip of the target, and **re-applies your commits one by one** on top. The result is a **linear** history — as if you'd started your work from the latest `main`.

```
        D ◄── E ◄── feature
       /
A ◄── B ◄── C ◄── main

git switch feature && git rebase main:

A ◄── B ◄── C ◄── D' ◄── E' ◄── feature   (D',E' are NEW commits)
              ▲
            main
```

> 🔑 **Rebase rewrites commits.** `D'` and `E'` are *new commits* with new hashes — same changes, different parents and identity. The originals (`D`, `E`) are abandoned (recoverable via reflog, but no longer on the branch). This is the entire reason rebase is powerful *and* dangerous.

```bash
git switch feature
git rebase main          # replay feature's commits on top of main
# resolve any conflicts, then:
git rebase --continue    # (or --abort to bail out entirely)
```

After rebasing, integrating into `main` is a clean **fast-forward** — no merge commit needed.

## The Golden Rule of Rebasing

> ⚠️ **Never rebase commits that others may have already pulled** (i.e. commits you've pushed to a shared branch). Because rebase changes hashes, everyone else's history diverges from yours, producing duplicate commits and painful conflicts. Rebase **local, unpushed** work freely; leave **shared/published** history to merges.

Put simply: **rebase your private branch before sharing it; never rebase `main` or anything teammates have.**

## A practical workflow that uses both

A very common, pragmatic pattern:

1. **While developing a feature**, keep it current by **rebasing onto `main`** so you integrate upstream changes early and keep a clean line:
   ```bash
   git switch feature && git fetch origin && git rebase origin/main
   ```
2. **When merging the finished feature into `main`**, use a **merge** (often `--no-ff` or a squash-merge via your PR tool) so the integration point is explicit and revertable.

This gives clean feature branches *and* a meaningful, honest mainline history.

## Bonus: `git pull --rebase`

A plain `git pull` is `fetch` + **merge**, which sprinkles tiny merge commits into your local history when you and a teammate both pushed. `git pull --rebase` instead replays *your* local commits on top of the freshly-fetched branch — no noise:

```bash
git pull --rebase
git config --global pull.rebase true   # make it the default
```

(Safe because it only rebases your *own* unpushed commits — consistent with the Golden Rule.)

## Decision guide

| Situation | Use |
|---|---|
| Integrating a finished feature into a shared branch | **Merge** (explicit, revertable) |
| Cleaning up / updating your own unpushed branch | **Rebase** |
| Syncing a shared branch others use | **Merge** (never rebase it) |
| Avoiding merge-commit noise on `git pull` | **`pull --rebase`** |
| Squashing a messy feature into one commit | **Squash** (merge --squash or interactive rebase) |

## Check yourself

1. Why do `D` and `E` get *new hashes* after a rebase, and what does that imply about the originals?
2. State the Golden Rule of Rebasing in your own words. What goes wrong if you break it?
3. Describe a workflow that uses rebase and merge for their respective strengths.

## Key takeaways

- **Merge** is non-destructive and records a two-parent **merge commit**; **rebase rewrites** commits to produce a **linear** history.
- Rebase creates **new commits with new hashes** — powerful for cleanup, dangerous on shared history.
- **Golden Rule:** rebase only **local, unpushed** commits; never rebase anything others have pulled.
- A great combo: **rebase your feature** to keep it clean/current, then **merge it** into mainline for an explicit integration point.
