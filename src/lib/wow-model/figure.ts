// Builds a dressed, still character as a three.js object from the game's own files.
// Browser only: the skin is painted on a canvas.
import * as THREE from "three";
import { decodeBlp, type Image } from "./blp";
import { attachmentsFor, bodyLayers, regionRect, SKIN_HEIGHT, SKIN_WIDTH, visibleGeosets, type SkinRegion, type WornItem } from "./character";
import { fitsModel, parseM2, parseSkin, type M2, type M2Texture, type SkinSection } from "./m2";
import { multiply, readPose, skinVertices, solveBones, type Attachment, type BakedPose, type Mat4 } from "./pose";

/** Reads one game file by FileDataID. */
export type FileSource = (file: number) => Promise<ArrayBuffer>;

export interface BodyFiles {
  model: number;
  skin: number;
  face?: number;
  pelvis?: number;
  torso?: number;
  hair?: number;
  eyes?: number;
  /** The geoset id of the hairstyle to show. */
  hairstyle: number;
  pose: BakedPose;
}

export interface Figure {
  object: THREE.Group;
  /** Pieces that could not be drawn, by slot. */
  failed: number[];
  dispose(): void;
}

const STAND = 0;
const TEXTURE_FILE = 0;
const TEXTURE_SKIN = 1;
const TEXTURE_OBJECT = 2;
const TEXTURE_HAIR = 6;
const TEXTURE_EYES = 19;
const BLEND_OPAQUE = 0;
const BLEND_ALPHA_KEY = 1;
const TWO_SIDED = 0x4;
/** The client's cut-off for alpha-keyed materials: 224/255. */
const ALPHA_KEY = 0.878;

const blpCanvas = (image: Image) => {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const pixels = new Uint8ClampedArray(image.rgba.length);
  pixels.set(image.rgba);
  canvas.getContext("2d")!.putImageData(new ImageData(pixels, image.width, image.height), 0, 0);
  return canvas;
};

const readImage = async (source: FileSource, file: number) => blpCanvas(decodeBlp(new Uint8Array(await source(file))));

async function paintSkin(source: FileSource, body: BodyFiles, items: WornItem[]) {
  const canvas = document.createElement("canvas");
  canvas.width = SKIN_WIDTH;
  canvas.height = SKIN_HEIGHT;
  const context = canvas.getContext("2d")!;
  context.drawImage(await readImage(source, body.skin), 0, 0, SKIN_WIDTH, SKIN_HEIGHT);

  const base: { region: SkinRegion; file: number | undefined }[] = [
    { region: "face", file: body.face },
    { region: "legUpper", file: body.pelvis },
    { region: "torsoUpper", file: body.torso },
  ];
  const layers = [...base.filter((l): l is { region: SkinRegion; file: number } => Boolean(l.file)), ...bodyLayers(items)];
  // Read together, painted in order: the order is what makes a sleeve go under a glove.
  const images = await Promise.allSettled(layers.map((layer) => readImage(source, layer.file)));
  images.forEach((image, i) => {
    if (image.status === "fulfilled") {
      const [x, y, w, h] = regionRect(layers[i].region);
      context.drawImage(image.value, x, y, w, h);
    }
  });
  return canvas;
}

function canvasTexture(canvas: HTMLCanvasElement, flags = 0) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.wrapS = flags & 1 ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  texture.wrapT = flags & 2 ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  return texture;
}

