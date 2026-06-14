# Rewriting History & Recovering Mistakes

Branching power comes with editing power: Git lets you reshape history *and* recover from almost any mistake. This lesson covers the tools to clean up your work and the safety net that makes it fearless.

## Fixing the last commit: `--amend`

Forgot a file, or made a typo in the message? Amend the most recent commit instead of stacking a "oops" commit:

```bash
git commit --amend                       # edit message + include staged changes
git commit --amend --no-edit             # keep message, just add staged changes
```

> ⚠️ `--amend` **replaces** the last commit with a new one (new hash). Same Golden Rule as rebase: don't amend a commit you've already pushed to a shared branch.

## Interactive rebase: the power tool

`git rebase -i` lets you rewrite a *series* of commits — reorder, combine, edit, drop, or reword them. It's how you turn a messy work-in-progress branch into a clean, reviewable story.

```bash
git rebase -i HEAD~4      # edit the last 4 commits
```

You get an editor listing each commit with an action you can change:

```
pick   a1b2c3  add login form
squash 4d5e6f  fix typo            # fold into the commit above
reword 7g8h9i  add validation      # change this commit's message
drop   0j1k2l  debug print         # remove this commit entirely
```

Common actions: `pick` (keep), `reword` (change message), `squash`/`fixup` (merge into previous; `fixup` discards the message), `edit` (pause to amend), `drop` (delete), and reordering by moving lines.

> 💡 The everyday win: before opening a PR, `git rebase -i` to **squash** "wip", "fix typo", "actually fix it" into one coherent commit. Reviewers see intent, not your stumbles. (Same Golden Rule: only on unpushed/private history.)

## Moving the branch pointer: `reset`

`git reset` moves your current branch pointer to another commit. Three modes differ in what they do to your **staging area** and **working files**:

```bash
git reset --soft  HEAD~1   # move pointer; KEEP changes staged
git reset --mixed HEAD~1   # (default) move pointer; keep changes UNSTAGED
git reset --hard  HEAD~1   # move pointer; DISCARD changes  ← destructive
```

| Mode | Branch ptr | Staging | Working dir |
|---|---|---|---|
| `--soft` | moves | kept | kept |
| `--mixed` | moves | reset | kept |
| `--hard` | moves | reset | **wiped** |

> ⚠️ `git reset --hard` throws away uncommitted work in your working directory. Powerful for "undo my last commit and start over," but there's no recycle bin for *uncommitted* changes. Commit or `stash` first if unsure.

## Undoing a commit *safely* on shared history: `revert`

`reset` rewrites history (bad for shared branches). To undo a commit that's already public, use `git revert` — it creates a **new** commit that applies the inverse, leaving history intact:

```bash
git revert <commit>      # make a new commit that undoes <commit>
```

> 🔑 **`reset` vs `revert`:** `reset` *moves the pointer back* (rewrites history — use on private branches). `revert` *adds an inverse commit* (preserves history — the safe way to undo something on `main`).

## Grabbing one commit: `cherry-pick`

Apply a single commit from another branch onto your current one (e.g. backport a fix to a release branch):

```bash
git cherry-pick <commit>          # copy that commit's change here (new hash)
git cherry-pick <a>..<b>          # a range
```

## The safety net: `reflog`

Here's the secret that makes all of the above fearless. Git records *every* place `HEAD` has been — including commits "lost" by reset, rebase, or amend — in the **reflog**, kept for ~90 days by default:

```bash
git reflog                       # HEAD@{0}, HEAD@{1}, ... every move
git reset --hard HEAD@{3}        # jump back to where you were 3 moves ago
git switch -c rescue <hash>      # resurrect lost work onto a new branch
```

> 🛟 **You can almost always recover.** Botched a rebase? Hard-reset to oblivion? `git reflog` shows the commit you were on before — point a branch at it and you're back. Commits become truly unreachable only after garbage collection of unreferenced objects (~90 days), so act within that window. This is why experienced users rebase boldly: the originals are still findable.

## Check yourself

1. What's the difference between `git reset --soft`, `--mixed`, and `--hard` in terms of staging and working files?
2. A bad commit is already on shared `main`. Do you `reset` or `revert` it, and why?
3. You ran `git reset --hard` and lost a commit you needed. How do you get it back?

## Key takeaways

- **`--amend`** fixes the last commit; **`rebase -i`** reorders/squashes/edits a series — both create new hashes (private history only).
- **`reset`** moves the branch pointer (`--soft`/`--mixed`/`--hard` differ in staging/working effects); **`--hard` discards uncommitted work**.
- Undo *public* commits with **`revert`** (adds an inverse commit), not `reset` (rewrites history).
- **`git reflog`** is your safety net — nearly any "lost" commit is recoverable for ~90 days, which is what makes history-editing safe.
