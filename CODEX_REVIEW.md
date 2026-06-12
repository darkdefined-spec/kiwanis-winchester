# Kiwanis Club of Winchester — Website Rebuild: Codex Review Report

**Prepared for:** Codex Code Review  
**Project:** Full website rebuild for the Kiwanis Club of Winchester, Virginia  
**Original live site:** https://winvakiw.org/  
**Working directory:** `/Users/cameronanderson/Desktop/Kiwanis/website/`  
**Review requested by:** Cameron Anderson (designer, project owner)

---

## 1. Project Brief

The original WordPress site at **https://winvakiw.org/** was rebuilt from scratch as a static HTML site. The goals were:

- Recreate every page from the original site with content parity
- Modernize the design using 2026 UI/UX trends (floating nav, scroll reveal, bento grids, large display numbers)
- Match the **official Kiwanis International brand identity** — Blue `#003DA5`, Gold `#FFD100`, Navy `#001A5C`
- Use pure HTML + Tailwind CDN (no build tools) for maximum portability
- Reference all images directly from the original WordPress CDN (`winvakiw.org/wp-content/uploads/`) — no local copies
- Hero section uses a `<video>` element with a poster image placeholder; the `<source>` tag is commented out for the owner to fill with their custom video file
- WCAG accessibility compliance: semantic HTML5, ARIA labels, skip-to-content link, `prefers-reduced-motion` support

The original site had 10 pages. These were consolidated to **8 pages** without any content loss:
- "About Us" + "History of Winchester Kiwanis Club" → merged into `about.html`
- "Recent Events" + "Newsletters" → merged into `events.html`

---

## 2. File Manifest

| File | Lines | Purpose |
|------|-------|---------|
| `css/kiwanis.css` | 749 | Full shared design system (tokens, nav, components, footer, animations) |
| `index.html` | 542 | Homepage |
| `about.html` | 442 | About + History (merged) |
| `what-we-do.html` | 324 | Programs overview |
| `youth-programs.html` | 377 | K Clubs, Builder's Clubs, Circle K |
| `pancake-day.html` | 349 | Annual Pancake Day event page |
| `events.html` | 337 | Recent Events + Newsletter archive (merged) |
| `join.html` | 318 | Membership recruitment page |
| `contact.html` | 357 | Contact info, leadership team, contact form |
| **Total** | **3,795** | |

---

## 3. Design System (`css/kiwanis.css`)

### CSS Custom Properties (Brand Tokens)

```css
--kw-blue: #003DA5;        /* Kiwanis International official blue */
--kw-gold: #FFD100;        /* Kiwanis International official gold */
--kw-navy: #001A5C;        /* Deep navy for dark sections */
--kw-blue-light: #EBF1FC;  /* Tinted background for cards/chips */
--kw-dark: #0D1B3E;
--kw-body: #374151;
--kw-muted: #6B7280;
--kw-light: #F8FAFF;
--kw-border: #E5EAF4;
--font-display: 'Plus Jakarta Sans';  /* Headings, wt 400–800 */
--font-body: 'Inter';                  /* Body, wt 400–600 */
--nav-h: 76px;
--radius-card: 16px;
```

### Components Defined

- **Navbar** — floating with `backdrop-filter: blur(16px)`, `#navbar.scrolled` state adds box-shadow on scroll via JS
- **Mobile menu** — slides in from right (`right: -100%` → `right: 0` when `.open`), overlay dims background
- **Buttons** — `.btn-primary` (blue), `.btn-gold` (gold/navy text), `.btn-outline-white`, `.btn-outline-blue`, `.btn-sm`
- **Tags/chips** — `.tag.tag-blue`, `.tag.tag-gold`
- **Gold gradient text** — `.gold-gradient-text` using `linear-gradient` + `background-clip: text`
- **Hero** — full-viewport with `linear-gradient` overlay on video; `.page-hero` for inner pages
- **Stats bar** — dark navy band with large display numbers
- **Program cards** — `.program-card` with hover lift
- **Featured banner** — `.featured-banner` (navy with gold border-left accent)
- **Photo gallery** — CSS grid, hover scale on images
- **Newsletter cards** — `.newsletter-card` with hover
- **Contact cards** — `.contact-card` with centered icon, padding
- **Form** — `.form-group`, `.form-label`, `.form-input`, `.form-textarea`
- **Footer** — dark navy, 4-column grid, `.footer-col-title`, `.footer-link`, `.footer-divider`
- **Scroll reveal** — `.reveal` (opacity 0, translateY 28px) animated to visible via IntersectionObserver; delay variants `.reveal-d1` through `.reveal-d5`
- **Reduced motion** — `@media (prefers-reduced-motion: reduce)` disables all transitions and reveal animations