function buildMeshes(
  m2: M2,
  sections: SkinSection[],
  matrices: Mat4[],
  texture: (role: M2Texture) => THREE.Texture | null,
  shown: Set<number> | null,
) {
  const posed = skinVertices(m2.positions, m2.normals, m2.boneIndices, m2.boneWeights, matrices);
  const position = new THREE.BufferAttribute(posed.positions, 3);
  const normal = new THREE.BufferAttribute(posed.normals, 3);
  const uv = new THREE.BufferAttribute(m2.uvs, 2);
  const group = new THREE.Group();

  for (const section of sections) {
    if (section.layer > 0 || (shown && !shown.has(section.geoset))) continue;
    const role = m2.textures[m2.textureLookup[section.texture]];
    const map = role ? texture(role) : null;
    const flags = m2.materials[section.material];
    if (!map || !flags) continue;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", position);
    geometry.setAttribute("normal", normal);
    geometry.setAttribute("uv", uv);
    geometry.setIndex(new THREE.BufferAttribute(section.indices, 1));
    const material = new THREE.MeshLambertMaterial({
      map,
      side: flags.flags & TWO_SIDED ? THREE.DoubleSide : THREE.FrontSide,
      transparent: flags.blend > BLEND_ALPHA_KEY,
      alphaTest: flags.blend === BLEND_ALPHA_KEY ? ALPHA_KEY : 0,
      depthWrite: flags.blend <= BLEND_ALPHA_KEY,
      blending: flags.blend > 2 ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    if (flags.blend === BLEND_OPAQUE) material.alphaTest = 0;
    group.add(new THREE.Mesh(geometry, material));
  }
  return group;
}

async function readMesh(source: FileSource, file: number) {
  const m2 = parseM2(await source(file));
  const { sections } = parseSkin(await source(m2.skinFile));
  if (!fitsModel(sections, m2.positions.length / 3)) throw new Error(`Model ${file} and its skin do not match.`);
  return { m2, sections };
}

const readModel = async (source: FileSource, file: number) => {
  const mesh = await readMesh(source, file);
  return { ...mesh, matrices: solveBones(mesh.m2.bones(STAND)) };
};

/** A model hung from the body: its bone in the Stand pose, then the point's offset. */
function attachmentMatrix(point: Attachment | null, matrices: Mat4[]) {
  if (!point) return null;
  const [x, y, z] = point.position;
  const offset = Float64Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1);
  return new THREE.Matrix4().fromArray(Array.from(multiply(matrices[point.bone], offset)));
}

export async function buildFigure(source: FileSource, body: BodyFiles, items: WornItem[]): Promise<Figure> {
  const textures: THREE.Texture[] = [];
  const keep = (canvas: HTMLCanvasElement, flags?: number) => {
    const texture = canvasTexture(canvas, flags);
    textures.push(texture);
    return texture;
  };

  const pose = readPose(body.pose);
  const matrices = solveBones(pose.bones);
  const [{ m2, sections }, skin, hair, eyes] = await Promise.all([
    readMesh(source, body.model),
    paintSkin(source, body, items),
    body.hair ? readImage(source, body.hair).catch(() => null) : null,
    body.eyes ? readImage(source, body.eyes).catch(() => null) : null,
  ]);
  const cape = items.find((item) => item.slot === 14 && item.texture)?.texture;
  const capeImage = cape ? await readImage(source, cape).catch(() => null) : null;

  const skinTexture = keep(skin);
  const hairTexture = hair ? keep(hair, 3) : null;
  const eyesTexture = eyes ? keep(eyes) : null;
  const capeTexture = capeImage ? keep(capeImage) : null;

  const figure = new THREE.Group();
  figure.add(buildMeshes(m2, sections, matrices, (role) => {
    if (role.type === TEXTURE_SKIN) return skinTexture;
    if (role.type === TEXTURE_HAIR) return hairTexture;
    if (role.type === TEXTURE_EYES) return eyesTexture;
    if (role.type === TEXTURE_OBJECT) return capeTexture;
    return null;
  }, visibleGeosets(items, body.hairstyle)));

  const failed = new Set<number>();
  await Promise.all(items.flatMap((item) => attachmentsFor(item).map(async (hung) => {
    try {
      const where = attachmentMatrix(pose.attachment(hung.attachment), matrices);
      if (!where) throw new Error(`No attachment ${hung.attachment}.`);
      const model = await readModel(source, hung.model);
      const objectImage = hung.texture ? await readImage(source, hung.texture) : null;
      const objectTexture = objectImage ? keep(objectImage, 3) : null;
      const fileTextures = new Map<number, THREE.Texture>();
      await Promise.all(model.m2.textures.filter((t) => t.type === TEXTURE_FILE && t.file).map(async (t) => {
        const image = await readImage(source, t.file).catch(() => null);
        if (image) fileTextures.set(t.file, keep(image, t.flags));
      }));
      const part = buildMeshes(model.m2, model.sections, model.matrices, (role) => {
        if (role.type === TEXTURE_OBJECT) return objectTexture;
        if (role.type === TEXTURE_FILE) return fileTextures.get(role.file) ?? null;
        return null;
      }, null);
      part.matrixAutoUpdate = false;
      part.matrix.copy(where);
      figure.add(part);
    } catch {
      failed.add(item.slot);
    }
  })));

  // The game is Z-up and faces +X; three.js is Y-up and looks down -Z.
  const upright = new THREE.Group();
  upright.rotation.x = -Math.PI / 2;
  upright.add(figure);
  const object = new THREE.Group();
  object.rotation.y = -Math.PI / 2;
  object.add(upright);

  return {
    object,
    failed: [...failed],
    dispose() {
      object.traverse((node) => {
        if (node instanceof THREE.Mesh) {
          node.geometry.dispose();
          (node.material as THREE.Material).dispose();
        }
      });
      textures.forEach((texture) => texture.dispose());
    },
  };
}
