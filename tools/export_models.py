"""Bake what the dressing room needs to draw a character from the game's public CDN.

    python tools/export_models.py --eclipse <path-to-eclipse-dev> --cache <folder>

Reads, never writes, the Eclipse tree:
    Eclipse/data/wardrobe/items.edb     item id -> model and texture names, geosets
    Eclipse/data/wardrobe/helmvis.edb   what a helm hides, by race
    re/out/hearth/listfile.csv          file name -> FileDataID

--builds are tried in order. Every WoW product shares one CDN, and Mists of Pandaria
Classic holds the sharpest copies of the old art: 1024x1024 skins where live retail
still has the 512x512 originals. Retail fills in everything newer. Each build's root,
encoding table and archive indexes come through tools/lib/tact_cdn.py from the Eclipse
tree, cached in --cache (about 450 MB a build, and slow the first time).

Writes public/dress/:
    bodies.json          "<race id>-<gender>" -> the files of a bare character
    items/<n>.json       item id -> recipe, split by id % 128
    files/<n>.json       FileDataID -> [archive index, offset, size], or [encoded key] for
                         a file the CDN keeps on its own, split by id % 256
    manifest.json        the builds, and the archive names those indexes point into

No game file is written: a browser reads them from the CDN, by range, and decodes them.
"""
from __future__ import annotations

import argparse
import collections
from concurrent.futures import ThreadPoolExecutor
import json
import re
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "dress"
ITEMS = ROOT / "src" / "data" / "catalog" / "items.json"
ITEM_SHARDS = 128
FILE_SHARDS = 256

# id, folder and file stem, and the two letters a head model's name carries.
RACES = [
    (1, "human", "hu"), (2, "orc", "or"), (3, "dwarf", "dw"), (4, "nightelf", "ni"), (5, "scourge", "sc"),
    (6, "tauren", "ta"), (7, "gnome", "gn"), (8, "troll", "tr"), (10, "bloodelf", "be"), (11, "draenei", "dr"),
]
SEXES = [(0, "male", "m"), (1, "female", "f")]

# ItemDisplayInfo's body textures, in row order, as character.ts names them.
REGIONS = ["armUpper", "armLower", "hand", "torsoUpper", "torsoLower", "legUpper", "legLower", "foot"]
INV_SHIELD = 14
INV_HEAD = 1
# HelmetGeosetVisData's seven masks, as geoset groups (DisplayDb.cpp, the head handler).
HELM_GROUPS = [0, 1, 2, 3, 7, 16, 17]
EMBEDDED_ID = re.compile(r"_(\d{6,8})_")
BUILDS = ["5.5.4.70531", "12.1.5.70448"]
INDEX_READERS = 8
# An archive is 256 MB: a place past that means the index was misread.
ARCHIVE_LIMIT = 1 << 28


def read_listfile(path: Path):
    by_path: dict[str, int] = {}
    models: dict[str, str] = {}
    textures_near: dict[str, list[str]] = collections.defaultdict(list)
    with open(path, encoding="utf8", errors="replace") as f:
        for line in f:
            fdid, _, name = line.rstrip("\n").partition(";")
            if not fdid.isdigit():
                continue
            name = name.lower()
            by_path[name] = int(fdid)
            if name.startswith("item/objectcomponents/"):
                folder, _, base = name.rpartition("/")
                if base.endswith(".m2"):
                    models[base[:-3]] = name
                elif base.endswith(".blp"):
                    textures_near[folder].append(name)
    return by_path, models, textures_near


