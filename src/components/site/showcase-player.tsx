"use client";

import { useState } from "react";
import { preconnect } from "react-dom";
import { Icon } from "@/components/site/icons";
import { SHOWCASE_VIDEO_ID as ID } from "@/lib/site";

/** The video's thumbnail; the YouTube frame is created on click, warmed up on hover. */
export function ShowcasePlayer() {
  const [playing, setPlaying] = useState(false);

  if (playing) {
    return (
      <div className="player is-playing">
        <iframe
          autoFocus
          src={`https://www.youtube-nocookie.com/embed/${ID}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title="Eclipse features showcase"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="player">
      <button
        className="player__poster"
        type="button"
        aria-label="Play the Eclipse features showcase"
        onPointerEnter={() => {
          preconnect("https://www.youtube-nocookie.com");
          preconnect("https://www.google.com");
        }}
        onClick={() => setPlaying(true)}
      >
        <picture>
          <source type="image/webp" srcSet={`https://i.ytimg.com/vi_webp/${ID}/maxresdefault.webp`} />
          <img className="player__thumb" src={`https://i.ytimg.com/vi/${ID}/maxresdefault.jpg`} width={1280} height={720} alt="" decoding="async" />
        </picture>
        <span className="player__cue">
          <span className="player__play"><Icon id="i-play" /></span>
          <span className="player__label">Watch the showcase<small>Features tour · 19 min</small></span>
        </span>
      </button>
      <noscript>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${ID}?rel=0`}
          title="Eclipse features showcase"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </noscript>
    </div>
  );
}
