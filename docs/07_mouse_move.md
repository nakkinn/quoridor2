# 07. マウス操作・移動

## 目的

マウス操作による駒の移動機能を実装する。

## 完了条件

- [x] 移動可能マスにマーカーが表示される
- [x] マーカーにホバーするとマーカーが拡大する
- [x] マーカーをクリックすると駒が移動する
- [x] 移動後に手番が切り替わる

## 詳細設計

### input.js - UIStateクラス

```javascript
class UIState {
  constructor() {
    this.validMoves = [];       // 現在の有効な移動先
    this.hoveredMove = null;    // ホバー中の移動先 { x, y }
    this.wallPreview = null;    // 壁プレビュー { x, y, dir }
    this.currentWallDir = WALL_DIR.VERTICAL;  // 現在の壁方向（初期: 縦）
  }

  reset() {
    this.validMoves = [];
    this.hoveredMove = null;
    this.wallPreview = null;
  }
}
```

### input.js - InputHandlerクラス

```javascript
class InputHandler {
  constructor(renderer, gameState, uiState) {
    this.renderer = renderer;
    this.gameState = gameState;
    this.uiState = uiState;
  }

  // 毎フレーム呼ばれる更新処理
  update(mouseX, mouseY) {
    if (this.gameState.mode !== 'play' || this.gameState.winner !== null) {
      this.uiState.reset();
      return;
    }

    // 有効な移動先を更新
    this.uiState.validMoves = getValidMoves(this.gameState);

    // マウス位置の判定
    this.updateHoverState(mouseX, mouseY);
  }

  // ホバー状態を更新
  updateHoverState(mouseX, mouseY) {
    this.uiState.hoveredMove = null;
    this.uiState.wallPreview = null;

    // 移動マーカーのホバーチェック
    const hoveredMove = this.findHoveredMove(mouseX, mouseY);
    if (hoveredMove) {
      this.uiState.hoveredMove = hoveredMove;
      return; // 移動優先
    }

    // 壁プレビューのチェック
    const wallPreview = this.findWallPreview(mouseX, mouseY);
    if (wallPreview) {
      this.uiState.wallPreview = wallPreview;
    }
  }

  // マウス位置にある移動マーカーを探す
  findHoveredMove(mouseX, mouseY) {
    for (const move of this.uiState.validMoves) {
      const { px, py } = this.renderer.cellCenterToPixel(move.x, move.y);

      // マスの正方形内にあるか判定
      const halfCell = CELL_SIZE / 2;
      if (mouseX >= px - halfCell && mouseX <= px + halfCell &&
          mouseY >= py - halfCell && mouseY <= py + halfCell) {
        return move;
      }
    }
    return null;
  }

  // マウス位置に対応する壁プレビューを探す
  findWallPreview(mouseX, mouseY) {
    // 最寄りの壁交点を取得
    const { wx, wy } = this.renderer.pixelToWallPos(mouseX, mouseY);

    // 範囲外チェック
    if (wx < 0 || wx >= WALL_GRID_SIZE || wy < 0 || wy >= WALL_GRID_SIZE) {
      return null;
    }

    // 交点までの距離をチェック
    const { px, py } = this.renderer.wallPosToPixel(wx, wy);
    const distance = Math.sqrt((mouseX - px) ** 2 + (mouseY - py) ** 2);

    if (distance > WALL_HOVER_THRESHOLD) {
      return null;
    }

    // 配置可能かチェック
    const dir = this.uiState.currentWallDir;
    if (!canPlaceWall(this.gameState, wx, wy, dir)) {
      // 現在の方向で配置不可なら逆方向をチェック
      const altDir = dir === WALL_DIR.VERTICAL
        ? WALL_DIR.HORIZONTAL
        : WALL_DIR.VERTICAL;

      if (canPlaceWall(this.gameState, wx, wy, altDir)) {
        return { x: wx, y: wy, dir: altDir };
      }
      return null;
    }

    return { x: wx, y: wy, dir: dir };
  }

  // クリック処理
  handleClick(mouseX, mouseY) {
    if (this.gameState.mode !== 'play' || this.gameState.winner !== null) {
      return;
    }

    // 移動マーカーがホバーされていればそこに移動
    if (this.uiState.hoveredMove) {
      const move = this.uiState.hoveredMove;
      executeMove(this.gameState, move.x, move.y);
      this.uiState.reset();
      return;
    }

    // 壁プレビューがあれば壁を配置
    if (this.uiState.wallPreview) {
      const wall = this.uiState.wallPreview;
      executeWallPlacement(this.gameState, wall.x, wall.y, wall.dir);
      this.uiState.reset();
      return;
    }
  }

  // マウスホイール処理
  handleWheel(delta) {
    if (this.gameState.mode !== 'play') return;

    // 壁の方向を切り替え
    if (this.uiState.currentWallDir === WALL_DIR.VERTICAL) {
      this.uiState.currentWallDir = WALL_DIR.HORIZONTAL;
    } else {
      this.uiState.currentWallDir = WALL_DIR.VERTICAL;
    }
  }
}
```

### main.js - p5.jsイベント統合

```javascript
let gameState;
let uiState;
let renderer;
let inputHandler;

function setup() {
  const canvas = createCanvas(600, 600);
  canvas.parent('canvas-wrapper');

  gameState = new GameState();
  uiState = new UIState();
  renderer = new Renderer(window);  // p5.jsのグローバル関数を使用
  inputHandler = new InputHandler(renderer, gameState, uiState);
}

function draw() {
  inputHandler.update(mouseX, mouseY);
  renderer.draw(gameState, uiState);
  updateStateDisplay();
}

function mouseClicked() {
  inputHandler.handleClick(mouseX, mouseY);
}

function mouseWheel(event) {
  inputHandler.handleWheel(event.delta);
  return false; // ページスクロール防止
}
```

## 操作判定の優先ルール

```
1. カーソルがマスの正方形内？
   └── YES → 移動マーカーをホバー状態に
   └── NO → 次へ

2. 最寄りの壁交点との距離 < 閾値？
   └── YES → 壁プレビューを表示（配置可能なら）
   └── NO → 何も表示しない
```