def read_items_edb(path: Path):
    d = path.read_bytes()
    magic, _, rows, stride, name_bytes = struct.unpack_from("<4sIIII", d, 0)
    assert magic == b"EIDB" and stride == 76, (magic, stride)
    names_at = 20 + rows * stride
    blob = d[names_at:names_at + name_bytes]

    def name(offset: int) -> str:
        if not offset:
            return ""
        return blob[offset:blob.find(b"\0", offset)].decode("latin1").lower().replace("\\", "/")

    out = {}
    for i in range(rows):
        at = 20 + i * stride
        item, display, model_l, model_r, tex_l, tex_r, *body = struct.unpack_from("<14I", d, at)
        if item in out:
            continue
        geoset = struct.unpack_from("<3H", d, at + 60)
        helm_m, helm_f = struct.unpack_from("<2H", d, at + 66)
        out[item] = {
            "model_l": name(model_l), "model_r": name(model_r), "tex_l": name(tex_l), "tex_r": name(tex_r),
            "body": [name(o) for o in body], "geoset": list(geoset), "helm": (helm_m, helm_f),
        }
    return out


def read_helmvis(path: Path) -> dict[int, tuple[int, ...]]:
    d = path.read_bytes()
    magic, _, rows, stride = struct.unpack_from("<4sIII", d, 0)
    assert magic == b"HGV1" and stride == 32, (magic, stride)
    out = {}
    for i in range(rows):
        row = struct.unpack_from("<8I", d, 16 + i * stride)
        out[row[0]] = row[1:]
    return out


class Files:
    """Name -> FileDataID, kept only when this build really holds the file."""

    def __init__(self, by_path, models, textures_near, root):
        self.by_path, self.models, self.textures_near, self.root = by_path, models, textures_near, root
        self.used: set[int] = set()

    def get(self, path: str) -> int | None:
        fdid = self.by_path.get(path)
        return fdid if fdid in self.root else None

    def use(self, fdid: int) -> int:
        self.used.add(fdid)
        return fdid

    def texture(self, path: str) -> int | None:
        hit = self.get(path)
        if hit is None:
            # The realm's converter writes a retail texture's FileDataID into its name.
            for found in EMBEDDED_ID.findall(path):
                if int(found) in self.root:
                    return self.use(int(found))
            return None
        return self.use(hit)

    def gendered(self, path: str) -> list[int] | None:
        """[male, female] for a body texture. A name ends in _u, _m or _f."""
        stem = path[:-6] if path[-6:-5] == "_" else path[:-4]
        pick = lambda sex: self.texture(f"{stem}_{sex}.blp")  # noqa: E731
        universal = pick("u") or self.texture(path)
        male, female = pick("m") or universal, pick("f") or universal
        if not male and not female:
            return None
        return [male or female, female or male]

    def model(self, path: str) -> int | None:
        fdid = self.get(path)
        if fdid is None:
            return None
        self.use(fdid)
        stem = path[:-3]
        skin = self.get(f"{stem}00.skin")
        if skin is None:
            return None
        self.use(skin)
        # Most parts name their texture in the item row. Glows and trim are named in the
        # model, so anything beside it that shares its stem has to be findable too.
        folder, _, base = stem.rpartition("/")
        prefix = base.rsplit("_", 1)[0] if base[-3:-1].isalpha() and base[-4] == "_" else base
        for near in self.textures_near.get(folder, ()):
            if near.rpartition("/")[2].startswith(prefix):
                hit = self.get(near)
                if hit is not None:
                    self.use(hit)
        return fdid


def strip_ext(name: str) -> str:
    return re.sub(r"\.(mdx|m2|mdl)$", "", name.rpartition("/")[2])