---

## 4. Page-by-Page Content Audit

### 4.1 `index.html` — Homepage

**Sections (in order):**
1. Skip-to-content link
2. Navbar + mobile menu (shared pattern)
3. **Hero** — `<video autoplay muted loop playsinline poster="https://winvakiw.org/wp-content/uploads/2023/02/Bright-Futures.png">` — `<source>` is commented out, ready for custom video
4. **Stats bar** — "Est. 1922 / 8 Active Programs / 500+ Bags/Month / 52 Meetings/Year"
5. **Mission + 6 Objects of Kiwanis** — official Kiwanis Objects quoted verbatim
6. **8 Program cards** — Salvation Army, Blood Drives, Kids Christmas Party, Highway Cleanup, Pancake Day, Bright Futures, K Clubs, Scholarships
7. **Pancake Day featured banner** — 4 stat tiles, link to `pancake-day.html`
8. **Global impact** — dark blue section: 150K+ projects, $100M+, 80+ countries, 600K+ members
9. **About preview** — Bruce Brill photo from WP CDN
10. **Join CTA** — links to `join.html`
11. Footer (shared pattern)

**Please verify:**
- [ ] Hero video poster image URL resolves: `https://winvakiw.org/wp-content/uploads/2023/02/Bright-Futures.png`
- [ ] Bruce Brill photo URL resolves: `https://winvakiw.org/wp-content/uploads/2023/03/Bruce-3-701x1024.jpg`
- [ ] All 8 program cards render without layout break on mobile (375px)
- [ ] Nav active state on "Home" link

---

### 4.2 `about.html` — About + History

