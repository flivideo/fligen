# NFR-01: Git Leak Detection

**Status:** Implemented
**Added:** 2025-12-27
**Implemented:** 2025-12-27

---

## User Story

As a developer, I want pre-commit hooks that detect secrets and credentials so that API keys, passwords, and tokens are never accidentally committed to the repository.

## Background

FliDeck already has this implemented. This NFR adopts the same pattern for consistency across the FliVideo ecosystem.

**Reference Implementation:** `/Users/davidcruwys/dev/ad/flivideo/flideck/.git/hooks/pre-commit`

## Prerequisites

- **gitleaks** must be installed system-wide
- Currently installed: gitleaks 8.28.0 at `/opt/homebrew/bin/gitleaks`
- Install via: `brew install gitleaks`

## What to Detect

- API keys (OpenAI, Anthropic, AWS, FAL.AI, 11 Labs, Suno, etc.)
- Passwords and tokens
- Private keys (SSH, PGP)
- Connection strings
- `.env` file contents
- JWT tokens
- OAuth credentials

## Implementation Steps

### Step 1: Create `.gitleaksignore` file

Create `/Users/davidcruwys/dev/ad/flivideo/fligen/.gitleaksignore`:

```
# Gitleaks ignore file
# Add patterns or specific findings to ignore false positives
# Format: <rule-id>:<file-path>:<line-number>
# Or just the finding fingerprint

# Example:
# generic-api-key:config/example.json:10
```

### Step 2: Create pre-commit hook

Create `/Users/davidcruwys/dev/ad/flivideo/fligen/.git/hooks/pre-commit`:

```bash
#!/bin/bash

# Pre-commit hook to detect secrets using gitleaks
# This prevents accidentally committing API keys, passwords, tokens, etc.

echo "Running gitleaks to check for secrets..."

# Run gitleaks on staged changes only
gitleaks protect --staged --verbose

# Capture exit code
exit_code=$?

if [ $exit_code -ne 0 ]; then
    echo ""
    echo "=========================================="
    echo "ERROR: Potential secrets detected!"
    echo "=========================================="
    echo ""
    echo "Gitleaks found potential secrets in your staged changes."
    echo "Please remove the secrets before committing."
    echo ""
    echo "If this is a false positive, you can:"
    echo "  1. Add the file/pattern to .gitleaksignore"
    echo "  2. Use 'git commit --no-verify' to skip this check (not recommended)"
    echo ""
    exit 1
fi

echo "No secrets detected. Proceeding with commit..."
exit 0
```

### Step 3: Make hook executable

```bash
chmod +x .git/hooks/pre-commit
```

### Step 4: Update CLAUDE.md

Add documentation section to CLAUDE.md about the gitleaks integration.

## Acceptance Criteria

- [ ] `.gitleaksignore` file exists in project root
- [ ] Pre-commit hook installed at `.git/hooks/pre-commit`
- [ ] Hook is executable (`chmod +x`)
- [ ] Secrets are detected and blocked before commit
- [ ] Clear error message displayed when secret found
- [ ] `.gitleaksignore` available for false positive suppression
- [ ] CLAUDE.md updated with gitleaks documentation

## Testing

1. Stage a file containing a test secret (e.g., `OPENAI_API_KEY=sk-test123`)
2. Attempt to commit
3. Verify commit is blocked with clear error message
4. Remove the secret and verify commit succeeds

## Notes

- **Not using Husky**: Direct git hooks are simpler for this use case
- **Bypass available**: `git commit --no-verify` (use sparingly, not recommended)
- **CI/CD consideration**: Future enhancement could add gitleaks to GitHub Actions

## Related

- FliDeck implementation (reference)
- FliHub NFR-86 (pending implementation)

## Completion Notes

**What was done:**
- Created `.gitleaksignore` file in project root with example patterns
- Created pre-commit hook at `.git/hooks/pre-commit` matching FliDeck reference
- Made hook executable with `chmod +x`
- Added "Git Leak Detection (gitleaks)" section to CLAUDE.md

**Files changed:**
- `.gitleaksignore` (new)
- `.git/hooks/pre-commit` (new)
- `CLAUDE.md` (modified - added gitleaks documentation)

**Testing notes:**
- Stage a file with test secret (e.g., `OPENAI_API_KEY=sk-test123`)
- Run `git commit` - should be blocked with clear error
- Remove secret and commit should succeed

**Status:** Complete
