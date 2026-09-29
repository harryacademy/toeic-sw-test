"""Generates the prompt audio for a Speaking form with edge-tts.

Usage (from the project root, E:\\Claude\\SW):
    python tools/tts/make_audio.py tools/tts/speaking-sample-01.json

The manifest lists each file, voice and text; files are written to "out_dir" (relative to the
project root). Existing files are skipped unless you add --force. Needs: pip install edge-tts
"""
import asyncio
import json
import sys
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[2]


async def main(manifest_path: str, force: bool) -> int:
    manifest = json.loads(Path(manifest_path).read_text(encoding="utf-8"))
    out_dir = ROOT / manifest["out_dir"]
    out_dir.mkdir(parents=True, exist_ok=True)
    made = skipped = 0
    for item in manifest["items"]:
        target = out_dir / item["file"]
        if target.exists() and not force:
            print(f"skip   {item['file']} (exists)")
            skipped += 1
            continue
        rate = item.get("rate", "-5%")  # slightly slower than default, closer to test pacing
        await edge_tts.Communicate(item["text"], item["voice"], rate=rate).save(str(target))
        print(f"made   {item['file']}  [{item['voice']}]  {target.stat().st_size // 1024} KB")
        made += 1
    print(f"\nDone: {made} made, {skipped} skipped, into {out_dir}")
    return 0


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        print(__doc__)
        sys.exit(1)
    sys.exit(asyncio.run(main(args[0], "--force" in sys.argv)))
