# Task: dietary-swap-postcheck

## Prompt

When a coach swaps a food on a DRAFT plan, run `assertNoRestrictedFoods` against the client's active dietary profile before persisting. Reject the swap if the new food carries a restricted allergen tag.

## Invariants

- Layer-2 generate still hard-filters candidates (`candidatesForRestrictions`).
- `putProfile` still flags a PUBLISHED plan as `NEEDS_REVIEW`.
- LLM is not involved in the check.
- Spec `docs/specs/fr-c7-dietary-profile.md` is updated in the same PR.

## Done when

A new test fails before the check exists and passes after, and `./scripts/eval-agent-diff.sh` prints `PASS`.
