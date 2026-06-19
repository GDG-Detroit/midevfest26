# Security Policy

The Detroit Pride Innovation Summit website (`pridemi26`) is a static, front-end-only
site deployed on Vercel. It does not collect user accounts or handle payments, so the
attack surface is small — but we still take security seriously.

## Supported Versions

Only the latest deployment from the `main` branch is supported. We do not backport
fixes to older tags; security fixes ship by merging to `main`, which redeploys the site.

| Version         | Supported          |
| --------------- | ------------------ |
| `main` (latest) | :white_check_mark: |
| Older tags      | :x:                |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, report privately using GitHub's
[private vulnerability reporting](https://github.com/Compass-Detroit/pridemi26/security/advisories/new)
("Report a vulnerability" under the repository's **Security** tab). If that is
unavailable, contact a Compass Detroit maintainer directly.

When reporting, please include:

- A description of the issue and its potential impact
- Steps to reproduce (URL, browser, and actions)
- Any relevant logs, screenshots, or proof-of-concept

## What to Expect

- **Acknowledgement** within 5 business days.
- **Status update** within 10 business days, including whether the report is accepted.
- If accepted, we will work on a fix and coordinate disclosure with you.
- If declined, we will explain why (e.g. out of scope, expected behavior).

## Scope

In scope:

- The production site at [pridemi26.vercel.app](https://pridemi26.vercel.app/)
- Source code in this repository (including the speaker import scripts under
  `scripts/sanity-import/` and the Sanity Studio in `studio/`)

Out of scope:

- Vulnerabilities in third-party platforms we use (Vercel, Sanity, GitHub) — report
  those to the respective vendors.
- Findings that require physical access, social engineering, or a compromised
  maintainer machine.

## Dependencies

CI runs `npm audit --audit-level moderate` on every push and pull request. High and
critical vulnerabilities should be addressed promptly; moderate issues in dev-only
dependencies are triaged case by case.
