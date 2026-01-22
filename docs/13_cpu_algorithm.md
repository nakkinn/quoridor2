# 13. CPUアルゴリズム（フェーズ2）

## 目的

CPUプレイヤー実装のための経路解析・評価関数の基盤を構築する。

## 前提条件

- 相手駒は無視（純粋な4方向移動のみで計算）
- 距離 = 手数

## 完了条件

### 基盤機能（完了）
- [x] getDistanceMap が全マスからゴールへの距離マップを返す
- [x] getShortestPath が最短経路を1つ返す
- [x] Aキーで両プレイヤーの最短経路を表示/非表示
- [x] Sキーで距離マップを表示（非表示→P1→P2→非表示）

### 壁評価機能（完了）
- [x] evaluateWallPlacement: 壁設置による距離差（相手距離増加 - 自分距離増加）を返す
- [x] getAllWallEvaluations: 全壁候補の評価を取得
- [x] Dキーで全壁候補を3色表示（有効=緑/無効=灰/不利=赤）
- [x] 壁プレビューが重ならないよう短めに描画

### 確定距離機能（完了）
- [x] isDistanceLocked: ゴールまでの距離が確定しているか判定
- [x] getLockedDistance: 確定距離を返す（壁で妨害不可能な最短距離）
- [x] getLockedDistanceMap: 各マスの確定距離マップを返す
- [x] Fキーで確定距離マップを表示（非表示→P1→P2→非表示）

### 評価関数（完了）
- [x] evaluate: 局面評価値を返す
- [x] getBestMove: 最適な次の手を返す
- [x] Gキーで最適手を可視化

### オートモード（完了）
- [x] Hキーでオートモードのトグル
- [x] P2が1秒遅延で自動操作

---

## 詳細設計

### A. 基本距離計算（実装済み）

```javascript
/**
 * 全マスからゴールへの距離マップを返す
 * @param {number[][]} walls - 8x8壁配列
 * @param {number} goalY - ゴールライン (0 or 8)
 * @returns {number[][]} 9x9配列、各マスからの最短距離
 */
function getDistanceMap(walls, goalY)

/**
 * 最短経路を1つ返す
 * @param {number[][]} walls - 8x8壁配列
 * @param {number} x, y - 現在位置
 * @param {number} goalY - ゴールライン (0 or 8)
 * @returns {Array<{x, y}>} 経路（始点から終点まで）
 */
function getShortestPath(walls, x, y, goalY)
```

### B. 壁評価機能

```javascript
/**
 * 壁設置による距離差を計算
 * @param {GameState} state - 現在の状態
 * @param {number} wx, wy - 壁座標
 * @param {number} dir - 壁の向き
 * @returns {number} 相手の距離増加 - 自分の距離増加（正なら有利）
 */
function evaluateWallPlacement(state, wx, wy, dir)

/**
 * 全ての有効な壁配置候補を評価付きで取得
 * @param {GameState} state - 現在の状態
 * @returns {Array<{wx, wy, dir, score}>} 壁候補と評価値
 */
function getAllWallEvaluations(state)
```

### C. 確定距離機能

```javascript
/**
 * ゴールまでの距離が確定しているか判定
 * （相手の壁では妨害不可能）
 * @param {GameState} state - 現在の状態
 * @param {number} playerIndex - プレイヤー番号
 * @returns {boolean} 確定しているか
 */
function isDistanceLocked(state, playerIndex)

/**
 * 確定距離を返す
 * @param {GameState} state - 現在の状態
 * @param {number} playerIndex - プレイヤー番号
 * @returns {number} 確定距離（確定していない場合は-1）
 */
function getLockedDistance(state, playerIndex)
```

### D. 評価関数（C案: シンプル版）

**設計方針:**
- フェーズ分けなし
- 基本は距離差
- 確定距離ボーナスあり
- 壁の価値は小さな調整のみ

**パラメータ:**
| 項目 | 値 | 説明 |
|------|-----|------|
| LOCKED_BONUS | 5.0 | 自分の距離が確定した場合のボーナス |
| LOCKED_PENALTY | 5.0 | 相手の距離が確定した場合のペナルティ |
| WALL_VALUE | 0.3 | 壁1枚の価値（距離換算） |
| WIN_SCORE | 1000 | 勝ち確定時のスコア |
| GOAL_ADJACENT_BONUS | 3.0 | 壁なしでゴール隣接行に到達した場合のボーナス |
| OPPONENT_REACH_PENALTY | 100 | 相手がリーチ（距離1）の場合のペナルティ |
| OPPONENT_PRE_REACH_PENALTY | 30 | 相手がリーチ一歩手前（距離2）の場合のペナルティ |
| MY_REACH_BONUS | 50 | 自分がリーチ（距離1）の場合のボーナス |
| MY_PRE_REACH_BONUS | 15 | 自分がリーチ一歩手前（距離2）の場合のボーナス |

