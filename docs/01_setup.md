# 01. プロジェクトセットアップ

## 目的

p5.jsを使用したウェブアプリの基盤を構築する。

## 完了条件

- [x] index.htmlがブラウザで開ける
- [x] p5.jsのcanvasが表示される
- [x] 各jsファイルがエラーなく読み込まれる
- [x] 状態パネルとボタンが表示される

## 成果物

```
ver2/
├── index.html
├── style.css
├── js/
│   ├── main.js      # エントリーポイント
│   ├── constants.js # 定数定義
│   ├── game.js      # ゲーム状態管理
│   ├── board.js     # 盤面ロジック
│   ├── renderer.js  # 描画
│   └── input.js     # 入力処理
```

## 詳細設計

### index.html

```html
<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>Quoridor</title>
  <script src="https://cdn.jsdelivr.net/npm/p5@1.9.0/lib/p5.min.js"></script>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="game-container">
    <div id="canvas-wrapper"></div>
    <div id="state-panel">
      <textarea id="state-input"></textarea>
      <div id="state-formatted"></div>
      <button id="btn-copy">コピー</button>
      <button id="btn-apply">反映</button>
    </div>
  </div>
  <div id="controls">
    <button id="btn-edit">編集モード</button>
    <button id="btn-reset">リセット</button>
  </div>

  <script src="js/constants.js"></script>
  <script src="js/game.js"></script>
  <script src="js/board.js"></script>
  <script src="js/renderer.js"></script>
  <script src="js/input.js"></script>
  <script src="js/main.js"></script>
</body>
</html>
```

### constants.js

```javascript
// 盤面サイズ
const BOARD_SIZE = 9;        // 9×9マス
const WALL_GRID_SIZE = 8;    // 8×8壁交点

// 描画サイズ（ピクセル）
const CELL_SIZE = 50;        // 1マスのサイズ
const WALL_THICKNESS = 8;    // 壁の太さ
const PIECE_RADIUS = 20;     // 駒の半径
const MARKER_RADIUS = 12;    // 移動マーカーの半径
const MARKER_HOVER_RADIUS = 18; // ホバー時のマーカー半径

// 色
const COLORS = {
  BOARD_BG: '#f5deb3',       // 盤面背景
  BOARD_LINE: '#8b4513',     // 盤面の線
  PLAYER1: '#e74c3c',        // プレイヤー1（赤）
  PLAYER2: '#3498db',        // プレイヤー2（青）
  WALL: '#2c3e50',           // 壁
  WALL_PREVIEW: 'rgba(44, 62, 80, 0.4)', // 壁プレビュー
  MARKER: 'rgba(46, 204, 113, 0.6)',     // 移動マーカー
  MARKER_HOVER: 'rgba(46, 204, 113, 0.9)' // ホバー時マーカー
};

// 壁の向き
const WALL_DIR = {
  NONE: 0,
  VERTICAL: 1,
  HORIZONTAL: 2
};

// 壁判定の閾値（ピクセル）
const WALL_HOVER_THRESHOLD = 30;
```


