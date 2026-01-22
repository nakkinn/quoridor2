// ゲーム状態を管理するクラス
class GameState {
  constructor() {
    this.players = [
      { x: 4, y: 0, wallsLeft: 10 },  // プレイヤー1（上から開始）
      { x: 4, y: 8, wallsLeft: 10 }   // プレイヤー2（下から開始）
    ];
    this.walls = this.createEmptyWalls();
    this.currentPlayer = 0;  // 0 or 1
    this.mode = 'play';      // 'play' | 'edit'
    this.winner = null;      // 勝者 (0, 1, or null)
    this.firstPlayer = 0;    // 先手 (0 or 1)
    this.turnNumber = 1;     // ターン番号（1, 2は配置フェーズ）
    this.piecePlaced = [false, false];  // 各プレイヤーの駒配置状態
  }

  // 配置フェーズかどうか
  isPlacementPhase() {
    return this.turnNumber <= 2;
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
    cloned.mode = this.mode;
    cloned.winner = this.winner;
    cloned.firstPlayer = this.firstPlayer;
    cloned.turnNumber = this.turnNumber;
    cloned.piecePlaced = [...this.piecePlaced];
    return cloned;
  }

  // 初期状態にリセット
  reset() {
    this.players = [
      { x: 4, y: 0, wallsLeft: 10 },
      { x: 4, y: 8, wallsLeft: 10 }
    ];
    this.walls = this.createEmptyWalls();
    this.currentPlayer = this.firstPlayer;  // 先手設定を反映
    this.mode = 'play';
    this.winner = null;
    this.turnNumber = 1;
    this.piecePlaced = [false, false];
  }

  // 手番を切り替え
  switchTurn() {
    this.currentPlayer = 1 - this.currentPlayer;
    this.turnNumber++;
  }

  // 現在のプレイヤーを取得
  getCurrentPlayer() {
    return this.players[this.currentPlayer];
  }

  // 相手プレイヤーを取得
  getOpponentPlayer() {
    return this.players[1 - this.currentPlayer];
  }

  // モード切り替え
  toggleMode() {
    if (this.mode === 'play') {
      this.mode = 'edit';
    } else {
      this.mode = 'play';
      this.winner = null;
      // 編集モードから戻る場合、駒は配置済みとみなす
      this.piecePlaced = [true, true];
      this.turnNumber = 3;  // 配置フェーズをスキップ
    }
  }
}

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
    const parts = str.trim().split(';');
    if (parts.length < 3) {
      throw new Error('パーツ数が不足');
    }

    // P1パース
    const p1Parts = parts[0].split(',').map(Number);
    if (p1Parts.length !== 3) throw new Error('P1形式エラー');
    if (!validatePlayerPos(p1Parts[0], p1Parts[1])) throw new Error('P1座標が範囲外');
    if (p1Parts[2] < 0 || p1Parts[2] > 10) throw new Error('P1壁数が不正');

    // P2パース
    const p2Parts = parts[1].split(',').map(Number);
    if (p2Parts.length !== 3) throw new Error('P2形式エラー');
    if (!validatePlayerPos(p2Parts[0], p2Parts[1])) throw new Error('P2座標が範囲外');
    if (p2Parts[2] < 0 || p2Parts[2] > 10) throw new Error('P2壁数が不正');

    // 同じ位置チェック
    if (p1Parts[0] === p2Parts[0] && p1Parts[1] === p2Parts[1]) {
      throw new Error('両プレイヤーが同じ位置');
    }

    // 手番パース
    const turn = parseInt(parts[2]);
    if (turn !== 0 && turn !== 1) throw new Error('手番が不正');

    // 状態を作成
    const state = new GameState();
    state.players[0] = { x: p1Parts[0], y: p1Parts[1], wallsLeft: p1Parts[2] };
    state.players[1] = { x: p2Parts[0], y: p2Parts[1], wallsLeft: p2Parts[2] };
    state.currentPlayer = turn;

    // 壁データをパース
    for (let i = 3; i < parts.length; i++) {
      if (parts[i] === '') continue;

      const wallParts = parts[i].split(',');
      if (wallParts.length !== 3) throw new Error(`壁${i-2}の形式エラー`);

      const wx = parseInt(wallParts[0]);
      const wy = parseInt(wallParts[1]);
      const dirStr = wallParts[2];

      if (!validateWallPos(wx, wy)) throw new Error(`壁${i-2}の座標が範囲外`);
      if (dirStr !== 'V' && dirStr !== 'H') throw new Error(`壁${i-2}の向きが不正`);

      const dir = dirStr === 'V' ? WALL_DIR.VERTICAL : WALL_DIR.HORIZONTAL;

      if (state.walls[wy][wx] !== WALL_DIR.NONE) {
        throw new Error(`壁${i-2}が重複`);
      }

      state.walls[wy][wx] = dir;
    }

    return { success: true, state: state };

  } catch (e) {
    return { success: false, error: e.message };
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

// 整形されたJSON形式で表示
function formatStateForDisplay(state) {
  const obj = {
    players: [
      {
        x: state.players[0].x,
        y: state.players[0].y,
        wallsLeft: state.players[0].wallsLeft
      },
      {
        x: state.players[1].x,
        y: state.players[1].y,
        wallsLeft: state.players[1].wallsLeft
      }
    ],
    currentPlayer: state.currentPlayer,
    walls: []
  };

  // 壁をリスト化
  for (let wy = 0; wy < WALL_GRID_SIZE; wy++) {
    for (let wx = 0; wx < WALL_GRID_SIZE; wx++) {
      const w = state.walls[wy][wx];
      if (w !== WALL_DIR.NONE) {
        obj.walls.push({
          x: wx,
          y: wy,
          dir: w === WALL_DIR.VERTICAL ? 'V' : 'H'
        });
      }
    }
  }

  return JSON.stringify(obj, null, 2);
}
