// 盤面ロジック

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

// 有効な移動先を全て取得
function getValidMoves(state) {
  // 配置フェーズ: 自分のスタート行全体が選択可能
  if (state.isPlacementPhase()) {
    const moves = [];
    const startY = state.currentPlayer === 0 ? 0 : 8;
    for (let x = 0; x < BOARD_SIZE; x++) {
      moves.push({ x, y: startY, type: 'place' });
    }
    return moves;
  }

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

// 勝利判定
function checkVictory(state) {
  // P1 (index 0) のゴールは y = 8
  if (state.players[0].y === 8) {
    return 0;
  }
  // P2 (index 1) のゴールは y = 0
  if (state.players[1].y === 0) {
    return 1;
  }
  return null;
}

// 駒を移動（または配置）
function executeMove(state, x, y) {
  const player = state.getCurrentPlayer();
  const playerIndex = state.currentPlayer;

  // 配置フェーズ: 駒を配置
  if (state.isPlacementPhase()) {
    player.x = x;
    player.y = y;
    state.piecePlaced[playerIndex] = true;
    state.switchTurn();
    return;
  }

  // 通常移動
  player.x = x;
  player.y = y;

  // 勝利判定
  const winner = checkVictory(state);
  if (winner !== null) {
    state.winner = winner;
    state.mode = 'edit';
    return;
  }

  // 手番交代
  state.switchTurn();
}

// 指定プレイヤーがゴールに到達可能か（BFS）
function canReachGoal(state, playerIndex) {
  const player = state.players[playerIndex];
  const goalY = playerIndex === 0 ? 8 : 0;

  const visited = Array(BOARD_SIZE).fill(null)
    .map(() => Array(BOARD_SIZE).fill(false));
  const queue = [{ x: player.x, y: player.y }];
  visited[player.y][player.x] = true;

  while (queue.length > 0) {
    const current = queue.shift();

    if (current.y === goalY) {
      return true;
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
      if (visited[ny][nx]) continue;
      if (isBlocked(state.walls, current.x, current.y, nx, ny)) continue;

      visited[ny][nx] = true;
      queue.push({ x: nx, y: ny });
    }
  }

  return false;
}

// 壁が配置可能かチェック（基本チェックのみ）
function canPlaceWallBasic(state, wx, wy, dir) {
  // 配置フェーズでは壁設置不可
  if (state.isPlacementPhase()) {
    return false;
  }

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
    if (wy > 0 && state.walls[wy - 1][wx] === WALL_DIR.VERTICAL) return false;
    if (wy < WALL_GRID_SIZE - 1 && state.walls[wy + 1][wx] === WALL_DIR.VERTICAL) return false;
  } else if (dir === WALL_DIR.HORIZONTAL) {
    if (wx > 0 && state.walls[wy][wx - 1] === WALL_DIR.HORIZONTAL) return false;
    if (wx < WALL_GRID_SIZE - 1 && state.walls[wy][wx + 1] === WALL_DIR.HORIZONTAL) return false;
  }

  return true;
}

// 壁配置可能かチェック（経路保証含む）
function canPlaceWall(state, wx, wy, dir) {
  if (!canPlaceWallBasic(state, wx, wy, dir)) {
    return false;
  }

  // 経路保証チェック（仮配置して確認）
  const testState = state.clone();
  testState.walls[wy][wx] = dir;

  if (!canReachGoal(testState, 0)) return false;
  if (!canReachGoal(testState, 1)) return false;

  return true;
}

// 壁を配置
function executeWallPlacement(state, wx, wy, dir) {
  state.walls[wy][wx] = dir;
  const player = state.getCurrentPlayer();
  player.wallsLeft--;
  state.switchTurn();
}

// ============================================
// CPU アルゴリズム用関数
// ============================================

/**
 * 全マスからゴールへの距離マップを返す
 * @param {number[][]} walls - 8x8壁配列
 * @param {number} goalY - ゴールライン (0 or 8)
 * @returns {number[][]} 9x9配列、各マスからの最短距離 (-1 if unreachable)
 */
