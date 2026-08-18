# Feature specs

Machine-checkable acceptance for agents. Write or update a spec **before** generating code. Link the spec (or an ADR) in the PR body.

Specs describe **current** behavior as implemented. If the product should change, update the spec in the same PR as the code and tests.

Template:

```markdown
# docs/specs/<id>-<slug>.md

## Invariant

One or two sentences. Safety-critical rules first.

## Acceptance

- Given …, When …, Then …
```

Proven by tests cited at the bottom of each spec. If a bullet has no test, that is a gap, not an invitation to invent HTTP status codes.
