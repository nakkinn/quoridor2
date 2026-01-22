# 04. 駒の移動ロジック

## 目的

駒の移動ルール（基本移動、ジャンプ、斜め移動）を実装する。

## 完了条件

- [x] 4方向への基本移動が正しく判定される
- [x] 壁による移動ブロックが正しく判定される
- [x] 相手駒を飛び越えるジャンプが正しく判定される
- [x] ジャンプ不可時の斜め移動が正しく判定される
- [x] 移動後に手番が切り替わる


## 詳細設計

### board.js - 移動判定関数

```javascript
// 有効な移動先を全て取得
function getValidMoves(state) {
  const player = state.getCurrentPlayer();
  const opponent = state.getOpponentPlayer();
  const moves = [];

  // 4方向の基本移動をチェック
  const directions = [
    { dx: 0, dy: -1, name: 'up' },
    { dx: 0, dy: 1, name: 'down' },
    { dx: -1, dy: 0, name: 'left' },
    { dx: 1, dy: 0, name: 'right' }
  ];

  for (const dir of directions) {
    const nx = player.x + dir.dx;
    const ny = player.y + dir.dy;

    // 盤面外チェック
    if (!isValidCell(nx, ny)) continue;

    // 壁でブロックされているかチェック
    if (isBlocked(state.walls, player.x, player.y, nx, ny)) continue;

    // 相手がいない場合 → 通常移動
    if (opponent.x !== nx || opponent.y !== ny) {
      moves.push({ x: nx, y: ny, type: 'move' });
      continue;
    }

    // 相手がいる場合 → ジャンプまたは斜め移動
    const jumpX = nx + dir.dx;
    const jumpY = ny + dir.dy;

    // ジャンプ先が有効で、壁がない場合
    if (isValidCell(jumpX, jumpY) &&
        !isBlocked(state.walls, nx, ny, jumpX, jumpY)) {
      moves.push({ x: jumpX, y: jumpY, type: 'move' });
    } else {
      // ジャンプできない場合 → 斜め移動
      const diagonals = getDiagonalMoves(dir);
      for (const diag of diagonals) {
        const diagX = nx + diag.dx;
        const diagY = ny + diag.dy;

        if (isValidCell(diagX, diagY) &&
            !isBlocked(state.walls, nx, ny, diagX, diagY)) {
          moves.push({ x: diagX, y: diagY, type: 'move' });
        }
      }
    }
  }

  return moves;
}

// 斜め移動の方向を取得
function getDiagonalMoves(originalDir) {
  if (originalDir.dx === 0) {
    // 上下移動 → 左右に斜め
    return [
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 }
    ];
  } else {
    // 左右移動 → 上下に斜め
    return [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 }
    ];
  }
}

// セルが盤面内か
function isValidCell(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

// 2点間が壁でブロックされているか
function isBlocked(walls, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 1 && dy === 0) {
    // 右へ移動
    return isBlockedRight(walls, x1, y1);
  } else if (dx === -1 && dy === 0) {
    // 左へ移動 = 左のマスから右へ移動
    return isBlockedRight(walls, x2, y2);
  } else if (dx === 0 && dy === 1) {
    // 下へ移動
    return isBlockedDown(walls, x1, y1);
  } else if (dx === 0 && dy === -1) {
    // 上へ移動 = 上のマスから下へ移動
    return isBlockedDown(walls, x2, y2);
  }

  return false;
}

// 右方向の壁チェック
// (x, y) から (x+1, y) への移動をブロックする壁があるか
function isBlockedRight(walls, x, y) {
  // 縦壁は壁座標 (x, y-1) または (x, y) にある場合ブロック
  if (y > 0 && walls[y - 1][x] === WALL_DIR.VERTICAL) return true;
  if (y < WALL_GRID_SIZE && walls[y][x] === WALL_DIR.VERTICAL) return true;
  return false;
}

// 下方向の壁チェック
// (x, y) から (x, y+1) への移動をブロックする壁があるか
function isBlockedDown(walls, x, y) {
  // 横壁は壁座標 (x-1, y) または (x, y) にある場合ブロック
  if (x > 0 && walls[y][x - 1] === WALL_DIR.HORIZONTAL) return true;
  if (x < WALL_GRID_SIZE && walls[y][x] === WALL_DIR.HORIZONTAL) return true;
  return false;
}
```

### board.js - 移動実行

```javascript
// 駒を移動
function executeMove(state, x, y) {
  // 履歴に保存
  state.saveToHistory();

  // 移動
  const player = state.getCurrentPlayer();
  player.x = x;
  player.y = y;

  // 勝利判定
  if (checkVictory(state)) {
    state.winner = state.currentPlayer;
    state.mode = 'edit';
    return;
  }

  // 手番交代
  state.switchTurn();
}

// 勝利判定
function checkVictory(state) {
  const p1 = state.players[0];
  const p2 = state.players[1];

  // P1のゴールは y=8、P2のゴールは y=0
  return (p1.y === 8) || (p2.y === 0);
}
```

## 移動ルール図解

```
基本移動:
    □
    ↑
  □←P→□
    ↓
    □

ジャンプ:
  P → O → J   (OはOpponent、Jはジャンプ先)

斜め移動（ジャンプ先が壁or盤外の場合）:
        D         D = 斜め移動先
        ↗
  P → O ━ (壁)
        ↘
        D
```

