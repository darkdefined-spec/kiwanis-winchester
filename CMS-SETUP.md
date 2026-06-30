# Kiwanis Website Editing Setup

This site now uses native editing portals backed by GitHub and Cloudflare.

## Editing Model

| Portal | Route | Intended users | Scope |
|---|---|---|---|
| Admin Portal | `/admin/` | Trusted site administrators | Site settings and page-level JSON content |
| Editor Portal | `/editor/` | Routine content editors | Events, newsletter PDFs, and speakers |

Both portals save through Cloudflare Pages Functions. A publish creates GitHub commits, then Cloudflare Pages rebuilds the static site.

The Admin Portal includes a live preview. Admins can move through pages, click highlighted text or images, stage changes into a draft, then publish the full draft when finished.

The current public pages are also covered by `src/_data/siteEdits.json`, a generated visual-edit manifest. That manifest captures visible text, images, and page hero backgrounds from the current rendered site so hardcoded template content can still be edited from the Admin Portal.

## Stack

| Layer | Tool | Purpose |
|---|---|---|
| Static site generator | Eleventy | Converts templates and JSON content into HTML |
| Hosting | Cloudflare Pages | Serves the static site and rebuilds on GitHub commits |
| Content storage | GitHub | Versioned content, uploads, and rollback history |
| Authentication | Email OTP | Approved emails receive one-time login codes |
| Email delivery | Resend | Sends editor/admin login codes |

## Required Cloudflare Environment Variables

```text
EDITOR_AUTH_SECRET=<long random secret>
EDITOR_ALLOWED_EMAILS=editor1@example.com,editor2@example.com
ADMIN_ALLOWED_EMAILS=admin1@example.com,admin2@example.com
GITHUB_TOKEN=<fine-grained GitHub token with contents read/write for this repo>
GITHUB_OWNER=darkdefined-spec
GITHUB_REPO=kiwanis-winchester
GITHUB_BRANCH=main
RESEND_API_KEY=<email sending API key>
EDITOR_EMAIL_FROM=Kiwanis Website <website@winvakiw.org>
EDITOR_COMMITTER_NAME=Kiwanis Website Editor
EDITOR_COMMITTER_EMAIL=website-editor@winvakiw.org
```

Optional for temporary demos only:

```text
EDITOR_DEV_MODE=true
```

Do not leave `EDITOR_DEV_MODE` enabled on the live site long term. In dev mode, the OTP route can return a visible code for testing.

For a no-risk Admin Portal rehearsal, open `/admin/?adminTest=1`. Demo mode accepts any email address, asks for a fake numeric OTP such as `123456`, loads the full admin interface with sample content, and never calls the live save API or creates GitHub commits.

## Role Behavior

Admins listed in `ADMIN_ALLOWED_EMAILS` can log into `/admin/` and `/editor/`.

Editors listed only in `EDITOR_ALLOWED_EMAILS` can log into `/editor/` but cannot use the admin APIs.

The admin API only allows editing known JSON files:

- `src/_data/siteEdits.json`
- `src/_data/site.json`
- `src/_data/cms/home.json`
- `src/_data/cms/about.json`
- `src/_data/cms/whatWeDo.json`
- `src/_data/cms/youthPrograms.json`
- `src/_data/cms/pancake.json`
- `src/_data/cms/events.json`
- `src/_data/cms/resources.json`
- `src/_data/cms/join.json`
- `src/_data/cms/donate.json`
- `src/_data/cms/contact.json`

The limited editor API only saves `src/_data/editorContent.json` and uploads approved image/PDF files under `src/assets/uploads/editor/`.

## GitHub Token Scope

Use a fine-grained GitHub token limited to this repository.

Minimum access:

- Repository contents: read and write
- Metadata: read

Avoid broad account tokens.

## Day-to-Day Editing

Use `/editor/` for recurring updates:

- Add or edit event cards
- Upload newsletter PDFs
- Update upcoming and past speakers

Use `/admin/` for broader site edits:

- Meeting details
- Contact email and social links
- Page headlines and body copy
- Page hero images and alt text
- Donation, joining, resources, and Pancake Day page copy
- Events, newsletters, and speakers when a full administrator needs access

## Admin Live Editing

1. Log in at `/admin/`.
2. Choose a page or content file from the left sidebar.
3. Use the live preview to click highlighted text or images.
4. Edit the selected value in the inspector.
5. Click **Stage Change**.
6. Continue through other pages/files as needed.
7. Click **Publish Draft** when all edits are ready.

The structured field editor remains below the preview for fields that are not easy to select visually.

Important: the visual editor publishes JSON-backed changes. Page-specific content JSON handles structured sections, while `src/_data/siteEdits.json` covers the currently rendered hardcoded text/images. Longer term, high-value repeated sections can still be promoted into page-specific content JSON for cleaner structured editing.

For board demos, use `/admin/?adminTest=1` unless you intentionally want a real publish. The test route is designed to show the login, preview, staging, and publish flow without touching the live repository.

## Mistake Recovery

Every save creates a GitHub commit. If someone makes a bad edit, the Admin Portal history can restore a known admin content file from an earlier commit. The restore creates a new GitHub commit, so the recovery is auditable too. A maintainer can also restore a previous file version or revert the commit directly in GitHub.

## Local Development

```bash
cd /Users/cameronanderson/Desktop/Kiwanis/website
npm run dev
```

Then open `http://localhost:8080`.

The public site builds locally. The live editor/admin save APIs require Cloudflare Pages Functions and the environment variables above.
