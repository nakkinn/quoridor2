# 08. 壁プレビュー・配置

## 目的

マウス位置に応じた壁のプレビュー表示と配置機能を実装する。

## 完了条件

- [x] マス隙間付近で壁プレビューが表示される
- [x] 移動マーカー上では壁プレビューが表示されない
- [x] 閾値を超えた距離では壁プレビューが表示されない
- [x] 配置不可な壁は影が表示されない
- [x] マウスホイールで壁の向きが切り替わる
- [x] クリックで壁が配置される
- [x] 配置後に残り壁が減り、手番が切り替わる

## 詳細設計

### 壁プレビューの表示条件

```javascript
// input.js の findWallPreview を拡張

findWallPreview(mouseX, mouseY) {
  // 1. 移動マーカー上にいる場合は表示しない
  if (this.uiState.hoveredMove) {
    return null;
  }

  // 2. 最寄りの壁交点を計算
  const { wx, wy } = this.renderer.pixelToWallPos(mouseX, mouseY);

  // 3. 範囲外チェック
  if (wx < 0 || wx >= WALL_GRID_SIZE || wy < 0 || wy >= WALL_GRID_SIZE) {
    return null;
  }

  // 4. 交点までの距離チェック
  const { px, py } = this.renderer.wallPosToPixel(wx, wy);
  const distance = Math.sqrt((mouseX - px) ** 2 + (mouseY - py) ** 2);

  if (distance > WALL_HOVER_THRESHOLD) {
    return null;
  }

  // 5. 残り壁チェック
  const player = this.gameState.getCurrentPlayer();
  if (player.wallsLeft <= 0) {
    return null;
  }

  // 6. 配置可能性チェック（現在の方向優先）
  const dir = this.uiState.currentWallDir;

  if (canPlaceWall(this.gameState, wx, wy, dir)) {
    return { x: wx, y: wy, dir: dir };
  }

  // 7. 逆方向でも配置不可なら表示しない
  const altDir = dir === WALL_DIR.VERTICAL
    ? WALL_DIR.HORIZONTAL
    : WALL_DIR.VERTICAL;

  if (canPlaceWall(this.gameState, wx, wy, altDir)) {
    return { x: wx, y: wy, dir: altDir };
  }

  return null;
}
```

### マウスホイールによる方向切り替え

```javascript
// input.js

handleWheel(delta) {
  if (this.gameState.mode !== 'play' || this.gameState.winner !== null) {
    return;
  }

  // 方向を切り替え
  this.uiState.currentWallDir =
    this.uiState.currentWallDir === WALL_DIR.VERTICAL
      ? WALL_DIR.HORIZONTAL
      : WALL_DIR.VERTICAL;

  // 即座にプレビューを更新するため、現在のマウス位置で再計算
  // (draw()の次フレームで自動的に更新される)
}
```

### 壁プレビューの描画

```javascript
// renderer.js

drawWallPreview(uiState) {
  if (!uiState.wallPreview) return;

  const { x, y, dir } = uiState.wallPreview;

  // 半透明で描画
  this.drawWallAt(x, y, dir, COLORS.WALL_PREVIEW);
}
```

## 壁配置のフロー図

```
┌─────────────────┐
│ マウス移動      │
└────────┬────────┘
         ↓
┌─────────────────┐
│ 移動マーカー上？ │
└────────┬────────┘
    YES  │  NO
    ↓    ↓
  移動優先  ┌─────────────────┐
         │ 最寄り壁交点計算 │
         └────────┬────────┘
                  ↓
         ┌─────────────────┐
         │ 距離 < 閾値？    │
         └────────┬────────┘
             YES  │  NO
             ↓    ↓
         ┌─────────────────┐  非表示
         │ 配置可能？      │
         └────────┬────────┘
             YES  │  NO
             ↓    ↓
         プレビュー表示  ┌─────────────────┐
                      │ 逆方向で可能？  │
                      └────────┬────────┘
                          YES  │  NO
                          ↓    ↓
                      プレビュー表示  非表示
```

## マウスホイールUI

```
現在の壁方向インジケーター（オプション）:

  ┃ ← 縦壁モード時に表示
  または
  ━ ← 横壁モード時に表示

※画面の隅に小さく表示するか、
  カーソル近くにアイコンとして表示
```