function getDistanceMap(walls, goalY) {
  const distance = Array(BOARD_SIZE).fill(null)
    .map(() => Array(BOARD_SIZE).fill(-1));

  // ゴールラインの全マスをキューに追加（距離0）
  const queue = [];
  for (let x = 0; x < BOARD_SIZE; x++) {
    distance[goalY][x] = 0;
    queue.push({ x, y: goalY });
  }

  // BFSでゴールから逆方向に探索
  while (queue.length > 0) {
    const current = queue.shift();
    const currentDist = distance[current.y][current.x];

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
      if (isBlocked(walls, current.x, current.y, nx, ny)) continue;

      distance[ny][nx] = currentDist + 1;
      queue.push({ x: nx, y: ny });
    }
  }

  return distance;
}

/**
 * 最短経路を1つ返す（ゴールから逆算）
 * @param {number[][]} walls - 8x8壁配列
 * @param {number} x - 開始X座標
 * @param {number} y - 開始Y座標
 * @param {number} goalY - ゴールライン (0 or 8)
 * @returns {Array<{x, y}>|null} 経路（始点から終点まで）、到達不可なら null
 */
function getShortestPath(walls, x, y, goalY) {
  const distanceMap = getDistanceMap(walls, goalY);

  // 開始位置が到達不可
  if (distanceMap[y][x] === -1) {
    return null;
  }

  // 距離マップを使って最短経路を構築
  const path = [{ x, y }];
  let cx = x;
  let cy = y;

  while (cy !== goalY) {
    const currentDist = distanceMap[cy][cx];

    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 }
    ];

    for (const dir of directions) {
      const nx = cx + dir.dx;
      const ny = cy + dir.dy;

      if (!isValidCell(nx, ny)) continue;
      if (isBlocked(walls, cx, cy, nx, ny)) continue;

      // 距離が1減少する方向に進む
      if (distanceMap[ny][nx] === currentDist - 1) {
        cx = nx;
        cy = ny;
        path.push({ x: cx, y: cy });
        break;
      }
    }
  }

  return path;
}

/**
 * 壁設置による距離差を計算
 * @param {GameState} state - 現在の状態
 * @param {number} wx - 壁X座標
 * @param {number} wy - 壁Y座標
 * @param {number} dir - 壁の向き
 * @returns {number|null} 相手の距離増加 - 自分の距離増加（正なら有利）、配置不可なら null
 */
function evaluateWallPlacement(state, wx, wy, dir) {
  // 壁残りチェック（現在のプレイヤー）
  const currentPlayer = state.getCurrentPlayer();
  if (currentPlayer.wallsLeft <= 0) {
    return null;
  }

  // 基本配置チェック（壁残りチェックを除く）
  if (wx < 0 || wx >= WALL_GRID_SIZE || wy < 0 || wy >= WALL_GRID_SIZE) {
    return null;
  }
  if (state.walls[wy][wx] !== WALL_DIR.NONE) {
    return null;
  }

  // 隣接壁との干渉チェック
  if (dir === WALL_DIR.VERTICAL) {
    if (wy > 0 && state.walls[wy - 1][wx] === WALL_DIR.VERTICAL) return null;
    if (wy < WALL_GRID_SIZE - 1 && state.walls[wy + 1][wx] === WALL_DIR.VERTICAL) return null;
  } else if (dir === WALL_DIR.HORIZONTAL) {
    if (wx > 0 && state.walls[wy][wx - 1] === WALL_DIR.HORIZONTAL) return null;
    if (wx < WALL_GRID_SIZE - 1 && state.walls[wy][wx + 1] === WALL_DIR.HORIZONTAL) return null;
  }

  // 現在の距離を計算
  const p0 = state.players[0];
  const p1 = state.players[1];
  const dist0Before = getDistanceMap(state.walls, 8)[p0.y][p0.x];
  const dist1Before = getDistanceMap(state.walls, 0)[p1.y][p1.x];

  // 壁を仮配置
  const testWalls = state.walls.map(row => [...row]);
  testWalls[wy][wx] = dir;

  // 経路保証チェック
  const dist0After = getDistanceMap(testWalls, 8)[p0.y][p0.x];
  const dist1After = getDistanceMap(testWalls, 0)[p1.y][p1.x];

  if (dist0After === -1 || dist1After === -1) {
    return null;  // 経路が塞がれる
  }

  // 距離変化を計算
  const delta0 = dist0After - dist0Before;  // P0の距離増加
  const delta1 = dist1After - dist1Before;  // P1の距離増加

  // 現在のプレイヤー視点でスコアを返す
  if (state.currentPlayer === 0) {
    return delta1 - delta0;  // 相手(P1)の増加 - 自分(P0)の増加
  } else {
    return delta0 - delta1;  // 相手(P0)の増加 - 自分(P1)の増加
  }
}

