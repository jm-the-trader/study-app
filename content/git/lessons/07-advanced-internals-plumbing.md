# Advanced: Git Internals, Plumbing & Power Workflows

> **The one-sentence version:** Git is a content-addressed object database with branches as cheap pointers — once you see the four object types underneath, the "magic" commands become obvious mechanics.

You know the mental model, branching, merge vs rebase, history rewriting, and collaboration. This lesson goes under the porcelain to the **plumbing**, and adds the power workflows for big or sensitive repos.

## The object database: four kinds of object

Everything Git stores is an object named by the **SHA-1/SHA-256 hash of its content** (content-addressed — identical content stores once):

| Object | Holds |
|---|---|
| **blob** | The bytes of a file (no name, no history) |
| **tree** | A directory listing: names → blob/tree hashes + modes |
| **commit** | A snapshot: one root tree + parent(s) + author/committer + message |
| **tag** | An annotated tag: points at an object + metadata + signature |

A commit doesn't store diffs — it stores a pointer to a **tree** (the whole snapshot). Diffs are *computed* on demand. You can see it directly with plumbing commands:

```bash
git cat-file -p HEAD          # show the commit object → its tree + parent
git cat-file -p HEAD^{tree}   # list the root tree → blobs/subtrees
echo "hi" | git hash-object --stdin   # the hash Git would give this content
```

> 🔑 **Branches and tags are just refs** — files under `.git/refs/` containing a commit hash. Creating a branch writes 41 bytes. `HEAD` is a ref that usually points at a branch ref ("symbolic"); a *detached* HEAD points straight at a commit. This is why branching is instant and "moving a branch" (`reset`) is just rewriting one pointer.

## Packfiles and gc

Loose objects get compacted into **packfiles** (delta-compressed) by `git gc`, which also prunes unreachable objects past the reflog expiry. This is why a repo with huge history can still clone reasonably — and why a commit you "deleted" lingers until gc runs (the reflog safety net from the recovery lesson).

## The index, with precision

The **index** (staging area) is a binary file (`.git/index`) listing the next commit's tree. `git add` writes blobs and updates the index; `git commit` snapshots the index into a tree + commit. Understanding this explains partial staging (`git add -p`) and why `git reset` (moves index) differs from `git checkout`/`restore` (moves working tree).

## Refspecs: what push/fetch actually move

A **refspec** (`+src:dst`) maps refs between repos. `git fetch origin` uses `+refs/heads/*:refs/remotes/origin/*` — remote branches become `origin/*` tracking refs. Knowing this demystifies "why didn't my branch push" and lets you push to a differently-named remote branch: `git push origin local:remote`.

## Big-repo workflows

- **Partial clone** — `git clone --filter=blob:none` fetches commit/tree history but downloads file blobs lazily on checkout. Huge speedup for large histories.
- **Sparse-checkout** — populate only part of the tree in your working directory (essential for monorepos): `git sparse-checkout set src/ docs/`.
- **Git LFS** — store large binaries (videos, datasets) outside the repo, replaced by tiny pointer files, so the repo stays small.
- **Submodules vs subtrees** — submodules embed another repo *by reference* (a pinned commit, separate history; easy to forget to update). Subtrees merge another repo's *contents* into yours (no extra commands for collaborators, larger history). Choose by who maintains the dependency.

## Trust and automation

- **Signed commits/tags** — `git commit -S` (GPG or SSH key) cryptographically proves authorship; platforms show a "Verified" badge. Pairs with branch protection requiring signatures.
- **Hooks** — scripts in `.git/hooks/` fire on events: `pre-commit` (lint/format), `commit-msg` (enforce message format), `pre-push` (run tests). Client hooks aren't shared automatically — teams use a manager (pre-commit framework, Husky) to distribute them.
- **`rerere`** ("reuse recorded resolution") — once enabled, Git remembers how you resolved a conflict and auto-applies it next time the same conflict recurs (lifesaver during long rebases).
- **`bisect run`** — automate the binary search: `git bisect run ./test.sh` lets a script mark good/bad, finding the breaking commit hands-free.

## Check yourself

1. A commit stores a snapshot, not a diff — so what does it actually point to, and where do diffs come from?
2. Why is creating a branch essentially free? What *is* a branch on disk?
3. When would you use a partial clone or sparse-checkout, and what problem does Git LFS solve that they don't?
4. Submodule vs subtree — what's the core trade-off?

## Key takeaways

- Git is a **content-addressed object store** of four types — **blob, tree, commit, tag** — each named by the hash of its content; commits snapshot a **tree**, and diffs are computed.
- **Branches/tags are refs** (tiny pointer files); `HEAD` points at the current branch. That's why branching and `reset` are cheap pointer moves; `gc` packs objects into **packfiles**.
- **Refspecs** map refs across repos and explain push/fetch and tracking branches.
- Scale to big repos with **partial clone**, **sparse-checkout**, and **Git LFS**; share code via **submodules** (by reference) or **subtrees** (by contents).
- Add trust/automation with **signed commits**, **hooks** (distributed via pre-commit/Husky), **rerere**, and **`git bisect run`**.
