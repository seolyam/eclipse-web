import Link from "next/link";
import { preload } from "react-dom";
import { HeroStage } from "@/components/site/hero-stage";
import { Icon } from "@/components/site/icons";
import { ShowcasePlayer } from "@/components/site/showcase-player";
import { SupportLinks } from "@/components/site/support-links";
import { WalletSection } from "@/components/site/wallets";
import { FEATURES } from "@/lib/features";
import { TALL_MEDIA, TALL_SIZES, WIDE_SIZES, tallArt, wideArt } from "@/lib/hero-art";
import { dllUrl, downloadUrl } from "@/lib/site";

// The official page's sections, word for word: only the links are new.

export function Hero() {
  // Same srcset and sizes as the <picture>, so each is one download. preload()
  // reaches <head>; a <link> with no href would stay here in the body.
  const art = { as: "image", type: "image/avif", fetchPriority: "high" } as const;
  preload("/assets/img/bg-wide-1920.avif", { ...art, media: "(min-aspect-ratio: 4/5)", imageSrcSet: wideArt("avif"), imageSizes: WIDE_SIZES });
  preload("/assets/img/bg-tall-960.avif", { ...art, media: TALL_MEDIA, imageSrcSet: tallArt("avif"), imageSizes: TALL_SIZES });

  return (
    <section className="hero" id="top">
      {/* The art fades in from script; without one it should simply be there. */}
      <noscript><style>{".hero__art { opacity: 1; }"}</style></noscript>
      <HeroStage />
      <div className="wrap hero__text">
        <h1>
          A wardrobe for <span className="flow-text">World of Warcraft</span>
        </h1>
        <p>
          <span className="flow-text flow-text--strong">Eclipse</span> is a free overlay for the 3.3.5a client. Every
          appearance, mount, spell and title in the game, on your own character.
        </p>
        <div className="cta">
          <a className="btn btn--primary" href="#download">Download</a>
          <a className="btn btn--ghost" href="#features">Explore features</a>
        </div>
      </div>
      <div className="wrap hero__stage" id="showcase">
        <ShowcasePlayer />
      </div>
    </section>
  );
}

export function Features({ live }: { live: boolean }) {
  return (
    <section className="section" id="features">
      <div className="wrap">
        <header className="section__head">
          <h2>Everything in one overlay</h2>
          <p>Press <kbd>F2</kbd> in game to open it. The key can be changed in Settings.</p>
        </header>
        <div className="features">
          {FEATURES.map((f) => (
            <article key={f.title}>
              <h3>{f.href && (live || !f.needsPosts) ? <Link href={f.href}>{f.title}</Link> : f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Download() {
  return (
    <section className="section" id="download">
      <div className="wrap">
        <div className="panel download">
          <div className="download__intro">
            <h2>Download Eclipse</h2>
            <p>Includes the retail asset pack: items, mounts, fonts, effects and spells.</p>
            <div className="download__btns">
              <a className="btn btn--primary" href={downloadUrl} target="_blank" rel="noopener">
                <Icon id="i-download" /><span>Download Eclipse.zip</span>
              </a>
              <a className="btn btn--ghost" href={dllUrl} target="_blank" rel="noopener">
                <Icon id="i-download" /><span>dinput8.dll</span>
              </a>
            </div>
            <p className="fine">
              Google Drive &middot; Windows &middot; World of Warcraft 3.3.5a (12340)<br />
              <code>dinput8.dll</code> is also available on its own from GitHub Releases.
            </p>
          </div>
          <ol className="steps">
            <li><h3>Extract</h3><p>Unzip <code>Eclipse.zip</code> anywhere.</p></li>
            <li><h3>Copy</h3><p>Place <code>dinput8.dll</code> and the <code>Eclipse</code> folder next to <code>Wow.exe</code>.</p></li>
            <li><h3>Play</h3><p>Start the game, enter the world and press <kbd>F2</kbd>.</p></li>
          </ol>
        </div>
      </div>
    </section>
  );
}

export function Support() {
  return (
    <section className="section" id="support">
      <div className="wrap">
        <header className="section__head section__head--center">
          <h2>Eclipse is free</h2>
          <p>There is no price and there never will be. If it has earned a place in your game, you can help keep it going.</p>
        </header>
        <div className="support">
          <SupportLinks />
        </div>
        <WalletSection />
      </div>
    </section>
  );
}