/**
 * 全ての有効な壁配置候補を評価付きで取得
 * @param {GameState} state - 現在の状態
 * @returns {Array<{wx, wy, dir, score}>} 壁候補と評価値
 */
function getAllWallEvaluations(state) {
  const evaluations = [];

  for (let wy = 0; wy < WALL_GRID_SIZE; wy++) {
    for (let wx = 0; wx < WALL_GRID_SIZE; wx++) {
      // 縦壁
      const scoreV = evaluateWallPlacement(state, wx, wy, WALL_DIR.VERTICAL);
      if (scoreV !== null) {
        evaluations.push({ wx, wy, dir: WALL_DIR.VERTICAL, score: scoreV });
      }

      // 横壁
      const scoreH = evaluateWallPlacement(state, wx, wy, WALL_DIR.HORIZONTAL);
      if (scoreH !== null) {
        evaluations.push({ wx, wy, dir: WALL_DIR.HORIZONTAL, score: scoreH });
      }
    }
  }

  return evaluations;
}

/**
 * 特定のマスからゴールまでの距離が確定しているか判定
 * 条件: 相手がどの壁を置いても距離が変わらない、かつ最短ルートが唯一
 * @param {number[][]} walls - 8x8壁配列
 * @param {number} x - 開始X座標
 * @param {number} y - 開始Y座標
 * @param {number} goalY - ゴールライン
 * @param {number} opponentWallsLeft - 相手の残り壁数
 * @returns {boolean} 確定しているか
 */
function isDistanceLockedAt(walls, x, y, goalY, opponentWallsLeft) {
  // 相手の壁が0枚なら確定
  if (opponentWallsLeft === 0) {
    return true;
  }

  const currentDistMap = getDistanceMap(walls, goalY);
  const currentDist = currentDistMap[y][x];

  // 到達不可なら確定ではない
  if (currentDist === -1) {
    return false;
  }

  // ゴール上なら確定
  if (currentDist === 0) {
    return true;
  }

  // 最短ルートが複数あるかチェック
  const pathCount = countShortestPaths(walls, x, y, goalY, currentDistMap);
  if (pathCount > 1) {
    return false;  // 別ルートがある → 確定ではない
  }

  // 相手が置ける全ての壁で距離が変わるかチェック
  for (let wy = 0; wy < WALL_GRID_SIZE; wy++) {
    for (let wx = 0; wx < WALL_GRID_SIZE; wx++) {
      // 縦壁チェック
      if (canPlaceWallAt(walls, wx, wy, WALL_DIR.VERTICAL)) {
        const testWalls = walls.map(row => [...row]);
        testWalls[wy][wx] = WALL_DIR.VERTICAL;
        const newDist = getDistanceMap(testWalls, goalY)[y][x];
        if (newDist !== currentDist) {
          return false;  // 距離が変わる壁がある
        }
      }

      // 横壁チェック
      if (canPlaceWallAt(walls, wx, wy, WALL_DIR.HORIZONTAL)) {
        const testWalls = walls.map(row => [...row]);
        testWalls[wy][wx] = WALL_DIR.HORIZONTAL;
        const newDist = getDistanceMap(testWalls, goalY)[y][x];
        if (newDist !== currentDist) {
          return false;  // 距離が変わる壁がある
        }
      }
    }
  }

  return true;
}

