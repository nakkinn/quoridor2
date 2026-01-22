# 02. データ構造の実装

## 目的

ゲーム状態を管理するデータ構造とユーティリティ関数を実装する。

## 完了条件

- [x] GameStateクラスが正常に動作する
- [x] clone()で独立したコピーが作成される
- [x] exportState/importStateが正しく変換できる
- [x] 無効なデータでimportStateがnullを返す

## 詳細設計


### game.js - GameStateクラス

```javascript
class GameState {
  constructor() {
    this.players = [
      { x: 4, y: 0, wallsLeft: 10 },  // プレイヤー1
      { x: 4, y: 8, wallsLeft: 10 }   // プレイヤー2
    ];
    this.walls = this.createEmptyWalls();
    this.currentPlayer = 0;
    this.history = [];      // undo用: 過去の状態スナップショット
    this.mode = 'play';     // 'play' | 'edit'
    this.winner = null;     // 勝者 (0, 1, or null)
  }

  // 8×8の空壁配列を生成
  createEmptyWalls() {
    return Array(WALL_GRID_SIZE).fill(null)
      .map(() => Array(WALL_GRID_SIZE).fill(WALL_DIR.NONE));
  }

  // 状態の深いコピーを作成
  clone() {
    const cloned = new GameState();
    cloned.players = this.players.map(p => ({ ...p }));
    cloned.walls = this.walls.map(row => [...row]);
    cloned.currentPlayer = this.currentPlayer;
    cloned.history = []; // historyはコピーしない（探索用）
    cloned.mode = this.mode;
    cloned.winner = this.winner;
    return cloned;
  }

  // 現在の状態をhistoryに保存
  saveToHistory() {
    this.history.push({
      players: this.players.map(p => ({ ...p })),
      walls: this.walls.map(row => [...row]),
      currentPlayer: this.currentPlayer,
      winner: this.winner
    });
  }

  // historyから復元
  restoreFromHistory() {
    if (this.history.length === 0) return false;
    const prev = this.history.pop();
    this.players = prev.players;
    this.walls = prev.walls;
    this.currentPlayer = prev.currentPlayer;
    this.winner = prev.winner;
    return true;
  }

  // 初期状態にリセット
  reset() {
    this.players = [
      { x: 4, y: 0, wallsLeft: 10 },
      { x: 4, y: 8, wallsLeft: 10 }
    ];
    this.walls = this.createEmptyWalls();
    this.currentPlayer = 0;
    this.history = [];
    this.mode = 'play';
    this.winner = null;
  }

  // 手番を切り替え
  switchTurn() {
    this.currentPlayer = 1 - this.currentPlayer;
  }

  // 現在のプレイヤーを取得
  getCurrentPlayer() {
    return this.players[this.currentPlayer];
  }

  // 相手プレイヤーを取得
  getOpponentPlayer() {
    return this.players[1 - this.currentPlayer];
  }
}
```

### game.js - エクスポート/インポート関数

```javascript
// GameStateをエクスポート文字列に変換
function exportState(state) {
  const p1 = state.players[0];
  const p2 = state.players[1];

  // 壁データを収集
  const wallsData = [];
  for (let wy = 0; wy < WALL_GRID_SIZE; wy++) {
    for (let wx = 0; wx < WALL_GRID_SIZE; wx++) {
      const w = state.walls[wy][wx];
      if (w === WALL_DIR.VERTICAL) {
        wallsData.push(`${wx},${wy},V`);
      } else if (w === WALL_DIR.HORIZONTAL) {
        wallsData.push(`${wx},${wy},H`);
      }
    }
  }

  // 形式: "p1x,p1y,w1;p2x,p2y,w2;turn;壁データ"
  const parts = [
    `${p1.x},${p1.y},${p1.wallsLeft}`,
    `${p2.x},${p2.y},${p2.wallsLeft}`,
    `${state.currentPlayer}`,
    ...wallsData
  ];

  return parts.join(';');
}

// エクスポート文字列をGameStateに変換
function importState(str) {
  try {
    const parts = str.split(';');
    if (parts.length < 3) throw new Error('Invalid format');

    const p1Parts = parts[0].split(',').map(Number);
    const p2Parts = parts[1].split(',').map(Number);
    const turn = parseInt(parts[2]);

    // バリデーション
    if (!validatePlayerPos(p1Parts[0], p1Parts[1])) throw new Error('Invalid P1 position');
    if (!validatePlayerPos(p2Parts[0], p2Parts[1])) throw new Error('Invalid P2 position');
    if (turn !== 0 && turn !== 1) throw new Error('Invalid turn');

    const state = new GameState();
    state.players[0] = { x: p1Parts[0], y: p1Parts[1], wallsLeft: p1Parts[2] };
    state.players[1] = { x: p2Parts[0], y: p2Parts[1], wallsLeft: p2Parts[2] };
    state.currentPlayer = turn;

    // 壁データをパース
    for (let i = 3; i < parts.length; i++) {
      const wallParts = parts[i].split(',');
      const wx = parseInt(wallParts[0]);
      const wy = parseInt(wallParts[1]);
      const dir = wallParts[2] === 'V' ? WALL_DIR.VERTICAL : WALL_DIR.HORIZONTAL;

      if (!validateWallPos(wx, wy)) throw new Error('Invalid wall position');
      state.walls[wy][wx] = dir;
    }

    return state;
  } catch (e) {
    return null; // パース失敗
  }
}

// プレイヤー座標のバリデーション
function validatePlayerPos(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

// 壁座標のバリデーション
function validateWallPos(x, y) {
  return x >= 0 && x < WALL_GRID_SIZE && y >= 0 && y < WALL_GRID_SIZE;
}
```

### game.js - 整形表示用

```javascript
// 整形されたJSON形式で表示
function formatStateForDisplay(state) {
  return JSON.stringify({
    players: state.players,
    walls: getWallsList(state),
    currentPlayer: state.currentPlayer,
    mode: state.mode,
    winner: state.winner
  }, null, 2);
}

// 壁配列をリスト形式に変換
function getWallsList(state) {
  const list = [];
  for (let wy = 0; wy < WALL_GRID_SIZE; wy++) {
    for (let wx = 0; wx < WALL_GRID_SIZE; wx++) {
      const w = state.walls[wy][wx];
      if (w !== WALL_DIR.NONE) {
        list.push({
          x: wx,
          y: wy,
          dir: w === WALL_DIR.VERTICAL ? 'V' : 'H'
        });
      }
    }
  }
  return list;
}
```


