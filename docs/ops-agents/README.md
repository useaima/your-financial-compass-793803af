# UseAima Ops Agent Track

This folder is the starter package for the separate org-level ops/security agent track we discussed.

It is intentionally kept out of EVA product logic. These agents are meant to be moved into their own repo or workspace under `useaima` once GitHub tooling is available in this environment.

## Initial agents

- `devops-lead.md`
- `cloudflare-specialist.md`
- `finops-agent.md`
- `security-ops-agent.md`
- `vulnerability-scanner-agent.md`
- `iam-agent.md`

## Shared rules

- These agents operate on organization infrastructure and APIs, not end-user EVA workflows.
- Every agent must keep audit trails for actions, findings, and escalations.
- High-risk changes must be proposed first and executed only after explicit approval.
- Agents should prefer read-only inspection first, then bounded mutation.
- Billing, DNS, IAM, and security findings should be summarized for a human operator before rollout.

## Suggested split when moved to a dedicated repo

- `/agents/*.md` for agent charters
- `/runbooks/*.md` for common operational workflows
- `/integrations/*.md` for provider access patterns
- `/policies/*.md` for approval and escalation rules