/**
 * 壁が配置可能かチェック（壁配列のみで判定）
 */
function canPlaceWallAt(walls, wx, wy, dir) {
  if (wx < 0 || wx >= WALL_GRID_SIZE || wy < 0 || wy >= WALL_GRID_SIZE) {
    return false;
  }
  if (walls[wy][wx] !== WALL_DIR.NONE) {
    return false;
  }

  if (dir === WALL_DIR.VERTICAL) {
    if (wy > 0 && walls[wy - 1][wx] === WALL_DIR.VERTICAL) return false;
    if (wy < WALL_GRID_SIZE - 1 && walls[wy + 1][wx] === WALL_DIR.VERTICAL) return false;
  } else if (dir === WALL_DIR.HORIZONTAL) {
    if (wx > 0 && walls[wy][wx - 1] === WALL_DIR.HORIZONTAL) return false;
    if (wx < WALL_GRID_SIZE - 1 && walls[wy][wx + 1] === WALL_DIR.HORIZONTAL) return false;
  }

  return true;
}

/**
 * 最短経路の数をカウント（上限付き）
 */
function countShortestPaths(walls, x, y, goalY, distanceMap) {
  const dist = distanceMap[y][x];
  if (dist === 0) return 1;
  if (dist === -1) return 0;

  // メモ化用配列
  const memo = Array(BOARD_SIZE).fill(null)
    .map(() => Array(BOARD_SIZE).fill(-1));

  return countPathsRecursive(walls, x, y, goalY, distanceMap, memo, 0);
}

function countPathsRecursive(walls, x, y, goalY, distanceMap, memo, depth) {
  const dist = distanceMap[y][x];

  // ゴール到達
  if (dist === 0) return 1;

  // メモにあれば返す
  if (memo[y][x] !== -1) return memo[y][x];

  // 深さ制限（無限ループ防止）
  if (depth > 20) return 1;

  const directions = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 }
  ];

  let count = 0;
  for (const dir of directions) {
    const nx = x + dir.dx;
    const ny = y + dir.dy;

    if (!isValidCell(nx, ny)) continue;
    if (isBlocked(walls, x, y, nx, ny)) continue;

    // 距離が1減る方向のみ
    if (distanceMap[ny][nx] === dist - 1) {
      count += countPathsRecursive(walls, nx, ny, goalY, distanceMap, memo, depth + 1);
      // 2以上なら早期終了（複数あることが分かればOK）
      if (count >= 2) {
        memo[y][x] = count;
        return count;
      }
    }
  }

  memo[y][x] = count;
  return count;
}

/**
 * ゴールまでの距離が確定しているか判定（GameState版）
 */
function isDistanceLocked(state, playerIndex) {
  const player = state.players[playerIndex];
  const opponent = state.players[1 - playerIndex];
  const goalY = playerIndex === 0 ? 8 : 0;

  return isDistanceLockedAt(state.walls, player.x, player.y, goalY, opponent.wallsLeft);
}

/**
 * 確定距離を返す
 * @param {GameState} state - 現在の状態
 * @param {number} playerIndex - プレイヤー番号
 * @returns {number} 確定距離（確定していない場合は-1）
 */
function getLockedDistance(state, playerIndex) {
  if (!isDistanceLocked(state, playerIndex)) {
    return -1;
  }

  const player = state.players[playerIndex];
  const goalY = playerIndex === 0 ? 8 : 0;
  return getDistanceMap(state.walls, goalY)[player.y][player.x];
}

/**
 * 各マスの確定距離情報を取得
 * @param {GameState} state - 現在の状態
 * @param {number} playerIndex - プレイヤー番号
 * @returns {number[][]} 9x9配列、確定距離（未確定なら-1）
 */
