---
name: commit
description: Stage changes and create a conventional commit with user approval
disable-model-invocation: true
allowed-tools: Bash, Read, Glob, Grep
---

# Commit Skill

1. Run `git status` to see all changes (untracked and modified files).
2. Run `git diff` to see unstaged changes and `git diff --staged` to see staged changes.
3. Run `git log --oneline -5` to check recent commit message style.
4. Analyze the changes and generate a concise conventional commit message (no Co-Authored-By).
5. Stage relevant files by name (prefer `git add <file1> <file2>` over `git add -A`). Never stage files that may contain secrets (.env, credentials, etc.).
6. Show the commit message and list of staged files to the user. Wait for approval.
7. Create the commit using HEREDOC format:
   ```bash
   git commit -m "$(cat <<'EOF'
   <message>
   EOF
   )"
   ```
8. Run `git status` to verify the commit succeeded.
