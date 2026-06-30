# Kiwanis Limited Editor Portal

The site now includes a small editor portal at:

`/editor/`

It is intentionally not the full-site editor. It only edits:

- Recent events
- Newsletter PDF entries
- Upcoming speakers
- Recent/past speakers

The public pages read from `src/_data/editorContent.json`, so edits in the portal update the Events/Newsletters page and the speaker section on the What We Do page.

## Hidden Doorway

Editors can visit `/editor/` directly.

For the board demo, `/editor/?demo=1` opens in test mode. Test mode lets someone type any email address, enter a fake numeric OTP such as `123456`, and preview the editor interface without publishing changes.

To demonstrate a real publish, use:

`/editor/?live=1`

That mode uses the Cloudflare editor API, GitHub commits, and Cloudflare Pages rebuilds. For the current demo setup, use:

`demo@winvakiw.org`

Because `EDITOR_DEV_MODE=true` is temporarily enabled, the one-time code is shown on screen after requesting it. After the demo period, turn `EDITOR_DEV_MODE` off and replace `demo@winvakiw.org` with real approved editor email addresses.

Security comes from email OTP login, allowed email checks, and server-side GitHub commits. When production editor access is ready on the real domain, leave the editor at `/editor/` and configure the required Cloudflare secrets below.

## Required Cloudflare Environment Variables

Set these for the Cloudflare Pages project:

```text
EDITOR_AUTH_SECRET=<long random secret>
EDITOR_ALLOWED_EMAILS=person1@example.com,person2@example.com
GITHUB_TOKEN=<fine-grained GitHub token with contents read/write for this repo>
GITHUB_OWNER=darkdefined-spec
GITHUB_REPO=kiwanis-winchester
GITHUB_BRANCH=main
RESEND_API_KEY=<email sending API key>
EDITOR_EMAIL_FROM=Kiwanis Website <website@winvakiw.org>
EDITOR_COMMITTER_NAME=Kiwanis Editor Portal
EDITOR_COMMITTER_EMAIL=website-editor@winvakiw.org
```

Optional for local development and temporary demos only:

```text
EDITOR_DEV_MODE=true
```

Do not leave `EDITOR_DEV_MODE` enabled on the live site long term. In dev mode, the OTP route can return a visible code for testing.

## GitHub Token Scope

Use a fine-grained GitHub token limited to the website repository.

Minimum access:

- Repository contents: read and write
- Metadata: read

Avoid broad account tokens.

## Email OTP

The portal currently expects Resend for email delivery. The request-code route sends a six-digit one-time code to approved editor emails.

If email delivery is not configured, the live portal will not issue codes. This is intentional.

## How Saving Works

When an editor clicks "Save & Publish":

1. The browser sends the edited JSON to `/api/editor/save`.
2. The Cloudflare Pages Function verifies the editor session.
3. The function validates the allowed content shape.
4. The function commits `src/_data/editorContent.json` to GitHub.
5. Cloudflare Pages detects the GitHub commit and rebuilds the public site.

Uploaded images and PDFs are also committed to GitHub under:

`src/assets/uploads/editor/`

## What If Someone Makes a Mistake?

Every save creates a GitHub commit.

That means the site has a built-in audit trail:

- Who saved through the editor, based on the commit message
- What file changed
- When it changed
- Which exact content changed

If someone makes a mistake, a maintainer can restore the previous version of `src/_data/editorContent.json` or revert the bad commit in GitHub. The editor UI also shows recent commits so maintainers can quickly find the save that introduced a problem.

This is the core answer to the continuity/revert concern: content edits are not invisible database mutations. They are versioned commits.

The Editor Portal history also includes a restore action for previous content commits. Restoring creates a new GitHub commit instead of rewriting history.

## Relationship to the Admin Portal

The site also includes a native admin portal at:

`/admin/`

The limited editor portal is for routine volunteers. It only edits recurring operational content: events, newsletters, and speakers.

The admin portal is for trusted site administrators. It edits the broader JSON files behind page copy, page images, meeting details, contact information, and site-wide settings.

Admins can use a live preview in `/admin/`: click highlighted content, stage edits into a draft, move between pages, and publish the draft when finished.

The Admin Portal also uses `src/_data/siteEdits.json` to cover currently rendered hardcoded page content, so existing text and images can be edited before every section is formally moved into page-specific content JSON.

Both portals use the same OTP login system and GitHub commit workflow. Set `ADMIN_ALLOWED_EMAILS` for full-site administrators and `EDITOR_ALLOWED_EMAILS` for limited editors.

For a no-risk board rehearsal, use `/admin/?demo=1` for the full Admin Portal and `/editor/?demo=1` for the limited Editor Portal. Those routes accept any email, ask for a fake numeric OTP such as `123456`, and keep every change UI-only.