```javascript
function evaluate(state, playerIndex) {
  const my = state.players[playerIndex];
  const opp = state.players[1 - playerIndex];
  const myGoalY = playerIndex === 0 ? 8 : 0;
  const oppGoalY = playerIndex === 0 ? 0 : 8;

  const myDist = getDistanceMap(state.walls, myGoalY)[my.y][my.x];
  const oppDist = getDistanceMap(state.walls, oppGoalY)[opp.y][opp.x];

  // 勝敗判定
  if (myDist === 0) return WIN_SCORE;   // 自分がゴール済み
  if (oppDist === 0) return -WIN_SCORE; // 相手がゴール済み

  // 基本スコア: 距離差
  let score = oppDist - myDist;

  // リーチ状態のボーナス/ペナルティ（次ターンで勝てる/負ける）
  if (myDist === 1) score += MY_REACH_BONUS;
  if (myDist === 2) score += MY_PRE_REACH_BONUS;
  if (oppDist === 1) score -= OPPONENT_REACH_PENALTY;
  if (oppDist === 2) score -= OPPONENT_PRE_REACH_PENALTY;

  // 確定距離ボーナス/ペナルティ
  const myLocked = getLockedDistance(state, playerIndex);
  const oppLocked = getLockedDistance(state, 1 - playerIndex);
  if (myLocked >= 0) score += LOCKED_BONUS;
  if (oppLocked >= 0) score -= LOCKED_PENALTY;

  // 壁の価値（小さな調整）
  score += (my.wallsLeft - opp.wallsLeft) * WALL_VALUE;

  // ゴール隣接行ボーナス（壁が1つもない場合のみ）
  if (hasNoWalls(state)) {
    const myGoalAdjacentY = playerIndex === 0 ? 7 : 1;
    const oppGoalAdjacentY = playerIndex === 0 ? 1 : 7;
    if (my.y === myGoalAdjacentY) score += GOAL_ADJACENT_BONUS;
    if (opp.y === oppGoalAdjacentY) score -= GOAL_ADJACENT_BONUS;
  }

  return score;
}
```

### E. 最適手探索

```javascript
function getBestMove(state) {
  const playerIndex = state.currentPlayer;
  let bestScore = -Infinity;
  let bestMove = null;

  // 1. 移動手を評価
  const moves = getValidMoves(state);
  for (const move of moves) {
    const testState = applyMove(state, move);
    const score = evaluate(testState, playerIndex);
    if (score > bestScore) {
      bestScore = score;
      bestMove = { type: 'move', x: move.x, y: move.y };
    }
  }

  // 2. 壁設置を評価
  const wallEvals = getAllWallEvaluations(state);
  for (const wall of wallEvals) {
    const testState = applyWall(state, wall);
    const score = evaluate(testState, playerIndex);
    if (score > bestScore) {
      bestScore = score;
      bestMove = { type: 'wall', wx: wall.wx, wy: wall.wy, dir: wall.dir };
    }
  }

  return { move: bestMove, score: bestScore };
}
```

---

## 可視化機能

### キー一覧

| キー | 機能 |
|------|------|
| A | 最短経路表示トグル |
| S | 距離マップ（非表示→P1→P2→非表示） |
| D | 壁評価表示トグル |
| F | 確定距離マップ（非表示→P1→P2→非表示） |
| G | 最適手表示トグル |
| H | オートモードトグル |

### Dキー: 壁候補の評価表示

| 色 | 意味 | 条件 |
|----|------|------|
| 緑 | 有効 | score > 0（相手の距離増加 > 自分の距離増加）|
| 灰 | 無効 | score === 0（影響なし）|
| 赤 | 不利 | score < 0（自分の距離増加 > 相手の距離増加）|

### Gキー: 最適手表示

- 移動の場合: 移動先マスを黄色でハイライト
- 壁の場合: 壁を黄色で表示
- スコアも表示

### Hキー: オートモード

- P1（プレイヤー1）は手動操作
- P2（プレイヤー2）は自動操作（1秒の遅延後にgetBestMoveを実行）
- 対戦モードでのみ有効

---

## 実装順序

1. evaluateWallPlacement 関数
2. getAllWallEvaluations 関数
3. Dキーでの可視化
4. isDistanceLocked / getLockedDistance
5. evaluate 関数

## 枝刈りについて

- 実験しながら段階的に決定
- まずは全128通りを評価して傾向を把握
- 明らかに無意味な壁（到達不可エリア等）は後から除外

## 未決定事項

- [ ] 確定距離の判定アルゴリズム詳細
- [ ] 評価関数の重み付け調整
- [ ] 探索アルゴリズム（Minimax等）の実装（次フェーズ）
