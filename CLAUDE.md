# Eclipse Web

The official site for the Eclipse overlay: landing page, community Wardrobe and Showcase, dressing room and game sync. It replaced `kirazul.github.io/Eclipse`, so nothing here may depend on that host.

This repo is public. Keep secrets, project IDs and personal details out of commits and this file.

`GOALS.md` (product intent) and `TASKS.md` (open work) are gitignored local notes. They can lag the code, so confirm a claim against the code before acting on it.

## Verify

A change is done when all four pass:

```bash
pnpm test
pnpm typecheck
pnpm exec eslint src
NEXT_DIST_DIR=.next-build pnpm build   # then delete .next-build
```

Always set `NEXT_DIST_DIR` for a build, and run only one Next server in this repo. A bare build or a second `next dev` shares `.next` with a running dev server and leaves it returning 500.

## Ship

Production is `eclipsewow.vercel.app`, and every push to `main` deploys it. `eclipse-web.vercel.app` is a stranger's site. Any domain we add stays free of personal names.

`dev` is the last known-good `main`, kept as the backup. It moves only to commits `main` already has, so it never receives its own commits. Updates run in this order:

1. Branch from `main` and open the PR into `main`.
2. Before merging, confirm `dev` equals `origin/main`.
3. Merge, with seolyam's go-ahead for that specific merge.
4. Verify live: the Vercel status is `success`, the changed routes answer on production, and the changed behaviour works in a real browser. A green build alone proves only that it built.
5. Healthy: fast-forward with `git push origin main:dev`. A rejected push means `dev` diverged, so stop and find out why.
6. Broken: leave `dev` alone. Roll production back in Vercel if the site is down, then restore `main` with `git revert -m 1 <merge>`.

Preview deployments sit behind protection, so test them with `vercel curl <path> --deployment <url>`.

Commit subjects are `feat:`, `fix:` or `perf:` plus a plain sentence about the visitor-facing result.

## Ask seolyam first

- Pushing or merging to `main`.
- Applying migrations to the production database.
- Changing environment variables.
- Force-pushing or deleting branches.
- Anything billed, including changes that raise `/game-cdn` traffic, which counts as our bandwidth.

## Tools

Use the CLIs: `pnpm exec supabase` and the global `vercel`. Reach for an MCP only for Supabase auth logs, which the CLI cannot read. Migrations are written in `supabase/migrations/` and applied with `pnpm exec supabase db push`, so the database history matches the repo.

- **Migration before code:** apply a migration before merging code that reads what it adds, and write it so the live code still runs on it. Removing something takes two steps: first ship code that stops reading it, then drop it. The local dev server uses the production database, so it breaks the same way production would.

## Site content

- **Authentic art:** WoW classes, races, items, spells and slots use real WoW or Eclipse assets. Lucide is for site controls only. If no authentic asset exists, stop and ask.
- **Real data:** show only what was recorded. With nothing recorded, the site shows nothing or the neutral real asset, even for examples.
- **Vague about infrastructure:** visitor-facing text says "service providers" and "our hosting provider". It leaves out vendors, server locations and build details. Services visitors can already see, such as Discord and YouTube, may be named.
- **Narcissus art:** used by agreement under CC BY-NC-SA 4.0. Keep the credit wherever it appears and keep Eclipse non-commercial. Use its art only, never its code.

## Code traps

- **sharp** is pinned to 0.34.5 with a pnpm override, because 0.35 builds fine and then fails to load on Vercel. Raising it needs a real screenshot upload on production as proof. Keep it lazily imported in `src/lib/data/compress.ts`; a top-level import took every data page down.
- **Data layer:** `src/lib/data/index.ts` uses Supabase when configured and `builtin.ts` otherwise, so a clone runs with no setup. Builtin refuses writes.
- **Untrusted data comes from the database:** what a look wears (`outfits.items`) is written by a trigger from its code, never by the client. Derive anything that filters or ranks other people's content the same way.
- **The Wardrobe drawer:** `wardrobe/@modal` intercepts `/wardrobe/[id]`. Every route the drawer can link back to needs a `@modal` page that renders nothing, or the drawer stays open after a soft navigation.
- **Weekly Discord post:** `vercel.json` runs `/api/cron/look-of-the-week` on Mondays. It needs `CRON_SECRET` and `DISCORD_WEBHOOK_URL` in production, posts only when a look has earned it, and never pings anyone.
- **Sign-in** is Discord only. A sign-in that seems to do nothing is usually an address missing from Supabase's Redirect URLs, which silently falls back to the Site URL. Check `auth.users.last_sign_in_at` first, then the auth logs.
- **Testing signed-in UI:** email login is off, so no test session exists. Drive a browser against the dev server with a fake `sb-test-auth-token` cookie and a stubbed `/api/account`. A real OAuth round trip needs seolyam.

## The overlay

`F:\projects\dev\Eclipse-DEV` is the reference for UI, UX and colour; check how the overlay does something before designing it here. Treat it as read-only, and keep its source and build output, including `dinput8.dll`, out of this repo. Downloads link to `Kirazul/Eclipse` releases.

- **Game sync wire:** `src/lib/game-sync/wire.ts` and the overlay's `SiteSyncCore.h` must change together.
- **Merged is not released:** before assuming players have the game side, check for a public overlay release.

## Dressing room

Game files stay on Blizzard's CDN. `public/dress` holds only tables, recipes and baked poses, and browsers read byte ranges through the `/game-cdn` rewrite because the CDN sends no CORS headers.

- **Bake:** `python tools/export_models.py --eclipse <Eclipse-DEV> --cache <folder>`, about 450 MB and 25 minutes cold. Run it again if a build's archives leave the CDN.
- **Sources:** Mists Classic has the sharpest old art, and bodies are retail HD because Mists has none. wago.tools with no `?version=` serves Mists, so pass a version to get retail.
- **Poses:** the figure is one baked Stand frame in `public/dress/poses`, which spares browsers a 19 MB skeleton. Animating it would mean shipping the skeleton.
- **Helms** come from retail, which recut the same files for HD heads, and hang from attachment 11. Mists' copies fit the old heads and sit wrong on HD ones.
- **Ranged weapons** are held as the client's dressing room holds them: a bow in the left hand, the rest in the right, and not shown when that hand is full. Attachment 26 is the quiver's.
- **Wowhead's viewer:** its CDN refuses this site, so respect that and stay on Blizzard's CDN, with no proxy or referrer workaround.
