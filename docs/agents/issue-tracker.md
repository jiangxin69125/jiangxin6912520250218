# Issue Tracker

Issues and PRDs for this repo live in GitHub Issues.

Repository:

- `https://github.com/jiangxin69125/jiangxin6912520250218`

Use the `gh` CLI from inside this repo.

## Operations

- Create: `gh issue create --title "..." --body "..."`
- Read: `gh issue view <number> --comments`
- List: `gh issue list --state open --json number,title,body,labels,comments`
- Comment: `gh issue comment <number> --body "..."`
- Label: `gh issue edit <number> --add-label "..."`
- Unlabel: `gh issue edit <number> --remove-label "..."`
- Close: `gh issue close <number> --comment "..."`

## Pull Requests

External PRs are not a triage surface.

When a skill says "publish to the issue tracker", create a GitHub issue.

When a skill says "fetch the relevant ticket", run `gh issue view <number> --comments`.
