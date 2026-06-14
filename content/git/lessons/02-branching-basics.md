# Branching Basics

With the mental model in place (branch = pointer), the everyday commands are simple. This lesson covers creating, switching, and merging branches — and the two flavors of merge that confuse everyone.

## Creating and switching

Modern Git splits the old overloaded `git checkout` into two clearer verbs:

```bash
git switch -c feature/login     # create 'feature/login' and switch to it
git switch main                 # switch to an existing branch
git switch -                    # switch to the previous branch (like `cd -`)

git branch                      # list local branches (* = current)
git branch -a                   # include remote-tracking branches
git branch -d feature/login     # delete (safe: refuses if unmerged)
git branch -D feature/login     # force delete
git branch -m old new           # rename
```

(`git checkout -b feature` still works; `switch`/`restore` just separate "change branch" from "restore files.")

Creating a branch points a new label at your current commit and moves `HEAD` to it. Commits you make now advance *only* that branch.

## Naming conventions

Pick a scheme and stick to it — it makes branches scannable and tooling-friendly:

```
feature/checkout-redesign
fix/null-pointer-on-login
chore/bump-deps
release/2.4
```

Use slashes for grouping, hyphens within a name, and reference a ticket where you have one (`fix/JIRA-123-...`).

## Merging: bringing work back together

You finished `feature` and want it in `main`. You **merge into** the branch you're *on*:

```bash
git switch main
git merge feature
```

There are two ways this resolves, and the difference matters.

### Fast-forward merge

If `main` hasn't moved since you branched, there's no real "merging" to do — Git just slides the `main` pointer forward to `feature`. Linear history, no merge commit.

```
before:   A ◄── B ◄── C ◄── feature
                ▲
              main

after:    A ◄── B ◄── C ◄── main, feature   (main just moved up)
```

### Three-way merge

If `main` *also* gained commits, the branches **diverged**. Git can't just slide the pointer; it computes a new **merge commit** with **two parents**, combining both lines using their common ancestor as the base.

```
        D ◄── E ◄── feature
       /              
A ◄── B ◄── C ◄── main

after merge into main:

        D ◄── E ───────┐
       /                ▼
A ◄── B ◄── C ◄──────── M ◄── main   (M has parents E and C)
```

> 🔑 **Fast-forward = "just move the label" (linear).** **Three-way merge = "the branches diverged, so create a merge commit with two parents."** Which one you get depends purely on whether the target branch moved.

### Controlling the merge type

```bash
git merge --no-ff feature   # ALWAYS create a merge commit, even if FF was possible
git merge --ff-only feature # ONLY fast-forward; refuse if a merge commit is needed
git merge --squash feature  # combine all of feature's work into ONE staged change
                            #   (then you `git commit` it — no merge link kept)
```

> 💡 Teams often use `--no-ff` for feature merges so each feature is one visible, revertable bubble in history; and `--ff-only` when pulling shared branches to keep history linear and catch unexpected divergence. `--squash` collapses a messy feature into a single clean commit (popular for PR merges).

## Deleting merged branches

Once merged, the branch label has done its job — the commits live on in `main`. Delete the label to keep things tidy:

```bash
git branch -d feature/login        # -d only deletes if it's merged (safe)
git branch --merged                # list branches already merged into HEAD
```

The commits aren't lost; you've only removed a pointer.

## Check yourself

1. You're on `main` and run `git merge feature`. What determines whether you get a fast-forward or a merge commit?
2. What's the structural difference between a merge commit and a normal commit?
3. When would you choose `git merge --squash` over a normal merge?

## Key takeaways

- Use **`git switch -c`** to branch, **`git switch`** to move; branches are scannable when you adopt a naming scheme.
- You **merge into the branch you're on**; merges are either a **fast-forward** (pointer slides, linear) or a **three-way merge commit** (two parents) when branches diverged.
- Control it with **`--no-ff`**, **`--ff-only`**, and **`--squash`** to match your team's history style.
- Deleting a merged branch removes only the **pointer**; the commits remain.
