# 05. 壁配置ロジック

## 目的

壁の配置ルール（重複禁止、隣接禁止）を実装する。
※経路保証は06_pathfinding.mdで実装

## 完了条件

- [x] 残り壁がない場合に配置不可
- [x] 既存の壁と同じ位置に配置不可
- [x] 縦壁の上下に縦壁がある場合に配置不可
- [x] 横壁の左右に横壁がある場合に配置不可
- [x] 壁配置後に残り壁が減る
- [x] 壁配置後に手番が切り替わる


## 詳細設計

### board.js - 壁配置判定

```javascript
// 壁が配置可能かチェック（経路保証は別途）
function canPlaceWallBasic(state, wx, wy, dir) {
  // 範囲チェック
  if (wx < 0 || wx >= WALL_GRID_SIZE || wy < 0 || wy >= WALL_GRID_SIZE) {
    return false;
  }

  // 残り壁チェック
  const player = state.getCurrentPlayer();
  if (player.wallsLeft <= 0) {
    return false;
  }

  // その位置に既に壁があるか
  if (state.walls[wy][wx] !== WALL_DIR.NONE) {
    return false;
  }

  // 隣接壁との干渉チェック
  if (dir === WALL_DIR.VERTICAL) {
    // 縦壁: 上下に縦壁があってはならない
    if (wy > 0 && state.walls[wy - 1][wx] === WALL_DIR.VERTICAL) return false;
    if (wy < WALL_GRID_SIZE - 1 && state.walls[wy + 1][wx] === WALL_DIR.VERTICAL) return false;
  } else if (dir === WALL_DIR.HORIZONTAL) {
    // 横壁: 左右に横壁があってはならない
    if (wx > 0 && state.walls[wy][wx - 1] === WALL_DIR.HORIZONTAL) return false;
    if (wx < WALL_GRID_SIZE - 1 && state.walls[wy][wx + 1] === WALL_DIR.HORIZONTAL) return false;
  }

  return true;
}

// 壁配置可能かチェック（経路保証含む）
function canPlaceWall(state, wx, wy, dir) {
  // 基本チェック
  if (!canPlaceWallBasic(state, wx, wy, dir)) {
    return false;
  }

  // 経路保証チェック（仮配置して確認）
  const testState = state.clone();
  testState.walls[wy][wx] = dir;

  // 両プレイヤーがゴールに到達可能か
  if (!canReachGoal(testState, 0)) return false;
  if (!canReachGoal(testState, 1)) return false;

  return true;
}

// 全ての有効な壁配置を取得
function getValidWalls(state) {
  const walls = [];
  const player = state.getCurrentPlayer();

  if (player.wallsLeft <= 0) return walls;

  for (let wy = 0; wy < WALL_GRID_SIZE; wy++) {
    for (let wx = 0; wx < WALL_GRID_SIZE; wx++) {
      // 縦壁
      if (canPlaceWall(state, wx, wy, WALL_DIR.VERTICAL)) {
        walls.push({ x: wx, y: wy, dir: WALL_DIR.VERTICAL, type: 'wall' });
      }
      // 横壁
      if (canPlaceWall(state, wx, wy, WALL_DIR.HORIZONTAL)) {
        walls.push({ x: wx, y: wy, dir: WALL_DIR.HORIZONTAL, type: 'wall' });
      }
    }
  }

  return walls;
}
```

### board.js - 壁配置実行

```javascript
// 壁を配置
function executeWallPlacement(state, wx, wy, dir) {
  // 履歴に保存
  state.saveToHistory();

  // 壁を配置
  state.walls[wy][wx] = dir;

  // 残り壁を減らす
  const player = state.getCurrentPlayer();
  player.wallsLeft--;

  // 手番交代
  state.switchTurn();
}
```

## 壁の干渉ルール図解

```
縦壁の干渉:
  NG: 上下に連続する縦壁
  ┃
  ┃ ← 配置不可
  ┃

  OK: 交差する横壁
  ┃
  ━━━
  ┃

横壁の干渉:
  NG: 左右に連続する横壁
  ━━━━━━ ← 配置不可

  OK: 交差する縦壁
  ━━┃━━
```

## 壁座標と影響範囲

```
壁座標 (wx, wy) に縦壁を置いた場合:
  □ │ □
    │     ← 壁は2マス分の高さ
  □ │ □
    ↑
   (wx, wy)

壁座標 (wx, wy) に横壁を置いた場合:
  □   □
  ━━━━━ ← 壁は2マス分の幅
  □   □
    ↑
   (wx, wy)
```

