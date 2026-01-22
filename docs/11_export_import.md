# 11. エクスポート/インポート

## 目的

盤面状態の文字列によるエクスポート・インポート機能を実装する。

## 完了条件

- [x] エクスポート文字列が正しく生成される
- [x] 有効な文字列からインポートできる
- [x] 無効な文字列でアラートが表示され、元に戻る
- [x] コピーボタンでクリップボードにコピーされる
- [x] 整形表示が常時更新される
- [x] 状態が変わるたびに表示が更新される


## 詳細設計



### エクスポート形式

```
形式: "p1x,p1y,w1;p2x,p2y,w2;turn;壁1;壁2;..."
壁: "wx,wy,dir" (dir: V=縦, H=横)

例: "4,0,10;4,8,10;0;3,2,V;5,4,H"
- P1: (4,0)、残り壁10
- P2: (4,8)、残り壁10
- 手番: 0（P1）
- 壁: (3,2)に縦壁、(5,4)に横壁
```

### エクスポート関数

```javascript
// game.js

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
```

### インポート関数

```javascript
// game.js

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

      // 既に壁があるかチェック
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
```

### 整形表示関数

```javascript
// game.js

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
```

### UI連携

```javascript
// main.js

function setupStatePanel() {
  const stateInput = document.getElementById('state-input');
  const stateFormatted = document.getElementById('state-formatted');
  const btnCopy = document.getElementById('btn-copy');
  const btnApply = document.getElementById('btn-apply');

  // コピーボタン
  btnCopy.addEventListener('click', () => {
    const exportStr = exportState(gameState);
    navigator.clipboard.writeText(exportStr);
  });

  // 反映ボタン
  btnApply.addEventListener('click', () => {
    const inputStr = stateInput.value;
    const result = importState(inputStr);

    if (result.success) {
      // 成功: 状態を更新
      Object.assign(gameState, result.state);
      gameState.history = [];
      gameState.mode = 'edit';  // インポート後は編集モードに
      gameState.winner = null;
    } else {
      // 失敗: アラートを表示、元のデータに戻す
      alert(`インポートエラー: ${result.error}`);
      stateInput.value = exportState(gameState);
    }
  });
}

// 毎フレームの状態表示更新
function updateStateDisplay() {
  const stateInput = document.getElementById('state-input');
  const stateFormatted = document.getElementById('state-formatted');

  // 入力欄がフォーカスされていない場合のみ更新
  if (document.activeElement !== stateInput) {
    stateInput.value = exportState(gameState);
  }

  // 整形表示は常に更新
  stateFormatted.textContent = formatStateForDisplay(gameState);
}
```

### HTML構造

```html
<div id="state-panel">
  <div>
    <label>状態文字列:</label>
    <textarea id="state-input" rows="2"></textarea>
    <button id="btn-copy">コピー</button>
    <button id="btn-apply">反映</button>
  </div>
  <div>
    <label>整形表示:</label>
    <pre id="state-formatted"></pre>
  </div>
</div>
```

