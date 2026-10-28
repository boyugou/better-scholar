# Publishing Better Scholar on the Chrome Web Store

An ordered checklist, from building the zip to after publishing. Brought up to date on 2026-10-15 for version 2.41.0
(commit `f1cd4f1`), and again on 2026-10-28 for `src/` as of commit `8a21ae41` (still 2.41.0; the commits that update this kit
change no file under `src/`). Nothing has been submitted.

**[Owner]** marks what only the owner can do: the Google account, the fee, the identity checks, the declarations, the
upload and the Submit button. **[Ready]** marks what is prepared in this repository. **[Fix]** marks what must change in the
repository or on the project site before you submit. Nothing in this kit ticks a box or takes a decision for the owner.

## What is in this folder

| File | What it is |
|---|---|
| `chrome/listing.md` | Every dashboard field in dashboard order, with the text to paste: title, summary (and two alternatives), description, category, language, images, Privacy tab answers, distribution, support URLs, reviewer test instructions. |
| `chrome/claims.md` | Every claim in the listing and every Privacy answer mapped to the code that proves it (quotes you can grep), then **Problems found** in PRIVACY.md, the READMEs, the site and the shipped text. |
| `chrome/check-claims.mjs` | `node store/chrome/check-claims.mjs` searches every quote of `claims.md` in the file it names and exits 1 if one is gone. Run it after any change to `src/` before you trust the kit. |
| `chrome/package-check.md` | How to check the zip (a procedure to repeat), and the record for the zip built from this commit: contents, sizes, SHA-256, manifest against the store's limits. |
| `chrome/screenshots-plan.md` | How the images are made (`npm run store:images`), what each shows, what to do when the interface changes, and the wording that is still open. |
| `chrome/images/` | The five screenshots, two promo tiles and the icon, with a README written by the generator. |

The images are made by `npm run store:images` (`scripts/store-images.mjs`) from the real extension. They were regenerated at
2.41.0 (commit `8c5fe05`); make them again if the interface changes before you submit.

## Decisions only the owner can make

1. **Trader or non-trader** (EU Digital Services Act). Google: "it is the developer's responsibility to accurately
   self-declare their trader/non-trader status" and "Each publisher must make their own determination." A trader is asked
   for a legal name and contact details, and "The verified information of traders is available to users of the Chrome Web
   Store." For a non-trader, EU users are told that "consumer rights stemming from consumer protection laws do not apply
   to any contracts between you and the consumer." Google gives no answer for individual cases; it is your call.
2. **The "Personally identifiable information" box** on the Privacy tab. The recommendation is to tick it (names are read
   and stored); see `listing.md`, Data usage.
3. **The summary**: keep the current one, or adopt alternative A or B (then all 30 locales change; `listing.md`).
4. **Category**: Education (recommended), Tools, or Workflow & Planning.
5. **The "Open Scholar in" redirect script.** It is the only part outside roles and ranks: it adds 187 `/*` match patterns
   at document start and may rewrite a Scholar address. It is justified in `listing.md` and does not block. Two ways to
   make it a smaller question: narrow its patterns from `/*` to `/scholar*` and `/citations*` (the only paths it acts on;
   a change to `scripts/update-scholar-domains.sh` and the manifest test), or leave the feature out of the first
   submission, which shrinks the site access to `/citations*`.
6. **Visibility**: Public (recommended), or Unlisted for a quiet start.
7. **Publish automatically after approval**, or hold it and publish by hand (you then have 30 days).
8. **CORE data**: `NOTICE` says "CORE's terms of use have not been confirmed". Ship as is, or ask CORE first.
9. **Edge Add-ons**: whether to submit the same zip there as well (section I). The account is free; Partner Center will ask for
   a description in each of the 30 languages unless a language can be removed.

## A. Before you submit

The privacy policy URL and the homepage URL are part of the submission, and the reviewer compares them with the code. All the
problems the first two checks of this kit found in PRIVACY.md, the site, the READMEs, SECURITY.md, CONTRIBUTING.md, the agent
guide and the images are fixed; what is open is in `chrome/claims.md`, section 4 (rows not marked "Fixed").