def recipe(row: dict, inv: int, files: Files, helmvis: dict) -> dict:
    out: dict = {}
    missing = 0
    if any(row["geoset"]):
        out["geosets"] = row["geoset"]

    body = {}
    for region, path in zip(REGIONS, row["body"]):
        if not path:
            continue
        hit = files.gendered(path)
        if hit:
            body[region] = hit
        else:
            missing += 1
    if body:
        out["body"] = body

    for key, path in (("texture", row["tex_l"]), ("textureRight", row["tex_r"])):
        if path:
            hit = files.texture(path)
            if hit:
                out[key] = hit
            else:
                missing += 1

    if inv == INV_HEAD and row["model_l"]:
        stem = strip_ext(row["model_l"])
        heads = {}
        for _, _, code in RACES:
            for _, _, sex in SEXES:
                # Older heads end _hum; collection heads end _hu_m.
                path = files.models.get(f"{stem}_{code}{sex}") or files.models.get(f"{stem}_{code}_{sex}")
                hit = files.model(path) if path else None
                if hit:
                    heads[f"{code}{sex}"] = hit
        if heads:
            out["model"] = heads
        else:
            missing += 1
        masks = [helmvis.get(i) for i in row["helm"]]
        if any(masks):
            out["hides"] = [
                [[group for group, mask in zip(HELM_GROUPS, row_masks) if mask & (1 << race)] for race, _, _ in RACES]
                if row_masks else [[] for _ in RACES]
                for row_masks in masks
            ]
    else:
        for key, name in (("model", row["model_l"]), ("modelRight", row["model_r"])):
            if name:
                path = files.models.get(strip_ext(name))
                hit = files.model(path) if path else None
                if hit:
                    out[key] = hit
                else:
                    missing += 1
    if inv == INV_SHIELD:
        out["shield"] = True
    if missing:
        out["incomplete"] = True
    return out


def body_files(files: Files) -> dict:
    out = {}
    for race, folder, _ in RACES:
        for gender, sex_name, _ in SEXES:
            base = f"character/{folder}/{sex_name}/{folder}{sex_name}"
            paths = {
                "model": base + ".m2", "skin": base + "skin00_00.blp",
                "faceUpper": base + "faceupper00_00.blp", "faceLower": base + "facelower00_00.blp",
                "pelvis": base + "nakedpelvisskin00_00.blp",
                "hair": f"character/{folder}/hair00_00.blp",
            }
            if gender:
                paths["torso"] = base + "nakedtorsoskin00_00.blp"
            entry = {}
            for key, path in paths.items():
                fdid = files.model(path) if key == "model" else files.texture(path)
                if fdid:
                    entry[key] = fdid
            if "model" in entry and "skin" in entry:
                entry["hairstyle"] = 2
                out[f"{race}-{gender}"] = entry
    return out


def write_shards(folder: Path, rows: dict, shards: int) -> int:
    folder.mkdir(parents=True, exist_ok=True)
    buckets: dict[int, dict] = collections.defaultdict(dict)
    for key, value in rows.items():
        buckets[int(key) % shards][key] = value
    total = 0
    for n, bucket in buckets.items():
        text = json.dumps(bucket, separators=(",", ":"), sort_keys=True)
        (folder / f"{n}.json").write_text(text, encoding="utf8")
        total += len(text)
    return total


def open_cdn(eclipse: Path, cache: Path):
    """The overlay's TACT client, with its cache moved out of that read-only tree."""
    sys.path.insert(0, str(eclipse / "tools" / "lib"))
    import tact_cdn  # noqa: PLC0415

    def cache_dir(build: str) -> str:
        path = cache / build
        path.mkdir(parents=True, exist_ok=True)
        return str(path)

    tact_cdn.cache_dir = cache_dir
    return tact_cdn


