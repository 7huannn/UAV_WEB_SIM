import { writeFileSync } from "node:fs";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { makeDrone } from "../src/scene/drone";
// GLTFExporter uses FileReader for Blob buffers. Node provides Blob but not FileReader.
class NodeFileReader {
  result: ArrayBuffer | string | null = null;
  onloadend: (() => void) | null = null;
  readAsArrayBuffer(blob: Blob) {
    blob.arrayBuffer().then((v) => {
      this.result = v;
      this.onloadend?.();
    });
  }
  readAsDataURL(blob: Blob) {
    blob.arrayBuffer().then((v) => {
      this.result = `data:${blob.type};base64,${Buffer.from(v).toString("base64")}`;
      this.onloadend?.();
    });
  }
}
Object.assign(globalThis, { FileReader: NodeFileReader });
const { group } = makeDrone();
new GLTFExporter().parse(
  group,
  (result) => {
    writeFileSync(
      "public/assets/models/uav-15.glb",
      Buffer.from(result as ArrayBuffer),
    );
    console.log("Exported original UAV GLB");
  },
  (e) => {
    throw e;
  },
  { binary: true },
);
