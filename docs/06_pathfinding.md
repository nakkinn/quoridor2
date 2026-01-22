# 06. 経路保証（BFS）

## 目的

壁配置時に両プレイヤーがゴールに到達可能であることを保証するBFSを実装する。

## 完了条件

- [x] canReachGoal が正しくゴール到達可能性を判定する
- [x] 壁で完全に囲まれた場合に false を返す
- [ ] getShortestDistance が正しい最短距離を返す（未実装・CPU用）
- [x] 壁配置時の経路保証が正しく機能する

## 詳細設計

### board.js - BFSによる経路探索

```javascript
// 指定プレイヤーがゴールに到達可能か（BFS）
function canReachGoal(state, playerIndex) {
  const player = state.players[playerIndex];
  const goalY = playerIndex === 0 ? 8 : 0;  // P1→y=8, P2→y=0

  // BFS
  const visited = Array(BOARD_SIZE).fill(null)
    .map(() => Array(BOARD_SIZE).fill(false));
  const queue = [{ x: player.x, y: player.y }];
  visited[player.y][player.x] = true;

  while (queue.length > 0) {
    const current = queue.shift();

    // ゴール到達
    if (current.y === goalY) {
      return true;
    }

    // 4方向を探索
    const directions = [
      { dx: 0, dy: -1 },  // 上
      { dx: 0, dy: 1 },   // 下
      { dx: -1, dy: 0 },  // 左
      { dx: 1, dy: 0 }    // 右
    ];

    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;

      // 盤面外
      if (!isValidCell(nx, ny)) continue;

      // 訪問済み
      if (visited[ny][nx]) continue;

      // 壁でブロック
      if (isBlocked(state.walls, current.x, current.y, nx, ny)) continue;

      visited[ny][nx] = true;
      queue.push({ x: nx, y: ny });
    }
  }

  return false;
}

// 最短距離を取得（評価関数用）
function getShortestDistance(state, playerIndex) {
  const player = state.players[playerIndex];
  const goalY = playerIndex === 0 ? 8 : 0;

  // BFS with distance
  const distance = Array(BOARD_SIZE).fill(null)
    .map(() => Array(BOARD_SIZE).fill(-1));
  const queue = [{ x: player.x, y: player.y, dist: 0 }];
  distance[player.y][player.x] = 0;

  while (queue.length > 0) {
    const current = queue.shift();

    // ゴール到達
    if (current.y === goalY) {
      return current.dist;
    }

    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 }
    ];

    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;

      if (!isValidCell(nx, ny)) continue;
      if (distance[ny][nx] !== -1) continue;
      if (isBlocked(state.walls, current.x, current.y, nx, ny)) continue;

      distance[ny][nx] = current.dist + 1;
      queue.push({ x: nx, y: ny, dist: current.dist + 1 });
    }
  }

  return -1; // 到達不可
}
```

## BFSの動作図解

```
初期状態（P1が(4,0)にいる場合）:

  0 1 2 3 4 5 6 7 8
0 . . . . S . . . .   S = Start
1 . . . . . . . . .
2 . . . ━━━━━ . .   壁がある
3 . . . . . . . . .
4 . . . . . . . . .
5 . . . . . . . . .
6 . . . . . . . . .
7 . . . . . . . . .
8 G G G G G G G G G   G = Goal

BFS探索順序:
1. (4,0) からスタート
2. 上下左右の隣接マスをキューに追加
3. 壁でブロックされているマスはスキップ
4. y=8 のいずれかに到達したら true
```

## 計算量の考慮

- 盤面サイズ: 9×9 = 81マス
- 各壁配置チェックでBFSを2回実行（両プレイヤー）
- 最悪ケース: O(81) × 2 = O(162)
- 壁配置候補: 最大 8×8×2 = 128箇所

全壁チェック時: 128 × 162 = 約20,000回の操作
→ 十分高速（ブラウザで問題なし）


