<div align="center">

# Eclipse Web

**The official website for Eclipse, a free overlay for World of Warcraft 3.3.5a.**

Landing page, setup guide, and a community Wardrobe and Showcase for sharing looks.

![Next.js](https://img.shields.io/badge/Next.js-App_Router-black) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6) ![Non-commercial](https://img.shields.io/badge/use-non--commercial-orange)

</div>

> This is the official Eclipse website. Eclipse is an independent community project and is **not affiliated with, endorsed by, or sponsored by Blizzard Entertainment**. See [Legal](#legal-and-disclaimer).

## Features

- **Wardrobe:** browse looks and copy their share codes.
- **Showcase:** a picture-first gallery of community captures.
- **Inspector:** decode and edit share codes.
- **World presets** and a **setup guide**.

## Getting started

Requires Node.js and [pnpm](https://pnpm.io).

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

Other scripts: `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build`.

Optional settings are listed in `.env.example`.

## Share codes

`src/lib/codec` encodes and decodes the `ECA1:` (loadout) and `ECW1:` (world look) code formats.

## Team

Eclipse was founded by [Kirazul](https://github.com/Kirazul) and is developed together with [seolyam](https://github.com/seolyam).

## Tech stack

Next.js (App Router), React, strict TypeScript, Tailwind CSS, Vitest.

## Legal and disclaimer

*This is a good-faith summary, not legal advice.*

**Not affiliated with Blizzard.** Eclipse and this website are the official home of an independent, free, non-commercial community project. They are not made, endorsed, sponsored or approved by Blizzard Entertainment, Inc. or Microsoft.

**Trademarks and game content.** World of Warcraft, Warcraft, Blizzard and Blizzard Entertainment are trademarks or registered trademarks of Blizzard Entertainment, Inc. in the U.S. and/or other countries. Game names, item names, icons, race, class and slot art, and other game imagery shown here are the property of Blizzard Entertainment, Inc. They appear only to identify game content for fans, and no ownership is claimed. They are not covered by any license for this repository and must not be reused commercially.

**Third-party art.** Rings and studio backdrops are from [Narcissus](https://www.curseforge.com/wow/addons/narcissus) by Peterodox, licensed [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) and used with the author's agreement. Credit must be kept wherever they appear, and use must stay non-commercial.

**Use at your own risk.** Eclipse modifies the game client, and Blizzard's [Terms of Use and EULA](https://www.blizzard.com/en-us/legal) restrict third-party software that modifies the client. It targets the 3.3.5a client. Blizzard has not approved it, and users are responsible for the rules of the realm or server they play on. This repository contains the website only, with no game client files.

**Non-commercial.** Nothing here sells game content or is gated behind payment. Voluntary support links only help cover running costs.

**Takedown requests.** Rights holders who want something changed or removed can open an issue, and it will be handled promptly.

**License.** No license has been granted yet. All rights in the original code are reserved by the author.
