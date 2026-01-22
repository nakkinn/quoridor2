# 14. Min-Max探索アルゴリズム（フェーズ3）

## 目的

Min-Max法を使用してn手先まで探索し、より強いCPUプレイヤーを実装する。

## 前提条件

- 13_cpu_algorithm.md の評価関数（evaluate）が実装済み
- getBestMove が1手先読みで動作済み

## 概要

### Min-Max法とは

- 自分の手番: スコアを最大化する手を選ぶ（Max）
- 相手の手番: スコアを最小化する手を選ぶ（Min）
- 交互に探索し、n手先の局面を評価して最適手を決定

### アルファベータ枝刈り

- 探索効率を上げるため、明らかに選ばれない枝を刈る
- α（アルファ）: 自分が確保できる最低スコア
- β（ベータ）: 相手が許容する最高スコア
- α ≥ β となった時点で探索を打ち切り

---

## パラメータ設計

### 調整可能パラメータ

| パラメータ | 初期値 | 説明 |
|-----------|--------|------|
| SEARCH_DEPTH | 2 | 探索の深さ（何手先まで読むか） |
| ALPHA_INIT | -Infinity | アルファの初期値 |
| BETA_INIT | +Infinity | ベータの初期値 |
| PRUNE_THRESHOLD | 100 | 枝刈り閾値（スコアがこれ以上極端なら枝刈り対象）|

### パラメータ変更方法

```javascript
// コードで変更可能な設定オブジェクト
const searchConfig = {
  depth: 2,              // 探索深さ
  pruneThreshold: 100,   // 枝刈り閾値
  enableLogging: true    // 探索数ログ出力
};

// 実行時に変更
searchConfig.depth = 3;
searchConfig.pruneThreshold = 50;
```

---

## 探索統計ログ

### 出力形式

各探索実行時に、深さごとの探索ノード数をコンソールに出力する。

```
=== Min-Max Search ===
Depth 1: 150 nodes
Depth 2: 8,432 nodes
Depth 3: 287,651 nodes
Total: 296,233 nodes
Time: 1,243ms
Best move: wall (3, 4, H)
Score: 12.5
```

### 統計データ構造

```javascript
const searchStats = {
  nodesPerDepth: [],  // [depth1Count, depth2Count, ...]
  totalNodes: 0,
  startTime: 0,
  endTime: 0
};

function resetStats() {
  searchStats.nodesPerDepth = [];
  searchStats.totalNodes = 0;
  searchStats.startTime = performance.now();
}

function logStats(bestMove, score) {
  searchStats.endTime = performance.now();
  const elapsed = searchStats.endTime - searchStats.startTime;

  console.log('=== Min-Max Search ===');
  searchStats.nodesPerDepth.forEach((count, i) => {
    console.log(`Depth ${i + 1}: ${count.toLocaleString()} nodes`);
  });
  console.log(`Total: ${searchStats.totalNodes.toLocaleString()} nodes`);
  console.log(`Time: ${elapsed.toFixed(0)}ms`);
  console.log(`Best move: ${formatMove(bestMove)}`);
  console.log(`Score: ${score}`);
}
```

---

## アルゴリズム設計

### メイン関数

```javascript
/**
 * Min-Max探索で最適手を返す
 * @param {GameState} state - 現在の状態
 * @param {number} depth - 探索深さ（デフォルト: searchConfig.depth）
 * @returns {{ move: Move, score: number }} 最適手とスコア
 */
function getBestMoveMinMax(state, depth = searchConfig.depth) {
  resetStats();

  const playerIndex = state.currentPlayer;
  const result = minmax(state, depth, ALPHA_INIT, BETA_INIT, true, playerIndex);

  if (searchConfig.enableLogging) {
    logStats(result.move, result.score);
  }

  return result;
}
```

### Min-Max再帰関数

```javascript
/**
 * Min-Max探索（アルファベータ枝刈り付き）
 * @param {GameState} state - 現在の状態
 * @param {number} depth - 残り探索深さ
 * @param {number} alpha - アルファ値
 * @param {number} beta - ベータ値
 * @param {boolean} isMaximizing - 最大化プレイヤーか
 * @param {number} originalPlayer - 探索開始時のプレイヤー
 * @returns {{ move: Move|null, score: number }}
 */
function minmax(state, depth, alpha, beta, isMaximizing, originalPlayer) {
  // 統計カウント
  const currentDepth = searchConfig.depth - depth + 1;
  if (!searchStats.nodesPerDepth[currentDepth - 1]) {
    searchStats.nodesPerDepth[currentDepth - 1] = 0;
  }
  searchStats.nodesPerDepth[currentDepth - 1]++;
  searchStats.totalNodes++;

  // 終端条件: 深さ0 or ゲーム終了
  if (depth === 0 || isGameOver(state)) {
    return { move: null, score: evaluate(state, originalPlayer) };
  }

  // 全合法手を取得
  const moves = getAllLegalMoves(state);

  if (isMaximizing) {
    // 自分の手番: 最大化
    let maxScore = -Infinity;
    let bestMove = null;

    for (const move of moves) {
      const newState = applyMove(state, move);
      const result = minmax(newState, depth - 1, alpha, beta, false, originalPlayer);

      if (result.score > maxScore) {
        maxScore = result.score;
        bestMove = move;
      }

      alpha = Math.max(alpha, result.score);

      // ベータカット（枝刈り）
      if (beta <= alpha) {
        break;
      }

      // 極端なスコアによる枝刈り
      if (Math.abs(result.score) >= searchConfig.pruneThreshold) {
        // 勝ち確定/負け確定に近いスコアは早期終了
        break;
      }
    }

    return { move: bestMove, score: maxScore };

  } else {
    // 相手の手番: 最小化
    let minScore = Infinity;
    let bestMove = null;

    for (const move of moves) {
      const newState = applyMove(state, move);
      const result = minmax(newState, depth - 1, alpha, beta, true, originalPlayer);

      if (result.score < minScore) {
        minScore = result.score;
        bestMove = move;
      }

      beta = Math.min(beta, result.score);

      // アルファカット（枝刈り）
      if (beta <= alpha) {
        break;
      }

      // 極端なスコアによる枝刈り
      if (Math.abs(result.score) >= searchConfig.pruneThreshold) {
        break;
      }
    }

    return { move: bestMove, score: minScore };
  }
}
```