def place_build(tact_cdn, build: str, keys: dict[int, str]):
    """The FileDataIDs one build serves -> (archive name, offset, size)."""
    T = tact_cdn.T
    cache = tact_cdn.cache_dir(build)
    encoded = T.encoding_lookup(tact_cdn._encoding(build), set(keys.values()))
    row = tact_cdn._build_row(build)
    config = T.config(tact_cdn.PATH, row.get("cdn_config") or row["product_config"], cache)
    want = {bytes.fromhex(e[:32]) for e in encoded.values()}

    def read_index(archive: str):
        return archive, T.cdn(tact_cdn.PATH, "data", archive + ".index", cache=cache)

    found: dict[bytes, tuple[str, int, int]] = {}
    with ThreadPoolExecutor(INDEX_READERS) as pool:
        for n, (archive, data) in enumerate(pool.map(read_index, config["archives"])):
            if data is None:
                continue
            for block in range((len(data) - 28) // 4096 + 1):
                chunk = data[block * 4096:(block + 1) * 4096]
                for at in range(0, 4096 - 23, 24):
                    key = chunk[at:at + 16]
                    # The first hit only. An index ends with a table of contents that
                    # repeats some keys beside unrelated bytes, and those must not win.
                    if key in want and key not in found:
                        size, offset = struct.unpack(">II", chunk[at + 16:at + 24])
                        assert 0 < size and offset + size <= ARCHIVE_LIMIT, (archive, key.hex(), offset, size)
                        found[key] = (archive, offset, size)
            if n % 200 == 0:
                print(f"  {build}: index {n}/{len(config['archives'])}, {len(found)}/{len(want)} placed", flush=True)

    placed = {}
    for fdid, content in keys.items():
        encoded_key = encoded.get(content)
        if not encoded_key:
            continue
        hit = found.get(bytes.fromhex(encoded_key[:32]))
        if hit:
            placed[fdid] = hit
        else:
            # Large files, a body among them, are not in any archive.
            e = encoded_key[:32]
            head = T.get(f"{T.HOST}/{tact_cdn.PATH}/data/{e[:2]}/{e[2:4]}/{e}", rng=(0, 3))
            if head and head[:4] == b"BLTE":
                placed[fdid] = (e,)
    return placed


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--eclipse", type=Path, required=True)
    parser.add_argument("--cache", type=Path, required=True)
    parser.add_argument("--builds", nargs="+", default=BUILDS, help="the best source first")
    args = parser.parse_args()

    tact_cdn = open_cdn(args.eclipse, args.cache)
    roots = [tact_cdn.root_map(build) for build in args.builds]
    # An earlier build wins, so write them last-first.
    root: dict[int, str] = {}
    for one in reversed(roots):
        root.update(one)

    wardrobe = args.eclipse / "Eclipse" / "data" / "wardrobe"
    files = Files(*read_listfile(args.eclipse / "re" / "out" / "hearth" / "listfile.csv"), root)
    rows = read_items_edb(wardrobe / "items.edb")
    helmvis = read_helmvis(wardrobe / "helmvis.edb")

    recipes, state = {}, collections.Counter()
    for item, _name, inv, *_ in json.loads(ITEMS.read_text(encoding="utf8")):
        row = rows.get(item)
        made = recipe(row, inv, files, helmvis) if row else {}
        if not row or not ({"body", "model", "texture"} & made.keys()):
            state["nothing to draw"] += 1
            continue
        state["incomplete" if made.get("incomplete") else "complete"] += 1
        recipes[str(item)] = made

    bodies = body_files(files)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "bodies.json").write_text(json.dumps(bodies, separators=(",", ":"), sort_keys=True), encoding="utf8")
    size = write_shards(OUT / "items", recipes, ITEM_SHARDS)
    print(f"{dict(state)}; {len(bodies)} bodies; recipes {size >> 10} KB; {len(files.used)} files", flush=True)

    # A file is read from the first build that has it, with that build's exact bytes.
    placed: dict[int, tuple] = {}
    for build, one in zip(args.builds, roots):
        keys = {fdid: one[fdid] for fdid in files.used - placed.keys() if fdid in one}
        got = place_build(tact_cdn, build, keys)
        placed.update(got)
        print(f"{build}: placed {len(got)} of {len(keys)} files", flush=True)

    archives = sorted({place[0] for place in placed.values() if len(place) == 3})
    number = {archive: i for i, archive in enumerate(archives)}
    table = {str(fdid): [number[place[0]], place[1], place[2]] if len(place) == 3 else [place[0]] for fdid, place in placed.items()}
    size = write_shards(OUT / "files", table, FILE_SHARDS)
    (OUT / "manifest.json").write_text(json.dumps({"builds": args.builds, "archives": archives}, separators=(",", ":")), encoding="utf8")
    print(f"placed {len(placed)}/{len(files.used)} files across {len(archives)} archives; table {size >> 10} KB; unplaced e.g. {sorted(files.used - placed.keys())[:6]}")


if __name__ == "__main__":
    main()
