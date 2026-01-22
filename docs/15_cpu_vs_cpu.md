# 15. CPU対CPU対戦機能

## 目的

異なる設定の2つのCPUを対戦させ、アルゴリズムの比較・検証を行う。

## 要件

- P1とP2それぞれに独立した探索設定を持つ
- 両方のプレイヤーを自動操作可能
- 設定はコード上で変更可能
- 対戦ログをコンソールに出力

---

## データ構造

### CPU設定オブジェクト

```javascript
// 各プレイヤーのCPU設定
const cpuConfig = [
  // P1 (index 0)
  {
    enabled: false,           // CPU操作を有効にするか
    depth: 2,                 // 探索深さ
    pruneThreshold: Infinity, // 枝刈り閾値
    delay: 500                // 手を打つまでの遅延(ms)
  },
  // P2 (index 1)
  {
    enabled: true,            // CPU操作を有効にするか
    depth: 2,                 // 探索深さ
    pruneThreshold: Infinity, // 枝刈り閾値
    delay: 1000               // 手を打つまでの遅延(ms)
  }
];

// 共通設定
const cpuCommonConfig = {
  enableLogging: true,        // 探索ログ出力
  autoStart: false            // ゲーム開始時に自動で対戦開始
};
```

### 使用例

```javascript
// P1: 深さ1、P2: 深さ3 で対戦
cpuConfig[0].enabled = true;
cpuConfig[0].depth = 1;
cpuConfig[1].enabled = true;
cpuConfig[1].depth = 3;

// P1のみCPU（従来のオートモード相当）
cpuConfig[0].enabled = false;
cpuConfig[1].enabled = true;

// 遅延なしで高速対戦
cpuConfig[0].delay = 0;
cpuConfig[1].delay = 0;
```

---

## 変更箇所

### 1. board.js

`searchConfig` を `cpuConfig` に置き換え：

```javascript
// 削除
const searchConfig = { ... };

// 追加
const cpuConfig = [
  { enabled: false, depth: 2, pruneThreshold: Infinity, delay: 500 },
  { enabled: true, depth: 2, pruneThreshold: Infinity, delay: 1000 }
];

const cpuCommonConfig = {
  enableLogging: true
};
```

`getBestMoveMinMax` を修正：

```javascript
function getBestMoveMinMax(state, depth, pruneThreshold = Infinity) {
  // depthとpruneThresholdを引数から受け取る
  ...
}
```

### 2. main.js

オートモード処理を両プレイヤー対応に変更：

```javascript
// draw() 内のオートモード処理
if (gameState.mode === 'play' && gameState.winner === null && !gameState.isPlacementPhase()) {
  const playerIndex = gameState.currentPlayer;
  const config = cpuConfig[playerIndex];

  if (config.enabled && !uiState.cpuMoveScheduled[playerIndex]) {
    uiState.cpuMoveScheduled[playerIndex] = true;

    setTimeout(() => {
      if (gameState.mode === 'play' && gameState.winner === null &&
          gameState.currentPlayer === playerIndex && !gameState.isPlacementPhase()) {

        const result = getBestMoveMinMax(gameState, config.depth, config.pruneThreshold);

        if (result.move) {
          if (result.move.type === 'move') {
            executeMove(gameState, result.move.x, result.move.y);
          } else if (result.move.type === 'wall') {
            executeWallPlacement(gameState, result.move.wx, result.move.wy, result.move.dir);
          }
        }
      }
      uiState.cpuMoveScheduled[playerIndex] = false;
    }, config.delay);
  }
}
```

### 3. input.js

UIStateの変更：

```javascript
// autoMoveScheduled を cpuMoveScheduled に変更
this.cpuMoveScheduled = [false, false];  // 各プレイヤー用

// autoMode は削除（cpuConfig.enabled で代用）
```

---

## ログ出力

### 対戦ログ形式

```
=== CPU vs CPU: P1(depth=1) vs P2(depth=3) ===
Turn 1 (P1): move (4, 1)
  Depth 1: 5 nodes, Time: 2ms, Score: -1

Turn 2 (P2): wall (3, 0, H)
  Depth 1: 1 nodes
  Depth 2: 85 nodes
  Depth 3: 4,321 nodes
  Time: 156ms, Score: 2.5

...

=== Game Over: P2 wins in 23 turns ===
```

---

## 完了条件

- [x] cpuConfig で各プレイヤーの設定を独立して変更可能
- [x] 両プレイヤーがCPU操作で自動対戦可能
- [x] 探索深さ・遅延をプレイヤーごとに設定可能
- [x] 対戦ログがコンソールに出力される

---

## 操作方法

### コンソールから設定変更

```javascript
// 深さ1 vs 深さ2 で対戦
cpuConfig[0].enabled = true;
cpuConfig[0].depth = 1;
cpuConfig[1].depth = 2;

// 高速対戦
cpuConfig[0].delay = 100;
cpuConfig[1].delay = 100;
```

### キー操作

| キー | 機能 |
|------|------|
| H | P2のCPU有効/無効をトグル |
| J | CPU vs CPUモードをトグル（両方ON/OFF）|

---

## 将来の拡張

- UIから設定変更可能にする
- 複数回対戦して勝率を計算
- 対戦結果をファイルに保存
