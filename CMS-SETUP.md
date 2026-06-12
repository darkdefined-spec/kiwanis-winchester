# Kiwanis Website — CMS & Deployment Setup Guide

This document covers everything needed to take the site from local files to a fully live, CMS-editable website. Complete the steps in order.

---

## Overview of the Stack

| Layer | Tool | Purpose |
|---|---|---|
| Static site generator | Eleventy (11ty) | Converts templates + Markdown into HTML |
| CMS admin UI | Sveltia CMS | WordPress-like editor at `/admin/` |
| Hosting | Cloudflare Pages | Rebuilds site on every GitHub push |
| Content storage | GitHub | All content edits are git commits |
| CMS authentication | Cloudflare Worker (sveltia-cms-auth) | GitHub OAuth proxy |

---

## Step 1 — Create the GitHub Repository

1. Go to [github.com](https://github.com) and sign in (or create an account).
2. Click **New repository**.
3. Name it `kiwanis-winchester` (or any name you prefer).
4. Set it to **Public** (required for Cloudflare Pages free tier; private works on paid plans).
5. Do **not** initialize with a README — the repo already has files.
6. Click **Create repository**.
7. Copy the remote URL shown (e.g. `https://github.com/YOUR_USERNAME/kiwanis-winchester.git`).

---

## Step 2 — Push the Code to GitHub

Open Terminal and run:

```bash
cd /Users/cameronanderson/Desktop/Kiwanis/website
git remote add origin https://github.com/YOUR_USERNAME/kiwanis-winchester.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

---

## Step 3 — Connect Cloudflare Pages

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com).
2. Go to **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Authorize GitHub and select the `kiwanis-winchester` repository.
4. Under **Build settings**, set:
   - **Framework preset**: None
   - **Build command**: `npx @11ty/eleventy`
   - **Build output directory**: `_site`
5. Click **Save and Deploy**.

Cloudflare will build and publish the site. Every future git push to `main` triggers an automatic rebuild.

After the first deploy, note your Cloudflare Pages URL (e.g. `https://kiwanis-winchester.pages.dev`). You can add your custom domain (winvakiw.org) in the Pages → Custom Domains tab.

---

## Step 4 — Create a GitHub OAuth App

This is needed so the CMS can authenticate editors via GitHub login.

1. Go to **GitHub** → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**.
2. Fill in:
   - **Application name**: `Kiwanis Winchester CMS`
   - **Homepage URL**: `https://winvakiw.org` (or your Pages URL)
   - **Authorization callback URL**: `https://YOUR_AUTH_WORKER.workers.dev/callback`
     *(You'll fill in the worker URL after Step 5 — you can update this later)*
3. Click **Register application**.
4. Click **Generate a new client secret**.
5. Save both the **Client ID** and **Client Secret** — you'll need them in Step 5.

---

## Step 5 — Deploy the Auth Worker (sveltia-cms-auth)

This Cloudflare Worker handles the GitHub OAuth flow securely.

```bash
# Install wrangler if you haven't
npm install -g wrangler
wrangler login

# Clone and deploy the auth worker
git clone https://github.com/sveltia/sveltia-cms-auth.git /tmp/sveltia-cms-auth
cd /tmp/sveltia-cms-auth
npm install
wrangler deploy

# Set your GitHub OAuth secrets
wrangler secret put GITHUB_CLIENT_ID
# (paste your Client ID when prompted)

wrangler secret put GITHUB_CLIENT_SECRET
# (paste your Client Secret when prompted)
```

After `wrangler deploy`, you'll get a worker URL like `https://sveltia-cms-auth.YOUR_SUBDOMAIN.workers.dev`.

Go back to your GitHub OAuth App and update the **Authorization callback URL** to:
`https://sveltia-cms-auth.YOUR_SUBDOMAIN.workers.dev/callback`

---

## Step 6 — Update the CMS Config

Open `src/admin/config.yml` in the site files and replace the two placeholder values:

```yaml
backend:
  name: github
  repo: YOUR_USERNAME/kiwanis-winchester   # ← replace this
  branch: main
  base_url: https://sveltia-cms-auth.YOUR_SUBDOMAIN.workers.dev  # ← replace this
```

Save, commit, and push:

```bash
cd /Users/cameronanderson/Desktop/Kiwanis/website
git add src/admin/config.yml
git commit -m "Configure CMS with GitHub repo and auth worker"
git push
```

Cloudflare Pages will rebuild automatically.

---

## Step 7 — Log in to the CMS

1. Go to `https://winvakiw.org/admin/` (or your Pages URL + `/admin/`).
2. Click **Login with GitHub**.
3. Authorize the OAuth app.
4. You'll land in the Sveltia CMS dashboard — it works like WordPress.

---

## Day-to-Day Content Editing

### Adding an Event
1. Go to `/admin/` → **Events** → **New Event**.
2. Fill in: Title, Date, Category, Event Meta (short subtitle), Header Color, optional Facebook URL.
3. Add photos using the photo list — each has a Source URL and Alt text.
4. Click **Save** — this creates a git commit, which triggers a Cloudflare rebuild (takes ~30 seconds).

### Adding a Newsletter
1. Go to `/admin/` → **Newsletters** → **New Newsletter**.
2. Fill in: Title (e.g. "March 2026"), Date, and PDF URL.
3. The PDF itself must be uploaded to `src/assets/uploads/YEAR/MONTH/` first — use the **Media** tab in the CMS or upload directly to GitHub.
4. Save → auto-rebuild.

### Uploading Photos/PDFs
- Use the **Media** tab in the CMS admin, or
- Upload directly to `src/assets/uploads/` in the GitHub repo web interface.
- Files in `src/assets/uploads/` are copied to the live site at `/assets/uploads/`.

### Editing Site-Wide Settings
1. Go to `/admin/` → **Settings** → **Site Settings**.
2. Edit meeting info, contact email, address, social links, etc.
3. Save → rebuild.

---

## Local Development

To preview changes locally before pushing:

```bash
cd /Users/cameronanderson/Desktop/Kiwanis/website
export PATH="/usr/local/bin:$PATH"
npm run dev
```

Then open `http://localhost:8080` in your browser. The site live-reloads as you edit files.

---

## File Structure Reference

```
website/
├── src/
│   ├── _layouts/        # Page templates (base.njk)
│   ├── _includes/       # Nav, footer, scripts partials
│   ├── _data/           # site.json — global site data
│   ├── content/
│   │   ├── events/      # One .md file per event (managed by CMS)
│   │   └── newsletters/ # One .md file per newsletter (managed by CMS)
│   ├── assets/          # Images, uploads, favicons
│   ├── css/             # Stylesheets
│   ├── admin/           # Sveltia CMS (config.yml + index.html)
│   ├── index.njk        # Home page
│   ├── about.njk
│   ├── events.njk       # Data-driven — auto-populates from content/events/
│   ├── what-we-do.njk
│   ├── youth-programs.njk
│   ├── pancake-day.njk
│   ├── resources.njk
│   ├── join.njk
│   ├── donate.njk
│   └── contact.njk
├── _site/               # Build output (auto-generated, not in git)
├── .eleventy.js         # Eleventy configuration
├── package.json
├── wrangler.toml        # Cloudflare Pages config
└── CMS-SETUP.md         # This file
```