1. **The privacy policy.** **[Ready]** (checked 2026-10-28). PRIVACY.md has the second script's scope, the storage list
   (with the venue mappings), the Limited Use statement, the cookies of *Read full lists*, the exact Semantic Scholar request,
   the page events (and what `summary` returns) and the clipboard, every copy button and *Copy as image* included. The site
   builds https://boyugou.github.io/better-scholar/privacy/ from PRIVACY.md itself, so after a change to PRIVACY.md deploy
   the site (`scripts/deploy.sh` in its repository) and the two say the same.
2. **The homepage.** **[Ready]**: the badge says "Runs in your browser", and the search-operator cards show only operators
   the search reads (the site's `scripts/verify.mjs` checks it). Its sentence "A Chrome Web Store version may come later"
   becomes the store link after publishing (step G2).
3. **The images**: **[Ready]**, made again on 2026-10-28 from that day's `main` (`chrome/screenshots-plan.md`). Run
   `npm run store:images` again if the interface changes before you submit.
4. **The READMEs, the agent guide and the settings footer**: **[Ready]**; the findings of the first check are fixed
   (`claims.md` 4.4 and 4.6). A reviewer who opens the repository reads what the code does.
5. If you change anything under `src/` (the agent guide, a locale's summary), raise the version (step H1) before you build,
   run `node store/chrome/check-claims.mjs` and look again at the rows it flags.

## B. Build the package **[Ready]**

1. `git status` is clean and `npm test` passes.
2. `bash scripts/package-chrome.sh`. It checks the bundled data against `data/*.json` and writes
   `dist/better-scholar-chrome-<version>.zip` (`dist/` is git-ignored). No network needed.
3. Check the zip with the procedure in `chrome/package-check.md` (part A): `manifest.json` at the top level, 72 files, no
   development files, the zip is exactly `src/`. The record for 2.41.0 (833,755 bytes, SHA-256, the digest of the contents)
   is in part B.
4. Smoke test: unzip it to a folder, load it with chrome://extensions → Developer mode → Load unpacked, and open the test
   profile from `listing.md` §5.

## C. Developer account **[Owner]**

1. Pick the Google account that will own the item. "After an account is created, you cannot change its email address."
   Use an address you read often.
2. Turn on **2-Step Verification** for that Google account: "2-Step Verification is required for all developer accounts
   prior to publishing an extension or updating an existing extension."
3. Open the Developer Dashboard (https://chrome.google.com/webstore/devconsole), accept the developer agreement and
   policies, and **pay the one-time registration fee**. Google's page does not state the amount; the payment screen shows
   it (it has been US$5 since 2010, per press reports).
4. **Account** page:
   - **Publisher name** (required; shown as "Offered by:").
   - **Contact email**: Add email, then open the verification link the store sends. "Verifying your contact email address
     is required when you set up a new developer account."
   - Physical address: not needed ("Only items that offer functionality to purchase items, additional features, or
     subscriptions must include a physical address").
   - Turn on email notifications "to get an email when your item is published or staged".
5. **Trader / non-trader declaration** (decision 1). "All developers on the Chrome Web Store are required to declare if they
   are a Trader or Non-Trader." A trader's details are verified and shown to users of the store.

## D. Create the item **[Owner]**, with `chrome/listing.md` open

1. **Add new item** → Choose file → the zip from step B → Upload.
2. **Store listing** tab: description, category, language, icon, screenshots, promo tiles, homepage and support URLs.
   The title and summary come from the package and cannot be edited here.
3. **Privacy** tab: single purpose, the `storage` justification, the host justification (if asked), remote code "No", the
   data-usage boxes (decision 2), the three certifications, the privacy policy URL (A1).
4. **Distribution** tab: free, all regions, visibility (decision 6).
5. **Test instructions** tab: paste the block from `listing.md` §5.
6. Save the draft and open each tab once more: no field should be flagged.

## E. Submit **[Owner]**

1. **Submit for review**. In the dialog, leave "publish automatically" ticked, or untick it to publish by hand later
   (decision 7): "Once the review is complete, you will have up to 30 days to publish", after which the submission goes
   back to draft.
2. Review time, in Google's words: "For most extensions, review is completed within a few days, but it can take up to a
   few weeks." "If your extension is pending review for more than three weeks, please contact developer support."

## F. During review

### What will slow this one down

Google lists the signals: "Reviews may take longer for extensions that request broad host permissions or sensitive
execution permissions", "new developers", "new extensions", "dangerous permission requests", "significant code changes",
and "The more code an extension contains, the more work it takes to verify that code is safe." This submission has:

- a new developer and a new extension;
- 374 match patterns over 187 domains, two content scripts, one of them on every Scholar path at `document_start`;
- about 3.1 MB of code and data (814 KB zipped), 973 KB of it the award list;
- automation on a Google site: pressing Scholar's *Show more* by default, and fetching paper pages on a click;
- one third-party request (Semantic Scholar), off by default.

What helps: the justifications and test instructions in `listing.md`, readable (not minified) code, a public repository,
and a privacy policy that matches the code.

### How to answer a reviewer

- "The rejection emails will state which policy the extension violated" (with a reference such as *Purple Potassium*,
  excessive permissions, or *Purple Lithium*, privacy policy) and how to appeal. "Review verdicts and account suspensions
  can be appealed from the Chrome Web Store developer dashboard"; other questions go through the One Stop Support form
  (https://support.google.com/chrome_webstore/contact/one_stop_support). "Once a ticket is opened or an appeal filed, all
  communication takes place over email", and "it may take up to three days to receive a reply."
- If the reviewer is right, fix it, raise the version, upload and resubmit; say in the reply what changed and where.
- If the reviewer misread something, answer with the file and the line of code (look it up when you write the reply: line
  numbers change with every commit). Keep it short, factual and polite; one reply per point. For example:

  > Thank you for the review. The second content script (the second entry of "content_scripts" in manifest.json, which runs
  > lib/i18n.js and content/lang-redirect.js) is the "Open Scholar in" language setting. It returns at once unless the path
  > is /scholar or /citations (the test of location.pathname at the top of lang-redirect.js), and it acts only when the user
  > has chosen a language in the settings (off by default); it then reopens the page with that hl= value. It reads no page
  > content and makes no request. If you prefer, we will narrow its match patterns to those two paths.

- Answers prepared for likely questions are in `listing.md` (host access, remote code, data use) and `chrome/claims.md`
  (evidence by file and a quote you can grep).

## G. After publishing

1. **[Owner]** Note the item ID and store URL. Install from the store in a fresh Chrome profile, open the test profile,
   check the panel, the popup and the settings page.
2. **[Fix]** Put the store link on the homepage ("A Chrome Web Store version may come later" becomes the link), in README.md
   and README.zh-CN.md (Install), and in the site's language versions.
3. **[Owner]** Watch the support URL (GitHub issues) and the store's reviews.
4. Whenever the data handling changes, change PRIVACY.md, the site copy and the Privacy tab together.

## H. Updating the published extension

1. Raise `"version"` in `src/manifest.json`: the package script, the settings page footer and the `ping` page call all read it
   from there. "Each new version must have a larger version number than the previous version", e.g. 2.41.0 → 2.41.1. Then
   `npm run agents:doc` (the title of `AGENTS.md` carries the version, and `npm test` fails while it is stale) and add a
   `CHANGELOG.md` entry.
2. `npm test`, `bash scripts/package-chrome.sh`, then in the dashboard: the item → Package → upload the new zip, update the
   listing or the Privacy tab if behaviour changed, Submit for review. "When you submit an update for review, it doesn't
   yet affect your published item."
3. Updates are reviewed like the first submission. A new permission or site makes Chrome ask existing users to accept it
   ("users will be prompted to accept them or disable the extension") and lengthens the review, so avoid adding any.
   Percentage rollout is offered only to items with more than 10,000 seven-day active users.

## I. Microsoft Edge Add-ons

The same zip works. What differs:

- **Account**: Partner Center with a Microsoft account (an Individual account is enough). "There is no registration fee
  for submitting extensions to the Microsoft Edge program." The publisher display name is at most 50 characters.
- **Languages**: Partner Center reads the languages from the package's `__MSG_` name and description, so it will list
  all 30. "The following Required properties must be provided for each language … Description, Extension logo." The
  description must be 250 to 10,000 characters. Plan for 30 descriptions (the English one in `listing.md` is the base).
  The Store listings page also has a **Remove** action per language row; the documentation does not say whether it
  accepts removing a language the package contains, so try it before translating. The extension keeps all 30 interface
  languages either way.
- **Name and short description** come from the manifest and are read-only there too.
- **Images**: logo 1:1, 300×300 recommended, 128×128 minimum (the 128 px icon is accepted); screenshots at most 6, 640×480
  or 1280×800; small tile 440×280, optional; large tile 1400×560 **PNG** ("The size of the PNG files must be 1400 x 560
  pixels"), optional, so convert `promo-marquee.jpg`.
- **Availability**: Public or Hidden, and markets (all by default).
- **Properties**: category, website, support contact, mature content.
- **Privacy** page: the same five sections as Chrome's (single purpose, permission justification, remote code, data usage
  with certifications, privacy policy URL); reuse `listing.md` §3. "Any incomplete, misleading, or inaccurate disclosures
  … can result in additional review, delayed certification, or rejection."
- **Search terms**: up to 7 terms, 30 characters each, 21 words in all (not shown to users).
- **Notes for certification**: paste the test instructions from `listing.md` §5.
- Review: "The certification process can take up to seven business days."

## Sources (read on 2026-10-15)

Chrome Web Store:

- https://developer.chrome.com/docs/webstore/register
- https://developer.chrome.com/docs/webstore/set-up-account
- https://developer.chrome.com/docs/webstore/program-policies/two-step-verification
- https://developer.chrome.com/docs/webstore/program-policies/trader-disclosure
- https://developer.chrome.com/docs/webstore/program-policies/trader-verification-faq
- https://developer.chrome.com/docs/webstore/prepare
- https://developer.chrome.com/docs/webstore/publish
- https://developer.chrome.com/docs/webstore/cws-dashboard-listing
- https://developer.chrome.com/docs/webstore/images
- https://developer.chrome.com/docs/webstore/best-listing
- https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- https://developer.chrome.com/docs/webstore/cws-dashboard-distribution
- https://developer.chrome.com/docs/webstore/cws-dashboard-test-instructions
- https://developer.chrome.com/docs/webstore/review-process
- https://developer.chrome.com/docs/webstore/update
- https://developer.chrome.com/docs/webstore/troubleshooting
- https://developer.chrome.com/docs/webstore/program-policies/policies
- https://developer.chrome.com/docs/webstore/program-policies/limited-use/
- https://developer.chrome.com/docs/webstore/program-policies/user-data-faq
- https://developer.chrome.com/docs/extensions/reference/manifest/name
- https://developer.chrome.com/docs/extensions/reference/manifest/short-name
- https://developer.chrome.com/docs/extensions/reference/manifest/description
- https://developer.chrome.com/docs/extensions/reference/manifest/icons
- https://chromewebstore.google.com/category/extensions/productivity/education (and `/tools`, `/workflow`)
- https://9to5google.com/2020/11/18/chrome-web-store-disclosure/ (wording of the data categories and certifications as
  announced in 2020; the live form is the authority)
- https://www.computerworld.com/article/1554628/google-makes-chrome-devs-dig-into-pockets.html (the US$5 fee, 2010)

Microsoft Edge:

- https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/publish-extension
- https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/create-dev-account

Re-read for the 2.41.0 update (also on 2026-10-15): the manifest reference for `name`, `short_name` and `description`, "Prepare
your extension", "Publish in the Chrome Web Store" (the 2GB limit), "Supplying images" (the sizes) and "Provide test
instructions" (no length limit is stated). The rest of the list above was read for the first version and not read again.

Project pages checked on 2026-10-28 (the test profile on 2026-10-15; the kit does not load Scholar again without need):

- https://boyugou.github.io/better-scholar/privacy/ (downloaded with `curl`): built from the repository's PRIVACY.md (the
  site keeps no copy); it has the Limited Use statement, the clipboard section with *Copy as image*, the venue mappings,
  and no stray asterisk (`chrome/claims.md` 4.2)
- https://boyugou.github.io/better-scholar/en/ (downloaded with `curl`): the badge says "Runs in your browser"; the search
  cards show only operators the search reads (`chrome/claims.md` 4.3); "A Chrome Web Store version may come later."
- https://www.google.com/supported_domains (downloaded with `curl`): 187 domains, the same as the manifest's (again on 2026-10-28)
- https://scholar.google.com/citations?user=JicYPdAAAAAJ&hl=en (the reviewer's test profile; reachable, 20 papers on the
  first page for a signed-out visit; the five example rows of `listing.md` are numbers 1 to 5)
