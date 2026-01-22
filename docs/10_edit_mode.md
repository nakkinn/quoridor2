# 10. 編集モード

## 目的

盤面を自由に編集できるモードを実装する（CPU開発用）。

## 完了条件

- [x] 編集モード/対戦モードの切り替えができる
- [x] 編集モード時は盤面に視覚的なインジケーターが表示される
- [x] 駒をクリックして別のマスに移動できる
- [x] 壁を自由に配置/削除できる
- [x] 編集モードでは経路保証チェックをスキップする
- [x] 対戦モードに戻ると勝者がクリアされる


## 詳細設計

### モード切り替え

```javascript
// game.js - GameStateクラス内

toggleMode() {
  if (this.mode === 'play') {
    this.mode = 'edit';
  } else {
    this.mode = 'play';
    this.winner = null;  // 勝者をクリア
  }
}

setMode(mode) {
  this.mode = mode;
  if (mode === 'play') {
    this.winner = null;
  }
}
```

### 編集モードのUI

```javascript
// input.js - InputHandlerクラス拡張

// 編集モード用の状態
class EditModeState {
  constructor() {
    this.selectedPiece = null;  // 選択中の駒 (0 or 1)
    this.draggedPiece = null;   // ドラッグ中の駒
  }
}

// 編集モードのクリック処理
handleEditClick(mouseX, mouseY) {
  const cell = this.renderer.pixelToCell(mouseX, mouseY);

  // 盤面外なら無視
  if (!isValidCell(cell.x, cell.y)) return;

  // 駒のクリック判定
  for (let i = 0; i < 2; i++) {
    const player = this.gameState.players[i];
    if (player.x === cell.x && player.y === cell.y) {
      // 駒を選択
      this.editState.selectedPiece = i;
      return;
    }
  }

  // 駒が選択されている場合、その駒を移動
  if (this.editState.selectedPiece !== null) {
    const player = this.gameState.players[this.editState.selectedPiece];

    // 他の駒と同じ位置でないことを確認
    const other = this.gameState.players[1 - this.editState.selectedPiece];
    if (cell.x !== other.x || cell.y !== other.y) {
      player.x = cell.x;
      player.y = cell.y;
    }
    this.editState.selectedPiece = null;
    return;
  }

  // 壁の交点付近なら壁を配置/削除
  const { wx, wy } = this.renderer.pixelToWallPos(mouseX, mouseY);
  if (wx >= 0 && wx < WALL_GRID_SIZE && wy >= 0 && wy < WALL_GRID_SIZE) {
    this.toggleWallAt(wx, wy);
  }
}

// 壁の配置/削除をトグル
toggleWallAt(wx, wy) {
  const current = this.gameState.walls[wy][wx];
  const dir = this.uiState.currentWallDir;

  if (current === WALL_DIR.NONE) {
    // 壁がない場合は配置（干渉チェックなし）
    this.gameState.walls[wy][wx] = dir;
  } else if (current === dir) {
    // 同じ向きの壁がある場合は削除
    this.gameState.walls[wy][wx] = WALL_DIR.NONE;
  } else {
    // 異なる向きの壁がある場合は向きを変更
    this.gameState.walls[wy][wx] = dir;
  }
}
```

### 編集モードの描画

```javascript
// renderer.js

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

  if (state.mode === 'edit') {
    this.drawEditModeIndicator();
    this.drawEditWallPreview(uiState);
  }

  if (state.winner !== null) {
    this.drawWinnerMessage(state.winner);
  }
}

// 編集モードインジケーター
drawEditModeIndicator() {
  const p = this.p;

  // 盤面の周りに枠を表示
  p.noFill();
  p.stroke(100, 100, 255);
  p.strokeWeight(3);
  p.rect(
    this.offsetX - 5,
    this.offsetY - 5,
    CELL_SIZE * BOARD_SIZE + 10,
    CELL_SIZE * BOARD_SIZE + 10
  );
}

// 編集モード時の壁プレビュー（制限なし）
drawEditWallPreview(uiState) {
  if (!uiState.wallPreview) return;
  const { x, y, dir } = uiState.wallPreview;
  this.drawWallAt(x, y, dir, COLORS.WALL_PREVIEW);
}
```

### 編集モードのボタン処理

```javascript
// main.js

function setupButtons() {
  const editBtn = document.getElementById('btn-edit');
  editBtn.addEventListener('click', () => {
    gameState.toggleMode();
    updateButtonLabel();
  });
}

function updateButtonLabel() {
  const editBtn = document.getElementById('btn-edit');
  editBtn.textContent = gameState.mode === 'play' ? '編集モード' : '対戦モード';
}
```

## 編集モードの機能一覧

| 操作 | 挙動 |
|------|------|
| マスをクリック（駒あり） | 駒を選択 |
| マスをクリック（駒選択中） | 駒を移動 |
| 壁交点をクリック（壁なし） | 壁を配置 |
| 壁交点をクリック（同じ向き） | 壁を削除 |
| 壁交点をクリック（違う向き） | 向きを変更 |
| マウスホイール | 壁の向きを切り替え |