function getLockedDistanceMap(state, playerIndex) {
  const opponent = state.players[1 - playerIndex];
  const goalY = playerIndex === 0 ? 8 : 0;
  const distanceMap = getDistanceMap(state.walls, goalY);

  const lockedMap = Array(BOARD_SIZE).fill(null)
    .map(() => Array(BOARD_SIZE).fill(-1));

  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (distanceMap[y][x] >= 0) {
        if (isDistanceLockedAt(state.walls, x, y, goalY, opponent.wallsLeft)) {
          lockedMap[y][x] = distanceMap[y][x];
        }
      }
    }
  }

  return lockedMap;
}

// ============================================
// 評価関数・最適手探索
// ============================================

/**
 * 局面を評価
 * @param {GameState} state - 現在の状態
 * @param {number} playerIndex - 評価する視点のプレイヤー
 * @param {boolean} [useLockedDistance=true] - 確定距離を計算するか
 * @param {Object} [evalParams=DEFAULT_EVAL_PARAMS] - 評価パラメータ
 * @returns {number} 評価値（正なら有利、負なら不利）
 */
function evaluate(state, playerIndex, useLockedDistance = true, evalParams = DEFAULT_EVAL_PARAMS) {
  const my = state.players[playerIndex];
  const opp = state.players[1 - playerIndex];
  const myGoalY = playerIndex === 0 ? 8 : 0;
  const oppGoalY = playerIndex === 0 ? 0 : 8;

  const myDist = getDistanceMap(state.walls, myGoalY)[my.y][my.x];
  const oppDist = getDistanceMap(state.walls, oppGoalY)[opp.y][opp.x];

  // 勝敗判定
  if (myDist === 0) return evalParams.winScore;
  if (oppDist === 0) return -evalParams.winScore;

  // 基本スコア: 距離差
  let score = oppDist - myDist;

  // リーチ状態のボーナス/ペナルティ（次ターンで勝てる/負ける）
  if (myDist === 1) score += evalParams.myReachBonus;
  if (myDist === 2) score += evalParams.myPreReachBonus;
  if (oppDist === 1) score -= evalParams.opponentReachPenalty;
  if (oppDist === 2) score -= evalParams.opponentPreReachPenalty;

  // 確定距離ボーナス/ペナルティ（オプション）
  if (useLockedDistance) {
    const myLocked = getLockedDistance(state, playerIndex);
    const oppLocked = getLockedDistance(state, 1 - playerIndex);
    if (myLocked >= 0) score += evalParams.lockedBonus;
    if (oppLocked >= 0) score -= evalParams.lockedPenalty;
  }

  // 壁の価値（wallPowerで線形/二乗などを切り替え）
  const myWallScore = Math.pow(my.wallsLeft, evalParams.wallPower) * evalParams.wallValue;
  const oppWallScore = Math.pow(opp.wallsLeft, evalParams.wallPower) * evalParams.wallValue;
  score += myWallScore - oppWallScore;

  // ゴール隣接行ボーナス（壁が1つもない場合のみ）
  const hasNoWalls = state.walls.every(row => row.every(cell => cell === WALL_DIR.NONE));
  if (hasNoWalls) {
    const myGoalAdjacentY = playerIndex === 0 ? 7 : 1;
    const oppGoalAdjacentY = playerIndex === 0 ? 1 : 7;
    if (my.y === myGoalAdjacentY) score += evalParams.goalAdjacentBonus;
    if (opp.y === oppGoalAdjacentY) score -= evalParams.goalAdjacentBonus;
  }

  return score;
}

/**
 * 最適な次の手を探索
 * @param {GameState} state - 現在の状態
 * @returns {{move: Object, score: number}} 最適手とスコア
 */