### 補助関数

```javascript
/**
 * 全ての合法手を取得（移動 + 壁設置）
 * @param {GameState} state
 * @returns {Move[]}
 */
function getAllLegalMoves(state) {
  const moves = [];

  // 移動手
  const validMoves = getValidMoves(state);
  for (const m of validMoves) {
    moves.push({ type: 'move', x: m.x, y: m.y });
  }

  // 壁設置（残り壁がある場合のみ）
  if (state.players[state.currentPlayer].wallsLeft > 0) {
    for (let wy = 0; wy < 8; wy++) {
      for (let wx = 0; wx < 8; wx++) {
        for (const dir of [1, 2]) {  // 1=縦, 2=横
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
 * @param {Move} move
 * @returns {GameState}
 */
function applyMove(state, move) {
  // ディープコピーして適用
  const newState = deepCopy(state);

  if (move.type === 'move') {
    newState.players[newState.currentPlayer].x = move.x;
    newState.players[newState.currentPlayer].y = move.y;
  } else if (move.type === 'wall') {
    newState.walls[move.wy][move.wx] = move.dir;
    newState.players[newState.currentPlayer].wallsLeft--;
  }

  // 手番交代
  newState.currentPlayer = 1 - newState.currentPlayer;

  return newState;
}

/**
 * ゲーム終了判定
 * @param {GameState} state
 * @returns {boolean}
 */
function isGameOver(state) {
  return state.players[0].y === 8 || state.players[1].y === 0;
}
```

---

## 探索数の見積もり

### 1手あたりの分岐数

| 手の種類 | 最大数 | 平均的な数 |
|---------|--------|-----------|
| 移動 | 5（ジャンプ含む） | 3 |
| 壁設置 | 128（8x8x2） | 50〜80 |
| 合計 | 133 | 50〜80 |

### 深さ別の探索ノード数（理論値）

枝刈りなしの場合:

| 深さ | 計算式 | 概算ノード数 |
|------|--------|-------------|
| 1 | 80 | 80 |
| 2 | 80 × 80 | 6,400 |
| 3 | 80^3 | 512,000 |
| 4 | 80^4 | 40,960,000 |

アルファベータ枝刈りにより、実際の探索数は大幅に削減される（理想的には√N程度）。

---

## 完了条件

- [x] searchConfig オブジェクトで探索パラメータを変更可能
- [x] minmax 関数がアルファベータ枝刈り付きで動作
- [x] 深さごとの探索ノード数をコンソール出力
- [x] 探索時間をコンソール出力
- [ ] 深さ2で実用的な時間（1秒以内）で動作（要検証）
- [x] オートモード（Hキー）でMin-Max版を使用

---

## 実験計画

### 深さと時間の計測

```
深さ1: 目標 < 10ms
深さ2: 目標 < 100ms（初期設定）
深さ3: 目標 < 1000ms
深さ4: 参考計測
```

### 枝刈り閾値の調整

| 閾値 | 期待される効果 |
|------|---------------|
| 50 | 積極的に枝刈り、探索数減少、精度低下の可能性 |
| 100 | バランス（初期値） |
| 200 | 慎重な枝刈り、探索数増加、精度向上 |
| Infinity | 枝刈りなし（参考用） |

---

## UI統合

### Hキー（オートモード）の拡張

- 現在: getBestMove（1手先読み）
- 変更後: getBestMoveMinMax（n手先読み）

### 設定UIの追加（将来）

- 探索深さのスライダー（1〜4）
- 枝刈り閾値の入力フィールド
- 統計表示エリア

---

## 既知の課題・検討事項

1. **状態のコピーコスト**: 毎回ディープコピーは重い → 差分適用/巻き戻し方式を検討
2. **手の順序**: 良さそうな手を先に探索すると枝刈り効率向上 → 移動手を先、評価の高い壁を先
3. **反復深化**: 時間制限内で可能な限り深く探索 → 将来の拡張
4. **トランスポジションテーブル**: 同一局面のキャッシュ → 将来の拡張

---

## 次フェーズ（15以降）

- 手の順序最適化（Move Ordering）
- 反復深化（Iterative Deepening）
- トランスポジションテーブル
- 並列探索（Web Worker）
