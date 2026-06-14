# Collaboration, Conflicts & Power Tools

Branching pays off when you collaborate. This lesson covers remotes, resolving conflicts calmly, and a few power tools (stash, bisect, worktrees) that round out a platform engineer's Git toolkit.

## Remotes and tracking

A **remote** is another copy of the repo (e.g. on GitHub), referenced by name — usually `origin`.

```bash
git remote -v                      # list remotes
git fetch origin                   # download remote changes; update origin/* refs (no merge)
git pull                           # fetch + integrate into your branch (merge or rebase)
git push -u origin feature/login   # push and set upstream tracking
git push                           # subsequent pushes
```

> 🔑 **`fetch` is safe and read-only** — it updates your `origin/*` tracking refs but never touches your working files. `pull` = `fetch` + integrate. When unsure what changed upstream, `fetch` then inspect (`git log main..origin/main`) before integrating.

`origin/main` is a **remote-tracking ref**: your local snapshot of where the remote's `main` was at the last fetch. Your local `main` and `origin/main` are different pointers — that gap is "commits to push/pull."

## Merge conflicts: not scary, just bookkeeping

A **conflict** happens when two branches changed the *same lines* and Git can't auto-decide. Git pauses and marks the spots:

```
<<<<<<< HEAD
color: blue;          ← your current branch's version
=======
color: green;         ← the incoming branch's version
>>>>>>> feature
```

Resolution is a calm, repeatable loop:

1. `git status` — see which files conflict ("Unmerged paths").
2. Open each file; **edit to the desired final result**, deleting the `<<<<<<<`, `=======`, `>>>>>>>` markers. You choose one side, the other, or a blend.
3. `git add <file>` — mark it resolved.
4. Finish: `git merge --continue` (or `git rebase --continue`). To abandon: `git merge --abort` / `git rebase --abort`.

```bash
git merge --abort        # bail out, back to before the merge
git checkout --ours  f   # take our whole version of file f
git checkout --theirs f  # take their whole version of file f
git mergetool            # open a visual 3-way merge tool
```

> 💡 **During a `rebase`, "ours" and "theirs" feel backwards.** Because rebase replays *your* commits onto the target, `--ours` refers to the branch you're rebasing *onto* and `--theirs` to your commits being applied. When confused, just edit the file to the result you want rather than reasoning about sides.

To reduce conflict pain: integrate often (small, frequent merges/rebases beat one giant one), and keep changes focused.

## `git stash`: park work-in-progress

Need to switch branches but aren't ready to commit? Stash the changes onto a stack and restore later:

```bash
git stash                 # shelve tracked changes; clean working dir
git stash -u              # include untracked files
git stash list            # see the stack
git stash pop             # reapply the latest and drop it from the stack
git stash apply stash@{1} # reapply a specific one, keep it on the stack
```

## `git bisect`: binary-search for the bad commit

A bug appeared "sometime in the last 200 commits." `bisect` finds the exact culprit with ~log₂(n) checks (≈8 for 200):

```bash
git bisect start
git bisect bad                 # current commit is broken
git bisect good v1.4.0         # this old release was fine
# Git checks out the midpoint; you test and mark each:
git bisect good   # or: git bisect bad
# ...repeat; Git converges on the first bad commit, then:
git bisect reset               # return to where you started
```

You can even automate it: `git bisect run ./test.sh` marks good/bad by the script's exit code. This is one of Git's most underused superpowers.

## `git worktree`: multiple branches checked out at once

Instead of stashing to switch contexts, check out another branch in a *separate directory* sharing the same repo:

```bash
git worktree add ../hotfix main    # work on main in ../hotfix while your feature stays put
git worktree list
git worktree remove ../hotfix
```

Great for "review a PR / cut a hotfix without disturbing my current work" — and it's exactly how some AI/dev tools isolate parallel changes.

## Check yourself

1. What does `git fetch` do that `git pull` doesn't stop at — and why fetch first when unsure?
2. Walk through the four steps to resolve a merge conflict.
3. You know a bug entered somewhere in the last ~256 commits. Which command finds it efficiently, and roughly how many tests will it take?

## Key takeaways

- A **remote** (`origin`) is another repo copy; **`fetch`** is safe/read-only, **`pull`** also integrates, and `origin/main` tracks the remote's last-known state.
- **Conflicts** are just same-line disagreements: `status` → edit out the markers → `add` → `--continue` (or `--abort`). Integrate often to keep them small.
- **`stash`** parks WIP; **`worktree`** checks out another branch in a separate folder.
- **`git bisect`** binary-searches history to pinpoint the commit that introduced a bug — log₂(n) steps, automatable with `bisect run`.