function getBestMove(state) {
  const playerIndex = state.currentPlayer;
  let bestScore = -Infinity;
  let bestMove = null;

  // 1. 移動手を評価
  const moves = getValidMoves(state);
  for (const move of moves) {
    const testState = state.clone();
    testState.players[playerIndex].x = move.x;
    testState.players[playerIndex].y = move.y;

    const score = evaluate(testState, playerIndex);
    if (score > bestScore) {
      bestScore = score;
      bestMove = { type: 'move', x: move.x, y: move.y };
    }
  }

  // 2. 壁設置を評価（壁が残っている場合のみ）
  const currentPlayer = state.players[playerIndex];
  if (currentPlayer.wallsLeft > 0) {
    for (let wy = 0; wy < WALL_GRID_SIZE; wy++) {
      for (let wx = 0; wx < WALL_GRID_SIZE; wx++) {
        for (const dir of [WALL_DIR.VERTICAL, WALL_DIR.HORIZONTAL]) {
          if (canPlaceWall(state, wx, wy, dir)) {
            const testState = state.clone();
            testState.walls[wy][wx] = dir;
            testState.players[playerIndex].wallsLeft--;

            const score = evaluate(testState, playerIndex);
            if (score > bestScore) {
              bestScore = score;
              bestMove = { type: 'wall', wx, wy, dir };
            }
          }
        }
      }
    }
  }

  return { move: bestMove, score: bestScore };
}

// ============================================
// Min-Max探索
// ============================================

// デフォルトの評価パラメータ
const DEFAULT_EVAL_PARAMS = {
  wallValue: 0.3,              // 壁1枚の価値
  wallPower: 1,                // 壁評価の指数（1=線形、2=二乗）
  winScore: 1000,              // 勝ち確定スコア
  lockedBonus: 5.0,            // 確定距離ボーナス
  lockedPenalty: 5.0,          // 確定距離ペナルティ
  myReachBonus: 50,            // 自分リーチ（距離1）ボーナス
  myPreReachBonus: 15,         // 自分リーチ一歩手前（距離2）ボーナス
  opponentReachPenalty: 100,   // 相手リーチペナルティ
  opponentPreReachPenalty: 30, // 相手リーチ一歩手前ペナルティ
  goalAdjacentBonus: 3.0       // ゴール隣接行ボーナス
};

// 各プレイヤーのCPU設定（コードで変更可能）
const cpuConfig = [
  // P1 (index 0)
  {
    enabled: false,           // CPU操作を有効にするか
    depth: 2,                 // 探索深さ
    pruneThreshold: Infinity, // 枝刈り閾値
    delay: 500,               // 手を打つまでの遅延(ms)
    useLockedDistance: true,  // 確定距離を計算するか
    eval: { ...DEFAULT_EVAL_PARAMS }  // 評価パラメータ
  },
  // P2 (index 1)
  {
    enabled: false,           // CPU操作を有効にするか
    depth: 3,                 // 探索深さ
    pruneThreshold: Infinity, // 枝刈り閾値
    delay: 500,               // 手を打つまでの遅延(ms)
    useLockedDistance: false, // 確定距離を計算するか
    eval: { ...DEFAULT_EVAL_PARAMS }  // 評価パラメータ
  }
];

cpuConfig[1].eval.wallValue = 0.5;

/*設定カスタマイズ例
// P2の壁評価を二乗にして、壁を大事にさせる
cpuConfig[1].eval.wallPower = 2;
cpuConfig[1].eval.wallValue = 0.1;

// P1の壁価値を上げる
cpuConfig[0].eval.wallValue = 1.0;

// 設定を確認
console.log(cpuConfig[0].eval);
console.log(cpuConfig[1].eval);
*/


// 共通設定
const cpuCommonConfig = {
  enableLogging: true         // 探索ログ出力
};

// 探索統計
const searchStats = {
  nodesPerDepth: [],  // 深さごとのノード数
  totalNodes: 0,      // 総ノード数
  startTime: 0,       // 開始時刻
  endTime: 0,         // 終了時刻
  maxDepth: 0         // 今回の探索深さ（ログ用）
};

/**
 * 統計をリセット
 * @param {number} maxDepth - 今回の探索深さ
 */
function resetSearchStats(maxDepth) {
  searchStats.nodesPerDepth = [];
  searchStats.totalNodes = 0;
  searchStats.startTime = performance.now();
  searchStats.maxDepth = maxDepth;
}

/**
 * 統計をコンソール出力
 * @param {number} playerIndex - プレイヤー番号
 * @param {Object} bestMove - 最適手
 * @param {number} score - スコア
 */
