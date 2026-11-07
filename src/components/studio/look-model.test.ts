import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LookModel } from "./look-model";

const BACKDROP = "/scene.webp";
const SHOT = "https://example.test/capture.webp";

const render = (props: Partial<Parameters<typeof LookModel>[0]>) =>
  renderToStaticMarkup(
    createElement(LookModel, { pieces: {}, wearer: null, gallery: [], backdrop: BACKDROP, title: "Raid night", ...props }),
  );

describe("a look's stage", () => {
  it("dresses the figure as soon as the look opens, with no button to press", () => {
    const html = render({ pieces: { 0: 179769, 4: 168954 } });
    expect(html).toContain("<canvas");
    expect(html).not.toContain("Show 3D preview");
  });

  it("draws a look's own body even when none of its pieces are baked", () => {
    expect(render({ pieces: { 0: null }, wearer: { race: 1, gender: 1 } })).toContain("<canvas");
  });

  it("puts the figure first and the screenshots behind a switch", () => {
    const html = render({ pieces: { 0: 179769 }, gallery: [SHOT] });
    expect(html).toContain("<canvas");
    expect(html).toMatch(/aria-selected="true"[^>]*>3D</);
    expect(html).toContain(">Screenshots<");
    expect(html).not.toContain(SHOT);
  });

  it("shows the screenshots, with no switch, when the figure would wear nothing", () => {
    const html = render({ pieces: { 0: null, 4: null }, gallery: [SHOT] });
    expect(html).not.toContain("<canvas");
    expect(html).not.toContain("role=\"tablist\"");
    expect(html).toContain(SHOT);
  });

  it("does not draw a bare stand-in for a look the preview cannot dress", () => {
    const html = render({ pieces: { 0: null, 4: null } });
    expect(html).not.toContain("<canvas");
    expect(html).toContain("not in the 3D preview");
  });
});