**Sections:**
1. Page hero: "Our Story"
2. Club overview — meeting details card (Wednesdays noon, Moose Club, 215 E. Cork St.)
3. Mission card + Vision card (navy)
4. Global impact stats: 1922 / 150K+ projects / $100M+ / 80+ countries
5. 5-club Kiwanis family (K-Kids, Builder's, Key Club, Circle K, Aktion)
6. Leadership team — Mike Didawick (President), Ryan Taylor (PR Chair), Brenda Dodd (Secretary)
7. **Decade history photo gallery** — 1920s through 2020s using URL pattern:
   `https://winvakiw.org/wp-content/uploads/2023/10/[decade]s-pics-1-1024x791.jpg`
   (e.g., `1920s-pics-1-1024x791.jpg`, `1930s-pics-1-1024x791.jpg` ... `2010s-pics-1-1024x791.jpg`)
   Note: 2020s uses a different upload path — verify this URL resolves correctly
8. Join CTA (blue)

**Please verify:**
- [ ] All decade photo URLs resolve (1920s–2020s)
- [ ] Leadership section — confirm no email addresses for Ryan Taylor (he has no listed email on original site)
- [ ] "5-club family" terminology matches current Kiwanis International structure

---

### 4.3 `what-we-do.html` — Programs

**Sections:**
1. Page hero: "What We Do"
2. **8 program article cards** with full descriptions:
   - Salvation Army Bell Ringing (holiday season)
   - American Red Cross Blood Drives
   - Kids Christmas Party
   - Winchester Roadway Cleanup (Hwy 37 adoption)
   - Pancake Day (card links to `pancake-day.html`)
   - Bright Futures (500+ backpacks/month, $7,000+ to Highland Food Pantry)
   - K Clubs (links to `youth-programs.html`)
   - Scholarships
3. Pancake Day CTA banner at bottom

**Please verify:**
- [ ] "$7,000+ to Highland Food Pantry" — confirm this figure matches the original site
- [ ] "500+ bags/month" for Bright Futures — confirm against original site
- [ ] Highway 37 is the correct highway for the cleanup program (original site says "Route 37")

---

### 4.4 `youth-programs.html` — Youth Programs

**Sections:**
1. Page hero: "Youth Programs"
2. **Key Clubs** — 3 cards: Handley High School, James Wood High School, Millbrook High School
3. **Builder's Clubs** — 3 cards: Frederick County MS, James Wood MS, Daniel Morgan MS
4. **Circle K** — 3 core values cards (Service, Leadership, Fellowship) in blue panel
5. **K Clubs family chart** — 4-column grid: K-Kids / Builder's / Key Club / Circle K (with age ranges)
6. Join / mentor CTA

**Please verify:**
- [ ] Confirm all 6 school names (3 Key Clubs, 3 Builder's Clubs) match the original site exactly
- [ ] Confirm age ranges listed in the family chart are accurate per Kiwanis International
- [ ] Circle K vision quote: "We are caring and competent servant leaders transforming communities worldwide." — verify this is the official Key Club vision (not Circle K's)

---

### 4.5 `pancake-day.html` — Pancake Day

**Sections:**
1. **Full-screen hero** — `https://winvakiw.org/wp-content/uploads/2023/02/Pancake.png` with overlay
2. Event details card: 8am–4pm, Jim Barnett Park War Memorial Building, 1001 E Cork St, Winchester VA 22601
3. **Sticky ticket sidebar** — dark navy card, links to `https://kiwanis-club-of-winchester-103611.square.site/`
4. **Stat tiles** — "1 ton sausage / 1,000s of pancakes / 8am–4pm / Free for kids 3 & under"
5. **Beneficiaries** — ChildSafe Center (20% of net proceeds), I'm Just Me Movement (2026 Major Beneficiary), food donation drive
6. Volunteer section

**Important notes:**
- The 2026 event date (April 25, 2026) has now passed. The page uses language like "Annual spring event — check back for next year's date." Please verify this language handles the post-event state gracefully.
- The Square ticketing link is live and was accurate at time of build: `https://kiwanis-club-of-winchester-103611.square.site/`

**Please verify:**
- [ ] Square ticketing URL still resolves (external link)
- [ ] "ChildSafe Center" is correctly named (some sources spell it differently)
- [ ] "I'm Just Me Movement" — confirm spelling and that they are the 2026 Major Beneficiary
- [ ] Sticky sidebar behavior on mobile: sidebar should collapse below event details on narrow viewports
- [ ] Pancake hero image URL resolves: `https://winvakiw.org/wp-content/uploads/2023/02/Pancake.png`

---

### 4.6 `events.html` — Recent Events + Newsletters

**Sections:**
1. Page hero: "Events & News"
2. **Sticky tab navigation** — "Recent Events" | "Newsletters" (smooth scroll to anchors)
3. **Annual Picnic 2024 gallery** — 4 images from WP CDN: `Picnic-13`, `Picnic-5`, `Picnic-15`, `Picnic-22`
4. **Bright Futures photos** — `Bright-Futures.png` + `highland-food-IMG_7580.jpg`
5. **Member photos** — `Conrad.jpeg` + `Bruce-3-701x1024.jpg`
6. Facebook CTA banner
7. **Newsletter archive:**
   - 2026: January
   - 2025: January through December (12 months, all with PDF links)
   - 2021–2024: linked to original site's newsletter archive page

**Newsletter PDF URL pattern used:**
`https://winvakiw.org/wp-content/uploads/[YEAR]/[MONTH]/Winchester-Kiwanis-[Month]-[YEAR]-Newsletter.pdf`

**Please verify:**
- [ ] All picnic photo URLs resolve (pattern: `https://winvakiw.org/wp-content/uploads/2024/09/Picnic-[N].jpg` or similar)
- [ ] Spot-check 3–4 newsletter PDF URLs to confirm they resolve (especially 2026 January and 2025 December)
- [ ] Tab navigation anchors (`#recent-events` and `#newsletters`) scroll correctly and don't land behind the sticky navbar
- [ ] Older years link correctly back to `https://winvakiw.org/newsletters/` or equivalent

---

### 4.7 `join.html` — Become a Member

**Sections:**
1. Page hero: "Become a Member"
2. **4 benefit cards** — Make a Real Impact / Build Real Friendships / Develop as a Leader / Join a Global Network
3. **3-step process** — Email → Visit a Meeting → Join (step 3 uses gold circle)
4. **Meeting info column** — with icon rows (when/where/contact)
5. **Dark navy CTA card** — "Email pres@winvakiw.org" button + "typically respond within 24–48 hours"
6. **4-question FAQ** — no special skills / time commitment / guest visits / membership fees

**Please verify:**
- [ ] `pres@winvakiw.org` email link is correct (this is the membership contact per original site)
- [ ] "Winchester Moose Club, 215 E. Cork St." — confirm this address on original site
- [ ] FAQ answer on membership fees is appropriately vague (exact fee not publicly listed; answer says to contact for current info)
- [ ] Nav active state shows "Join Us" button as active/highlighted

---

### 4.8 `contact.html` — Contact

**Sections:**
1. Page hero: "Get in Touch"
2. **3 contact cards** — Email (`sec@winvakiw.org`) / Mailing address (P.O. Box 2591 Winchester VA 22604) / Facebook (`@winkiwanis`)
3. **Leadership team** — 3 tiles: Mike Didawick (President, `pres@winvakiw.org`), Ryan Taylor (PR Chair, no email shown), Brenda Dodd (Secretary, `sec@winvakiw.org`)
4. **HTML contact form** — first/last name, email, subject, message textarea, interest checkboxes (membership / volunteering / Pancake Day / youth programs / other)
   - Form uses `action="mailto:sec@winvakiw.org" method="post" enctype="text/plain"` — native mailto, no server-side processing
5. **Sidebar info panel** — dark navy card with meetings/location/email/Facebook
6. Join CTA card (blue-light background)

**Please verify:**
- [ ] `sec@winvakiw.org` is the correct secretary/general contact (not an outdated address)
- [ ] P.O. Box 2591, Winchester VA 22604 — confirm against original site
- [ ] `mailto:` form is acceptable for client (no server-side email processing required)
- [ ] Ryan Taylor's role title: "Public Relations Chair" — confirm against original site
- [ ] Facebook URL: `https://www.facebook.com/winkiwanis` — confirm handle is current

---

## 5. Shared Patterns (Every Page)

Every HTML file implements the same shared boilerplate. Please verify these are consistent and correct across all 8 pages:

### Navigation
- Logo: `https://winvakiw.org/wp-content/uploads/2023/03/logo-1C-e1677883446960.png`
- Links: Home | About | What We Do ▼ (Programs, Youth Programs) | Pancake Day | Events ▼ (Recent Events, Newsletters) | Contact | [Join Us — gold button]
- Dropdown menus on "What We Do" and "Events"
- Active state: each page should mark its own nav link as active (check all 8)

### Mobile Menu
- Hamburger trigger (`#mobile-toggle`) opens `#mobile-menu` from right
- Close button (`#mobile-close`) and overlay click both close it
- `Escape` key closes menu
- `aria-expanded` toggled on hamburger button
- `document.body.style.overflow = 'hidden'` prevents scroll when open

### Footer
- Consistent across all 8 pages
- 4-column grid: brand/description | quick nav | contact info
- `filter:brightness(0) invert(1)` on logo to make it white on dark background
- Copyright: "© 2024 Kiwanis Club of Winchester, Virginia"
- Note: year reads 2024 — this should probably be updated to 2026

### Scroll Reveal JS
```javascript
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
```

---

## 6. Known Issues / Items to Flag

| # | Issue | Severity | File(s) |
|---|-------|----------|---------|
| 1 | Footer copyright year reads "© 2024" — should be © 2026 | Low | All 8 HTML files |
| 2 | Pancake Day event date (April 25, 2026) is now past — page copy handles this but should be audited for any date-specific CTAs that may read awkwardly | Low | `pancake-day.html` |
| 3 | `mailto:` contact form — no spam protection, no success confirmation to user | Low | `contact.html` |
| 4 | Decade history photo URL for 2020s may differ from the 1920s–2010s pattern — needs verification that the WP CDN URL resolves | Medium | `about.html` |
| 5 | Newsletter PDF URLs for 2026 January were inferred from the URL pattern — not confirmed to exist at time of build | Medium | `events.html` |
| 6 | No `<link rel="icon">` / favicon defined | Low | All 8 HTML files |
| 7 | No `<meta property="og:*">` OpenGraph tags for social sharing | Low | All 8 HTML files |
| 8 | Tailwind is loaded via CDN (`<script src="https://cdn.tailwindcss.com">`). This is intentional (no build tools), but Tailwind CDN injects a `<style>` block and may flash on slow connections | Info | All 8 HTML files |

---

## 7. What Codex Should Check

### Code Quality
1. **HTML validity** — Run each file through an HTML validator. Check for unclosed tags, duplicate IDs, invalid nesting.
2. **Accessibility** — Verify every `<img>` has a meaningful `alt` attribute. Verify all interactive elements (buttons, links) have accessible names. Verify form `<label>` associations (`for` + `id` pairs) in `contact.html`.
3. **ARIA correctness** — Check `aria-expanded`, `aria-label`, `aria-modal`, `aria-hidden` usage on the mobile menu pattern in all 8 files for consistency.
4. **Active nav states** — Each page should mark its own nav item as active. Verify `about.html` marks About, `contact.html` marks Contact, etc. The join.html page marks the "Join Us" gold button; verify it has a distinct active style.
5. **Duplicate code** — The navbar, mobile menu, footer, and JS block are copy-pasted across all 8 files (intentional, no build tools). Verify they are identical where they should be identical.

### CSS Integrity
6. **CSS custom properties** — Verify all `var(--kw-*)` tokens used in HTML inline styles are defined in `css/kiwanis.css`.
7. **Class availability** — All Tailwind utility classes are delivered by CDN (not purged). Spot-check that custom CSS classes used in HTML (`reveal`, `reveal-d1`–`reveal-d5`, `btn`, `btn-gold`, `page-hero`, `kw-container`, `contact-card`, etc.) are defined in `kiwanis.css`.
8. **Responsive breakpoints** — Verify `hide-mobile` / `hide-desktop` utility classes are defined in the CSS and behave correctly (these toggle the "Join Us" nav button vs hamburger).

### Link & Asset Integrity
9. **Internal links** — Verify all `href` values in nav, footer, and body CTAs point to existing files in the directory (e.g., no broken relative paths).
10. **External image URLs** — Spot-check 5–6 `winvakiw.org/wp-content/uploads/` image URLs. The originals should still be live since the original WordPress site is still up.
11. **Email links** — `mailto:pres@winvakiw.org` and `mailto:sec@winvakiw.org` should be present and consistent.
12. **Square ticketing link** — `https://kiwanis-club-of-winchester-103611.square.site/` on `pancake-day.html`.

### JavaScript
13. **Mobile menu** — The open/close logic is pasted into every page's `<script>` block. Verify `toggle`, `close`, `menu`, and `overlay` element IDs exist in every HTML file and match what the JS references.
14. **Scroll reveal observer** — Verify `.reveal` elements exist on every page and the JS block is present on every page.
15. **Navbar scroll** — `window.scrollY > 20` toggle for `.scrolled` class — verify `#navbar` ID exists in every file.

---

## 8. Original Site Reference

Compare the rebuilt site against the original WordPress installation at **https://winvakiw.org/** for:

- Content accuracy (names, addresses, phone numbers, dates, dollar figures, statistics)
- Program descriptions (especially Bright Futures bag counts and food pantry donation figures)
- School names in the youth programs section
- Newsletter PDF links (navigate to `https://winvakiw.org/newsletter/` or equivalent)
- Leadership team names and roles
- Any pages that exist on the original site but may not have been captured in this rebuild

---

*Report generated for Codex review. All source files are in `/Users/cameronanderson/Desktop/Kiwanis/website/`. The original live site remains at https://winvakiw.org/ for cross-reference.*