function logSearchStats(playerIndex, bestMove, score) {
  searchStats.endTime = performance.now();
  const elapsed = searchStats.endTime - searchStats.startTime;

  console.log(`=== P${playerIndex + 1} Min-Max (depth=${searchStats.maxDepth}) ===`);
  searchStats.nodesPerDepth.forEach((count, i) => {
    console.log(`  Depth ${i + 1}: ${count.toLocaleString()} nodes`);
  });
  console.log(`  Total: ${searchStats.totalNodes.toLocaleString()} nodes`);
  console.log(`  Time: ${elapsed.toFixed(0)}ms`);
  console.log(`  Best: ${formatMove(bestMove)}, Score: ${score.toFixed(1)}`);
}

/**
 * 手を文字列化
 */
function formatMove(move) {
  if (!move) return 'none';
  if (move.type === 'move') {
    return `move (${move.x}, ${move.y})`;
  } else if (move.type === 'wall') {
    const dirStr = move.dir === WALL_DIR.VERTICAL ? 'V' : 'H';
    return `wall (${move.wx}, ${move.wy}, ${dirStr})`;
  }
  return 'unknown';
}

/**
 * 全ての合法手を取得（移動 + 壁設置）
 * @param {GameState} state
 * @returns {Array<{type: string, ...}>}
 */
function getAllLegalMoves(state) {
  const moves = [];
  const playerIndex = state.currentPlayer;

  // 移動手
  const validMoves = getValidMoves(state);
  for (const m of validMoves) {
    moves.push({ type: 'move', x: m.x, y: m.y });
  }

  // 壁設置（残り壁がある場合のみ）
  if (state.players[playerIndex].wallsLeft > 0) {
    for (let wy = 0; wy < WALL_GRID_SIZE; wy++) {
      for (let wx = 0; wx < WALL_GRID_SIZE; wx++) {
        for (const dir of [WALL_DIR.VERTICAL, WALL_DIR.HORIZONTAL]) {
          if (canPlaceWall(state, wx, wy, dir)) {
            moves.push({ type: 'wall', wx, wy, dir });
          }
        }
      }
    }
  }

  return moves;
}

/**
 * 手を適用して新しい状態を返す（元の状態は変更しない）
 * @param {GameState} state
 * @param {Object} move
 * @returns {GameState}
 */
function applyMoveToState(state, move) {
  const newState = state.clone();
  const playerIndex = newState.currentPlayer;

  if (move.type === 'move') {
    newState.players[playerIndex].x = move.x;
    newState.players[playerIndex].y = move.y;

    // 勝利判定
    const winner = checkVictory(newState);
    if (winner !== null) {
      newState.winner = winner;
    }
  } else if (move.type === 'wall') {
    newState.walls[move.wy][move.wx] = move.dir;
    newState.players[playerIndex].wallsLeft--;
  }

  // 手番交代（勝者がいない場合）
  if (newState.winner === null) {
    newState.currentPlayer = 1 - playerIndex;
  }

  return newState;
}

/**
 * ゲーム終了判定
 * @param {GameState} state
 * @returns {boolean}
 */
function isGameOver(state) {
  return state.winner !== null ||
         state.players[0].y === 8 ||
         state.players[1].y === 0;
}

/**
 * Min-Max探索（アルファベータ枝刈り付き）
 * @param {GameState} state - 現在の状態
 * @param {number} depth - 残り探索深さ
 * @param {number} alpha - アルファ値
 * @param {number} beta - ベータ値
 * @param {boolean} isMaximizing - 最大化プレイヤーか
 * @param {number} originalPlayer - 探索開始時のプレイヤー
 * @param {number} pruneThreshold - 枝刈り閾値
 * @param {boolean} useLockedDistance - 確定距離を計算するか
 * @param {Object} evalParams - 評価パラメータ
 * @returns {{move: Object|null, score: number}}
 */
