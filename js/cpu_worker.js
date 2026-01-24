// ========================================
// CPU Worker - 探索処理を別スレッドで実行
// ========================================

// 定数
const BOARD_SIZE = 9;
const WALL_GRID_SIZE = 8;
const WALL_DIR = {
  NONE: 0,
  VERTICAL: 1,
  HORIZONTAL: 2
};

// デフォルトの評価パラメータ
const DEFAULT_EVAL_PARAMS = {
  wallValue: 0.3,
  wallPower: 1,
  winScore: 1000,
  lockedBonus: 5.0,
  lockedPenalty: 5.0,
  myReachBonus: 50,
  myPreReachBonus: 15,
  opponentReachPenalty: 100,
  opponentPreReachPenalty: 30,
  goalAdjacentBonus: 3.0
};

// 探索統計
const searchStats = {
  nodesPerDepth: [],
  totalNodes: 0,
  betaCutoffs: 0,
  alphaCutoffs: 0,
  startTime: 0,
  endTime: 0,
  maxDepth: 0
};

// 前回の手を記録
let lastMoveHistory = [null, null];

// ========================================
// メッセージハンドラ
// ========================================

self.onmessage = function(e) {
  const { type, data } = e.data;

  if (type === 'search') {
    const { state, config, lastMove } = data;
    lastMoveHistory[0] = lastMove;

    const result = getBestMoveMinMax(
      state,
      config.depth,
      config.pruneThreshold,
      config.useLockedDistance,
      config.eval
    );

    self.postMessage({
      type: 'result',
      data: {
        move: result.move,
        score: result.score,
        stats: { ...searchStats }
      }
    });
  } else if (type === 'clearHistory') {
    lastMoveHistory = [null, null];
  }
};

// ========================================
// 盤面ロジック
// ========================================

function isValidCell(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

function isBlocked(walls, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 1 && dy === 0) {
    return isBlockedRight(walls, x1, y1);
  } else if (dx === -1 && dy === 0) {
    return isBlockedRight(walls, x2, y2);
  } else if (dx === 0 && dy === 1) {
    return isBlockedDown(walls, x1, y1);
  } else if (dx === 0 && dy === -1) {
    return isBlockedDown(walls, x2, y2);
  }
  return false;
}

function isBlockedRight(walls, x, y) {
  if (y > 0 && walls[y - 1][x] === WALL_DIR.VERTICAL) return true;
  if (y < WALL_GRID_SIZE && walls[y][x] === WALL_DIR.VERTICAL) return true;
  return false;
}

function isBlockedDown(walls, x, y) {
  if (x > 0 && walls[y][x - 1] === WALL_DIR.HORIZONTAL) return true;
  if (x < WALL_GRID_SIZE && walls[y][x] === WALL_DIR.HORIZONTAL) return true;
  return false;
}

function getValidMoves(state) {
  const player = state.players[state.currentPlayer];
  const opponent = state.players[1 - state.currentPlayer];
  const moves = [];

  const directions = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 }
  ];

  for (const dir of directions) {
    const nx = player.x + dir.dx;
    const ny = player.y + dir.dy;

    if (!isValidCell(nx, ny)) continue;
    if (isBlocked(state.walls, player.x, player.y, nx, ny)) continue;

    if (opponent.x !== nx || opponent.y !== ny) {
      moves.push({ x: nx, y: ny, type: 'move' });
      continue;
    }

    const jumpX = nx + dir.dx;
    const jumpY = ny + dir.dy;

    if (isValidCell(jumpX, jumpY) && !isBlocked(state.walls, nx, ny, jumpX, jumpY)) {
      moves.push({ x: jumpX, y: jumpY, type: 'move' });
    } else {
      const diagonals = getDiagonalMoves(dir);
      for (const diag of diagonals) {
        const diagX = nx + diag.dx;
        const diagY = ny + diag.dy;
        if (isValidCell(diagX, diagY) && !isBlocked(state.walls, nx, ny, diagX, diagY)) {
          moves.push({ x: diagX, y: diagY, type: 'move' });
        }
      }
    }
  }

  return moves;
}

