# 03. 盤面描画

## 目的

p5.jsを使用して9×9の盤面、駒、壁を描画する。

## 完了条件

- [x] 9×9のグリッドが表示される
- [x] 両プレイヤーの駒が正しい位置に表示される
- [x] 壁が正しいサイズ・位置で表示される
- [x] 情報（手番、残り壁）が表示される

## 詳細設計



### renderer.js - Rendererクラス

```javascript
class Renderer {
  constructor(p5Instance) {
    this.p = p5Instance;
    this.offsetX = 50;  // 盤面の左上X座標
    this.offsetY = 80;  // 盤面の左上Y座標
  }

  // ゲーム全体を描画
  draw(state, uiState) {
    this.p.background(240);
    this.drawInfo(state);
    this.drawBoard();
    this.drawWalls(state);
    this.drawPieces(state);

    if (state.mode === 'play' && state.winner === null) {
      this.drawMoveMarkers(state, uiState);
      this.drawWallPreview(uiState);
    }

    if (state.winner !== null) {
      this.drawWinnerMessage(state.winner);
    }
  }

  // 情報表示（手番、残り壁）
  drawInfo(state) {
    this.p.fill(0);
    this.p.noStroke();
    this.p.textSize(16);
    this.p.textAlign(this.p.LEFT, this.p.TOP);

    const turnText = state.mode === 'edit'
      ? '編集モード'
      : `手番: プレイヤー${state.currentPlayer + 1}`;
    this.p.text(turnText, 10, 10);

    const p1 = state.players[0];
    const p2 = state.players[1];
    this.p.text(`残り壁: P1=${p1.wallsLeft}  P2=${p2.wallsLeft}`, 10, 35);
  }

  // 盤面のグリッド描画
  drawBoard() {
    const p = this.p;
    const size = CELL_SIZE * BOARD_SIZE;

    // 背景
    p.fill(COLORS.BOARD_BG);
    p.noStroke();
    p.rect(this.offsetX, this.offsetY, size, size);

    // グリッド線
    p.stroke(COLORS.BOARD_LINE);
    p.strokeWeight(1);

    for (let i = 0; i <= BOARD_SIZE; i++) {
      const pos = i * CELL_SIZE;
      // 縦線
      p.line(
        this.offsetX + pos, this.offsetY,
        this.offsetX + pos, this.offsetY + size
      );
      // 横線
      p.line(
        this.offsetX, this.offsetY + pos,
        this.offsetX + size, this.offsetY + pos
      );
    }
  }

  // 壁を描画
  drawWalls(state) {
    const p = this.p;
    p.fill(COLORS.WALL);
    p.noStroke();

    for (let wy = 0; wy < WALL_GRID_SIZE; wy++) {
      for (let wx = 0; wx < WALL_GRID_SIZE; wx++) {
        const wallType = state.walls[wy][wx];
        if (wallType !== WALL_DIR.NONE) {
          this.drawWallAt(wx, wy, wallType, COLORS.WALL);
        }
      }
    }
  }

  // 指定位置に壁を描画
  drawWallAt(wx, wy, wallType, color) {
    const p = this.p;
    p.fill(color);
    p.noStroke();

    // 壁交点のピクセル座標
    const cx = this.offsetX + (wx + 1) * CELL_SIZE;
    const cy = this.offsetY + (wy + 1) * CELL_SIZE;

    if (wallType === WALL_DIR.VERTICAL) {
      // 縦壁: 2マス分の高さ
      p.rect(
        cx - WALL_THICKNESS / 2,
        cy - CELL_SIZE,
        WALL_THICKNESS,
        CELL_SIZE * 2
      );
    } else if (wallType === WALL_DIR.HORIZONTAL) {
      // 横壁: 2マス分の幅
      p.rect(
        cx - CELL_SIZE,
        cy - WALL_THICKNESS / 2,
        CELL_SIZE * 2,
        WALL_THICKNESS
      );
    }
  }

  // 駒を描画
  drawPieces(state) {
    const p = this.p;

    for (let i = 0; i < 2; i++) {
      const player = state.players[i];
      const color = i === 0 ? COLORS.PLAYER1 : COLORS.PLAYER2;

      const px = this.offsetX + player.x * CELL_SIZE + CELL_SIZE / 2;
      const py = this.offsetY + player.y * CELL_SIZE + CELL_SIZE / 2;

      p.fill(color);
      p.noStroke();
      p.circle(px, py, PIECE_RADIUS * 2);

      // プレイヤー番号
      p.fill(255);
      p.textSize(14);
      p.textAlign(p.CENTER, p.CENTER);
      p.text(i + 1, px, py);
    }
  }

  // 移動マーカーを描画
  drawMoveMarkers(state, uiState) {
    const p = this.p;
    const validMoves = uiState.validMoves || [];

    for (const move of validMoves) {
      const px = this.offsetX + move.x * CELL_SIZE + CELL_SIZE / 2;
      const py = this.offsetY + move.y * CELL_SIZE + CELL_SIZE / 2;

      // ホバー判定
      const isHovered = uiState.hoveredMove &&
        uiState.hoveredMove.x === move.x &&
        uiState.hoveredMove.y === move.y;

      const radius = isHovered ? MARKER_HOVER_RADIUS : MARKER_RADIUS;
      const color = isHovered ? COLORS.MARKER_HOVER : COLORS.MARKER;

      p.fill(color);
      p.noStroke();
      p.circle(px, py, radius * 2);
    }
  }

  // 壁のプレビュー（影）を描画
  drawWallPreview(uiState) {
    if (!uiState.wallPreview) return;

    const { x, y, dir } = uiState.wallPreview;
    this.drawWallAt(x, y, dir, COLORS.WALL_PREVIEW);
  }

  // 勝者メッセージ
  drawWinnerMessage(winner) {
    const p = this.p;
    const text = `プレイヤー${winner + 1}の勝利！`;

    p.fill(0, 0, 0, 150);
    p.rect(0, 0, p.width, p.height);

    p.fill(255);
    p.textSize(32);
    p.textAlign(p.CENTER, p.CENTER);
    p.text(text, p.width / 2, p.height / 2);
  }

  // ピクセル座標からプレイヤー座標に変換
  pixelToCell(px, py) {
    const x = Math.floor((px - this.offsetX) / CELL_SIZE);
    const y = Math.floor((py - this.offsetY) / CELL_SIZE);
    return { x, y };
  }

  // ピクセル座標から最寄りの壁交点を取得
  pixelToWallPos(px, py) {
    // 交点は (offsetX + CELL_SIZE, offsetY + CELL_SIZE) から始まる
    const wx = Math.round((px - this.offsetX) / CELL_SIZE) - 1;
    const wy = Math.round((py - this.offsetY) / CELL_SIZE) - 1;
    return { wx, wy };
  }

  // 壁交点のピクセル座標を取得
  wallPosToPixel(wx, wy) {
    const px = this.offsetX + (wx + 1) * CELL_SIZE;
    const py = this.offsetY + (wy + 1) * CELL_SIZE;
    return { px, py };
  }

  // マス中心のピクセル座標を取得
  cellCenterToPixel(x, y) {
    const px = this.offsetX + x * CELL_SIZE + CELL_SIZE / 2;
    const py = this.offsetY + y * CELL_SIZE + CELL_SIZE / 2;
    return { px, py };
  }
}
```

## 座標変換の図解

```
ピクセル座標:
  offsetX                    offsetX + CELL_SIZE * 9
  |                          |
  v                          v
  +----+----+----+----+----+
  |    |    |    |    |    |  ← offsetY
  +----*----*----*----+----+
  |    |    |    |    |    |
  +----*----*----*----+----+  ← offsetY + CELL_SIZE * 9

  * = 壁の交点 (wx=0,wy=0 から wx=7,wy=7)
```


