/// ****************
// latLngToTile 緯度経度をタイル座標に変換する関数
//  latLng: 緯度経度オブジェクト（lat,lngフィールドを持ちます）
//  z: ズームレベル
//  戻り値: タイル座標オブジェクト（x, yフィールドを持ちます)
//    ※通常，地図ライブラリ内に同様の関数が用意されています．
/// ****************
function latLngToTile(lat, lng, z) {
  // ズームレベル z におけるタイルの総数
  const n = Math.pow(2, z);
  // 経度 lng → タイル X 座標
  const x = ((lng / 180 + 1) * n) / 2;
  // 緯度 lat → タイル Y 座標
  // (メルカトル投影による変換)
  const latRad = (lat * Math.PI) / 180; // 緯度をラジアンに変換
  const y =
    (n * (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI)) / 2;

  return { x, y };
}

/// ****************
// getNumericalValue タイルURL，座標，ズームレベルを指定して数値を取得する関数
//	url: タイル画像のURLテンプレート．
//		ズームレベル，X, Y座標をそれぞれ{z},{x},{y}として埋め込む
//	ll: 緯度経度オブジェクト（lat,lngフィールドを持ちます）
//  z:　ズームレベル
//  factor: 数値を求めるときに使用する係数，デフォルト1
//  offset: 数値を求めるときに使用するオフセット，デフォルト0
//  invalid: 追加無効値を相当する数値で指定．デフォルトは指定なし
//  戻り値: 成功時に数値を受け取るプロミス．無効値の場合はNaNを受け取ります
/// ****************
function getNumericalValue(
  url,
  lat,
  lng,
  z,
  factor = 1,
  offset = 0,
  invalid = undefined
) {
  console.log("z=" + z + " " + "lat=" + lat + " " + "lng=" + lng);
  return new Promise(function (resolve, reject) {
    const p = latLngToTile(lat, lng, z),
      x = Math.floor(p.x), // タイルX座標
      y = Math.floor(p.y), // タイルY座標
      i = (p.x - x) * 256, // タイル内i座標
      j = (p.y - y) * 256, // タイル内j座標
      img = new Image();

    console.log("タイルURL=" + url);
    // console.log("z=" + z + " " + "lat=" + lat + " " + "lng=" + lng);
    console.log("タイルX座標=" + x + " " + "タイルY座標=" + y);

    img.crossOrigin = "anonymous"; // 画像ファイルからデータを取り出すために必要です
    img.onload = function () {
      const canvas = document.createElement("canvas"),
        context = canvas.getContext("2d");
      let r2, v, data;

      canvas.width = 1;
      canvas.height = 1;
      context.drawImage(img, i, j, 1, 1, 0, 0, 1, 1);
      data = context.getImageData(0, 0, 1, 1).data;
      r2 = data[0] < 2 ** 7 ? data[0] : data[0] - 2 ** 8;
      v = r2 * 2 ** 16 + data[1] * 2 ** 8 + data[2];
      if (data[3] !== 255 || (invalid != undefined && v == invalid)) {
        v = NaN;
      }
      resolve(v * factor + offset);
    };
    img.onerror = function () {
      reject(null);
    };
    img.src = url.replace("{z}", z).replace("{y}", y).replace("{x}", x);
  });
}

// ▼▼ 既存コードを変えずに使えるよう、グローバルに公開（追加はこの2行のみ）▼▼
window.latLngToTile = latLngToTile;
window.getNumericalValue = getNumericalValue;