function minmax(state, depth, alpha, beta, isMaximizing, originalPlayer, pruneThreshold, useLockedDistance, evalParams) {
  // 終端条件: 深さ0 or ゲーム終了
  if (depth === 0 || isGameOver(state)) {
    return { move: null, score: evaluate(state, originalPlayer, useLockedDistance, evalParams) };
  }

  // 統計カウント（終端ノードはカウントしない）
  const currentDepth = searchStats.maxDepth - depth + 1;
  while (searchStats.nodesPerDepth.length < currentDepth) {
    searchStats.nodesPerDepth.push(0);
  }
  searchStats.nodesPerDepth[currentDepth - 1]++;
  searchStats.totalNodes++;

  // 全合法手を取得
  const moves = getAllLegalMoves(state);

  if (moves.length === 0) {
    // 合法手がない（通常は発生しない）
    return { move: null, score: evaluate(state, originalPlayer, useLockedDistance, evalParams) };
  }

  if (isMaximizing) {
    // 自分の手番: 最大化
    let maxScore = -Infinity;
    let bestMove = null;

    for (const move of moves) {
      const newState = applyMoveToState(state, move);
      const result = minmax(newState, depth - 1, alpha, beta, false, originalPlayer, pruneThreshold, useLockedDistance, evalParams);

      if (result.score > maxScore) {
        maxScore = result.score;
        bestMove = move;
      }

      alpha = Math.max(alpha, result.score);

      // ベータカット（枝刈り）
      if (beta <= alpha) {
        break;
      }

      // 極端なスコアによる枝刈り（pruneThresholdがInfinityなら発動しない）
      if (Math.abs(result.score) >= pruneThreshold) {
        break;
      }
    }

    return { move: bestMove, score: maxScore };

  } else {
    // 相手の手番: 最小化
    let minScore = Infinity;
    let bestMove = null;

    for (const move of moves) {
      const newState = applyMoveToState(state, move);
      const result = minmax(newState, depth - 1, alpha, beta, true, originalPlayer, pruneThreshold, useLockedDistance, evalParams);

      if (result.score < minScore) {
        minScore = result.score;
        bestMove = move;
      }

      beta = Math.min(beta, result.score);

      // アルファカット（枝刈り）
      if (beta <= alpha) {
        break;
      }

      // 極端なスコアによる枝刈り（pruneThresholdがInfinityなら発動しない）
      if (Math.abs(result.score) >= pruneThreshold) {
        break;
      }
    }

    return { move: bestMove, score: minScore };
  }
}

/**
 * Min-Max探索で最適手を返す
 * @param {GameState} state - 現在の状態
 * @param {number} [depth] - 探索深さ（省略時: 該当プレイヤーのcpuConfig.depth）
 * @param {number} [pruneThreshold] - 枝刈り閾値（省略時: 該当プレイヤーのcpuConfig.pruneThreshold）
 * @param {boolean} [useLockedDistance] - 確定距離を計算するか（省略時: 該当プレイヤーのcpuConfig.useLockedDistance）
 * @param {Object} [evalParams] - 評価パラメータ（省略時: 該当プレイヤーのcpuConfig.eval）
 * @returns {{move: Object, score: number}} 最適手とスコア
 */
function getBestMoveMinMax(state, depth, pruneThreshold, useLockedDistance, evalParams) {
  const playerIndex = state.currentPlayer;
  const config = cpuConfig[playerIndex];

  // 引数が省略された場合はcpuConfigから取得
  const actualDepth = depth !== undefined ? depth : config.depth;
  const actualPruneThreshold = pruneThreshold !== undefined ? pruneThreshold : config.pruneThreshold;
  const actualUseLockedDistance = useLockedDistance !== undefined ? useLockedDistance : config.useLockedDistance;
  const actualEvalParams = evalParams !== undefined ? evalParams : config.eval;

  resetSearchStats(actualDepth);

  const result = minmax(state, actualDepth, -Infinity, Infinity, true, playerIndex, actualPruneThreshold, actualUseLockedDistance, actualEvalParams);

  if (cpuCommonConfig.enableLogging) {
    logSearchStats(playerIndex, result.move, result.score);
  }

  return result;
}
