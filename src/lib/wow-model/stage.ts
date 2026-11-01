// The dressing room's 3D view: a figure on a clear background, turned by dragging.
// Only drawn when something changes, so a page left open costs nothing. This module
// pulls in three.js, so it is only ever loaded with import().
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildFigure, type Figure } from "./figure";
import { gameFiles } from "./files";
import { wornItem } from "./recipe";

export interface Stage {
  /**
   * Draws a look and answers with the slots it could not draw. `wanted` is asked once the
   * figure is built: a slow build must not replace a newer one that finished first.
   */
  dress(race: number, gender: number, pieces: Record<number, number>, wanted: () => boolean): Promise<number[]>;
  dispose(): void;
}

const FIELD_OF_VIEW = 30;

export function createStage(host: HTMLElement): Stage {
  const files = gameFiles();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  host.append(renderer.domElement);
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.setAttribute("aria-label", "Your look, on a character. Drag to turn it.");

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x554433, 1.7));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(1.5, 2, 3);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(FIELD_OF_VIEW, 1, 0.05, 50);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;

  const draw = () => renderer.render(scene, camera);
  controls.addEventListener("change", draw);

  const resize = () => {
    const { clientWidth: width, clientHeight: height } = host;
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    draw();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  let shown: Figure | null = null;
  let height = 0;

  /** Moves the camera only when the figure's height changes, so a turn survives a change of boots. */
  function frame(box: THREE.Box3) {
    const size = box.getSize(new THREE.Vector3());
    if (Math.abs(size.y - height) < 0.05) return;
    height = size.y;
    const centre = box.getCenter(new THREE.Vector3());
    const distance = (height * 0.56) / Math.tan(THREE.MathUtils.degToRad(FIELD_OF_VIEW / 2));
    controls.target.copy(centre);
    camera.position.set(centre.x, centre.y, centre.z + distance);
    controls.minDistance = distance * 0.35;
    controls.maxDistance = distance * 1.6;
    controls.update();
  }

  function show(figure: Figure) {
    if (shown) {
      scene.remove(shown.object);
      shown.dispose();
    }
    shown = figure;
    scene.add(figure.object);
    frame(new THREE.Box3().setFromObject(figure.object));
    draw();
  }

  return {
    async dress(race, gender, pieces, wanted) {
      const body = await files.body(race, gender);
      if (!body) throw new Error(`No body for race ${race}.`);
      const notDrawn: number[] = [];
      const worn = await Promise.all(Object.entries(pieces).map(async ([key, item]) => {
        const slot = Number(key);
        const recipe = await files.recipe(item).catch(() => null);
        if (!recipe || recipe.incomplete) notDrawn.push(slot);
        return recipe ? [wornItem(slot, recipe, race, gender)] : [];
      }));
      const figure = await buildFigure(files.read, body, worn.flat());
      if (wanted()) show(figure);
      else figure.dispose();
      return [...new Set([...notDrawn, ...figure.failed])];
    },
    dispose() {
      observer.disconnect();
      controls.dispose();
      shown?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
