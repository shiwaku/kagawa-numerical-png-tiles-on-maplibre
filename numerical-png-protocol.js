import { encode as fastPngEncode } from "https://cdn.jsdelivr.net/npm/fast-png@6.1.0/+esm";

// 数値PNG(RGB) → 浸水深(m)
const rgb2value = (r, g, b) => (r * 65536 + g * 256 + b) * 0.001;

// 浸水深 → パレット色（国交省ガイドライン・バリアフリー配色）
const value2color = (d, ALPHA = 204) => {
  if (d >= 20.0) return [220, 122, 220, ALPHA]; // 20m～
  if (d >= 10.0) return [242, 133, 201, ALPHA]; // 10～20m
  if (d >= 5.0) return [255, 145, 145, ALPHA]; // 5～10m
  if (d >= 3.0) return [255, 183, 183, ALPHA]; // 3～5m
  if (d >= 1.0) return [255, 216, 192, ALPHA]; // 1～3m
  if (d >= 0.5) return [248, 225, 166, ALPHA]; // 0.5～1m
  if (d >= 0.3) return [247, 245, 169, ALPHA]; // 0.3～0.5m
  if (d > 0.0) return [255, 255, 179, ALPHA]; // ～0.3m
  return [0, 0, 0, 0]; // 0 または NoData
};

/*
// 浸水深 → パレット色（東京都「詳細配色版」準拠）
// 例: depth2color(d) または depth2color(d, 255)
const depth2color = (d, ALPHA = 204) => {
  if (d >= 5.0) return [223, 115, 255, ALPHA]; // 5.0m以上（紫）
  if (d >= 3.0) return [0, 112, 255, ALPHA]; // 3.0〜5.0m未満（青）
  if (d >= 2.0) return [45, 193, 223, ALPHA]; // 2.0〜3.0m未満（水色）
  if (d >= 1.0) return [115, 255, 222, ALPHA]; // 1.0〜2.0m未満（黄緑）
  if (d >= 0.5) return [77, 230, 0, ALPHA]; // 0.5〜1.0m未満（黄）
  if (d >= 0.1) return [255, 255, 0, ALPHA]; // 0.1〜0.5m未満（薄黄）
  if (d > 0.0) return [255, 255, 204, ALPHA]; // ～0.1m（ごく浅い）
  return [0, 0, 0, 0]; // 0 または NoData は透明
};
*/

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
        const value = rgb2value(r, g, b);
        const [nr, ng, nb, na] = value2color(value);
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
maplibregl.addProtocol("numpng", (params, callback) => {
  const url = params.url.replace("numpng://", "");

  // 旧API: (params, callback)
  if (typeof callback === "function") {
    buildPngArrayBuffer(url)
      .then(({ data, cacheControl, expires }) =>
        callback(null, data, cacheControl, expires)
      )
      .catch((err) => callback(err));
    return { cancel: () => { } };
  }

  // 新API: Promise を返す
  return buildPngArrayBuffer(url);
});
