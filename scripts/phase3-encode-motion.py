"""Encode captured Phase 3 browser frames to reviewable MP4 evidence."""
import hashlib
import json
import pathlib
import sys

import cv2

label = sys.argv[1]
assert label in {"retained-sky", "local-prototype"}
root = pathlib.Path("docs/simulation/evidence/phase-3/motion")
data = json.loads((root / f"{label}.json").read_text())
frames = sorted((root / f"{label}-frames").glob("*.jpg"))
assert len(frames) == data["frames"] == 100
first = cv2.imread(str(frames[0]))
assert first is not None
height, width = first.shape[:2]
output = root / f"{label}.mp4"
writer = cv2.VideoWriter(str(output), cv2.VideoWriter_fourcc(*"mp4v"), 10, (width, height))
assert writer.isOpened()
for frame in frames:
    image = cv2.imread(str(frame))
    assert image is not None and image.shape[:2] == (height, width)
    writer.write(image)
writer.release()
data["video"] = str(output)
data["videoDimensions"] = [width, height]
data["videoSHA256"] = hashlib.sha256(output.read_bytes()).hexdigest()
(root / f"{label}.json").write_text(json.dumps(data, indent=2) + "\n")
print(json.dumps({"label": label, "frames": len(frames), "video": str(output),
                  "bytes": output.stat().st_size, "sha256": data["videoSHA256"]}))
