import { encode as fastPngEncode } from "https://cdn.jsdelivr.net/npm/fast-png@6.1.0/+esm";

// 数値PNG(RGB) → 浸水深(m)
const rgb2depth = (r, g, b) => (r * 65536 + g * 256 + b) * 0.001;

// 浸水深 → パレット色（国交省仕様）
const depth2color = (d) => {
  if (d >= 20.0) return [220, 122, 220, 255];
  if (d >= 10.0) return [242, 133, 201, 255];
  if (d >= 5.0) return [255, 145, 145, 255];
  if (d >= 3.0) return [255, 183, 183, 255];
  if (d >= 1.0) return [255, 216, 192, 255];
  if (d >= 0.5) return [248, 225, 166, 255];
  if (d >= 0.3) return [247, 245, 169, 255];
  if (d > 0.0) return [247, 245, 169, 255];
  return [0, 0, 0, 0]; // 0 または NoData は透明
};
// 画像を読み→色変換→PNG(ArrayBuffer) を返す共通関数
const buildPngArrayBuffer = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(image, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
        const depth = rgb2depth(r, g, b);
        const [nr, ng, nb, na] = depth2color(depth);
        data[i] = nr;
        data[i + 1] = ng;
        data[i + 2] = nb;
        data[i + 3] = a === 0 ? 0 : na; // 元が透明なら維持
      }

      const pngData = fastPngEncode({
        width: canvas.width,
        height: canvas.height,
        data,
      });
      resolve({ data: pngData.buffer, cacheControl: null, expires: null });
    };
    image.onerror = (e) => reject(e?.error || new Error("image load failed"));
    image.src = url;
  });

// 両API対応版 addProtocol
maplibregl.addProtocol("shinsui", (params, callback) => {
  const url = params.url.replace("shinsui://", "");

  // 旧API: (params, callback)
  if (typeof callback === "function") {
    buildPngArrayBuffer(url)
      .then(({ data, cacheControl, expires }) =>
        callback(null, data, cacheControl, expires)
      )
      .catch((err) => callback(err));
    return { cancel: () => {} };
  }

  // 新API: Promise を返す
  return buildPngArrayBuffer(url);
});