function getDiagonalMoves(originalDir) {
  if (originalDir.dx === 0) {
    return [{ dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
  } else {
    return [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }];
  }
}

function checkVictory(state) {
  if (state.players[0].y === 8) return 0;
  if (state.players[1].y === 0) return 1;
  return null;
}

function canReachGoal(state, playerIndex) {
  const player = state.players[playerIndex];
  const goalY = playerIndex === 0 ? 8 : 0;

  const visited = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(false));
  const queue = [{ x: player.x, y: player.y }];
  visited[player.y][player.x] = true;

  while (queue.length > 0) {
    const current = queue.shift();
    if (current.y === goalY) return true;

    const directions = [
      { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
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

function canPlaceWallBasic(state, wx, wy, dir) {
  if (wx < 0 || wx >= WALL_GRID_SIZE || wy < 0 || wy >= WALL_GRID_SIZE) return false;

  const player = state.players[state.currentPlayer];
  if (player.wallsLeft <= 0) return false;
  if (state.walls[wy][wx] !== WALL_DIR.NONE) return false;

  if (dir === WALL_DIR.VERTICAL) {
    if (wy > 0 && state.walls[wy - 1][wx] === WALL_DIR.VERTICAL) return false;
    if (wy < WALL_GRID_SIZE - 1 && state.walls[wy + 1][wx] === WALL_DIR.VERTICAL) return false;
  } else if (dir === WALL_DIR.HORIZONTAL) {
    if (wx > 0 && state.walls[wy][wx - 1] === WALL_DIR.HORIZONTAL) return false;
    if (wx < WALL_GRID_SIZE - 1 && state.walls[wy][wx + 1] === WALL_DIR.HORIZONTAL) return false;
  }
  return true;
}

function canPlaceWall(state, wx, wy, dir) {
  if (!canPlaceWallBasic(state, wx, wy, dir)) return false;

  const testState = cloneState(state);
  testState.walls[wy][wx] = dir;

  if (!canReachGoal(testState, 0)) return false;
  if (!canReachGoal(testState, 1)) return false;
  return true;
}

function cloneState(state) {
  return {
    players: state.players.map(p => ({ ...p })),
    walls: state.walls.map(row => [...row]),
    currentPlayer: state.currentPlayer,
    winner: state.winner
  };
}

// ========================================
// 距離計算
// ========================================

function getDistanceMap(walls, goalY) {
  const distance = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(-1));
  const queue = [];

  for (let x = 0; x < BOARD_SIZE; x++) {
    distance[goalY][x] = 0;
    queue.push({ x, y: goalY });
  }

  while (queue.length > 0) {
    const current = queue.shift();
    const currentDist = distance[current.y][current.x];

    const directions = [
      { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
      { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
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

function evaluateWallPlacement(state, wx, wy, dir) {
  const currentPlayer = state.players[state.currentPlayer];
  if (currentPlayer.wallsLeft <= 0) return null;

  if (wx < 0 || wx >= WALL_GRID_SIZE || wy < 0 || wy >= WALL_GRID_SIZE) return null;
  if (state.walls[wy][wx] !== WALL_DIR.NONE) return null;

  if (dir === WALL_DIR.VERTICAL) {
    if (wy > 0 && state.walls[wy - 1][wx] === WALL_DIR.VERTICAL) return null;
    if (wy < WALL_GRID_SIZE - 1 && state.walls[wy + 1][wx] === WALL_DIR.VERTICAL) return null;
  } else if (dir === WALL_DIR.HORIZONTAL) {
    if (wx > 0 && state.walls[wy][wx - 1] === WALL_DIR.HORIZONTAL) return null;
    if (wx < WALL_GRID_SIZE - 1 && state.walls[wy][wx + 1] === WALL_DIR.HORIZONTAL) return null;
  }

  const p0 = state.players[0];
  const p1 = state.players[1];
  const dist0Before = getDistanceMap(state.walls, 8)[p0.y][p0.x];
  const dist1Before = getDistanceMap(state.walls, 0)[p1.y][p1.x];

  const testWalls = state.walls.map(row => [...row]);
  testWalls[wy][wx] = dir;

  const dist0After = getDistanceMap(testWalls, 8)[p0.y][p0.x];
  const dist1After = getDistanceMap(testWalls, 0)[p1.y][p1.x];

  if (dist0After === -1 || dist1After === -1) return null;

  const delta0 = dist0After - dist0Before;
  const delta1 = dist1After - dist1Before;

  if (state.currentPlayer === 0) {
    return delta1 - delta0;
  } else {
    return delta0 - delta1;
  }
}

// ========================================
// 評価関数
// ========================================

function evaluate(state, playerIndex, useLockedDistance, evalParams) {
  const my = state.players[playerIndex];
  const opp = state.players[1 - playerIndex];
  const myGoalY = playerIndex === 0 ? 8 : 0;
  const oppGoalY = playerIndex === 0 ? 0 : 8;

  const myDist = getDistanceMap(state.walls, myGoalY)[my.y][my.x];
  const oppDist = getDistanceMap(state.walls, oppGoalY)[opp.y][opp.x];

  if (myDist === 0) return evalParams.winScore;
  if (oppDist === 0) return -evalParams.winScore;

  let score = oppDist - myDist;

  if (myDist === 1) score += evalParams.myReachBonus;
  if (myDist === 2) score += evalParams.myPreReachBonus;
  if (oppDist === 1) score -= evalParams.opponentReachPenalty;
  if (oppDist === 2) score -= evalParams.opponentPreReachPenalty;

  const myWallScore = Math.pow(my.wallsLeft, evalParams.wallPower) * evalParams.wallValue;
  const oppWallScore = Math.pow(opp.wallsLeft, evalParams.wallPower) * evalParams.wallValue;
  score += myWallScore - oppWallScore;

  return score;
}

// ========================================
// 探索
// ========================================

function getAllLegalMoves(state) {
  const moves = [];
  const playerIndex = state.currentPlayer;

  const validMoves = getValidMoves(state);
  for (const m of validMoves) {
    moves.push({ type: 'move', x: m.x, y: m.y });
  }

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

function orderMoves(state, moves) {
  const playerIndex = state.currentPlayer;
  const player = state.players[playerIndex];
  const goalY = playerIndex === 0 ? 8 : 0;

  const distanceMap = getDistanceMap(state.walls, goalY);
  const currentDist = distanceMap[player.y][player.x];

  const scoredMoves = moves.map(move => {
    let score = 0;

    if (move.type === 'move') {
      const newDist = distanceMap[move.y][move.x];
      if (move.y === goalY) {
        score = 10000;
      } else if (newDist < currentDist) {
        score = 1000 + (currentDist - newDist) * 100;
      } else if (newDist === currentDist) {
        score = 500;
      } else {
        score = 100;
      }
    } else if (move.type === 'wall') {
      const wallScore = evaluateWallPlacement(state, move.wx, move.wy, move.dir);
      if (wallScore !== null) {
        score = Math.max(0, Math.min(500, 250 + wallScore * 50));
      } else {
        score = 0;
      }
    }

    return { move, score };
  });

  scoredMoves.sort((a, b) => b.score - a.score);
  return scoredMoves.map(sm => sm.move);
}

function applyMoveToState(state, move) {
  const newState = cloneState(state);
  const playerIndex = newState.currentPlayer;

  if (move.type === 'move') {
    newState.players[playerIndex].x = move.x;
    newState.players[playerIndex].y = move.y;

    const winner = checkVictory(newState);
    if (winner !== null) {
      newState.winner = winner;
    }
  } else if (move.type === 'wall') {
    newState.walls[move.wy][move.wx] = move.dir;
    newState.players[playerIndex].wallsLeft--;
  }

  if (newState.winner === null) {
    newState.currentPlayer = 1 - playerIndex;
  }

  return newState;
}

function isGameOver(state) {
  return state.winner !== null ||
         state.players[0].y === 8 ||
         state.players[1].y === 0;
}

function resetSearchStats(maxDepth) {
  searchStats.nodesPerDepth = [];
  searchStats.totalNodes = 0;
  searchStats.betaCutoffs = 0;
  searchStats.alphaCutoffs = 0;
  searchStats.startTime = performance.now();
  searchStats.maxDepth = maxDepth;
}

function minmax(state, depth, alpha, beta, isMaximizing, originalPlayer, pruneThreshold, useLockedDistance, evalParams) {
  if (depth === 0 || isGameOver(state)) {
    return { move: null, score: evaluate(state, originalPlayer, useLockedDistance, evalParams) };
  }

  const currentDepth = searchStats.maxDepth - depth + 1;
  while (searchStats.nodesPerDepth.length < currentDepth) {
    searchStats.nodesPerDepth.push(0);
  }
  searchStats.nodesPerDepth[currentDepth - 1]++;
  searchStats.totalNodes++;

  let moves = getAllLegalMoves(state);

  if (moves.length === 0) {
    return { move: null, score: evaluate(state, originalPlayer, useLockedDistance, evalParams) };
  }

  moves = orderMoves(state, moves);

  if (isMaximizing) {
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

      if (beta <= alpha) {
        searchStats.betaCutoffs++;
        break;
      }

      if (Math.abs(result.score) >= pruneThreshold) {
        break;
      }
    }

    return { move: bestMove, score: maxScore };

  } else {
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

      if (beta <= alpha) {
        searchStats.alphaCutoffs++;
        break;
      }

      if (Math.abs(result.score) >= pruneThreshold) {
        break;
      }
    }

    return { move: bestMove, score: minScore };
  }
}

function getBestMoveMinMax(state, depth, pruneThreshold, useLockedDistance, evalParams) {
  const playerIndex = state.currentPlayer;
  const actualDepth = depth || 2;
  const actualPruneThreshold = pruneThreshold || Infinity;
  const actualUseLockedDistance = useLockedDistance !== undefined ? useLockedDistance : true;
  const actualEvalParams = evalParams || DEFAULT_EVAL_PARAMS;

  resetSearchStats(actualDepth);

  const result = minmax(state, actualDepth, -Infinity, Infinity, true, playerIndex, actualPruneThreshold, actualUseLockedDistance, actualEvalParams);

  // 戻り手ペナルティの適用
  const lastMove = lastMoveHistory[playerIndex];
  if (result.move && result.move.type === 'move' && lastMove && lastMove.type === 'move') {
    if (result.move.x === lastMove.fromX && result.move.y === lastMove.fromY) {
      const penalizedScore = result.score - 20;
      const moves = getAllLegalMoves(state);
      let bestAlternative = null;
      let bestAltScore = -Infinity;

      for (const move of moves) {
        if (move.type === 'move' && move.x === lastMove.fromX && move.y === lastMove.fromY) {
          continue;
        }
        const newState = applyMoveToState(state, move);
        const score = evaluate(newState, playerIndex, actualUseLockedDistance, actualEvalParams);
        if (score > bestAltScore) {
          bestAltScore = score;
          bestAlternative = move;
        }
      }

      if (bestAlternative && bestAltScore > penalizedScore) {
        result.move = bestAlternative;
        result.score = bestAltScore;
      }
    }
  }

  searchStats.endTime = performance.now();
  return result;
}
