# 09. 手番管理・勝利判定

## 目的

手番の表示、管理、勝利判定と勝利時の挙動を実装する。

## 完了条件

- [x] 現在の手番が画面に表示される
- [x] 手番プレイヤーの色でハイライトされる
- [x] P1がy=8に到達したらP1の勝利
- [x] P2がy=0に到達したらP2の勝利
- [x] 勝利時にメッセージが表示される
- [x] 勝利後に自動的に編集モードへ移行する

## 詳細設計

### 手番管理

```javascript
// game.js - GameStateクラス内

// 手番を切り替え
switchTurn() {
  this.currentPlayer = 1 - this.currentPlayer;
}

// 現在の手番プレイヤーを取得
getCurrentPlayer() {
  return this.players[this.currentPlayer];
}

// 現在の手番プレイヤーのインデックスを取得
getCurrentPlayerIndex() {
  return this.currentPlayer;
}
```

### 勝利判定

```javascript
// board.js

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

  return null; // まだ勝者なし
}

// 移動実行時に勝利判定を行う
function executeMove(state, x, y) {
  // 履歴に保存
  state.saveToHistory();

  // 移動
  const player = state.getCurrentPlayer();
  player.x = x;
  player.y = y;

  // 勝利判定
  const winner = checkVictory(state);
  if (winner !== null) {
    state.winner = winner;
    state.mode = 'edit';  // 勝利後は編集モードへ
    return;
  }

  // 手番交代
  state.switchTurn();
}
```

### 勝利時の表示

```javascript
// renderer.js

drawWinnerMessage(winner) {
  const p = this.p;

  // 半透明オーバーレイ
  p.fill(0, 0, 0, 150);
  p.noStroke();
  p.rect(0, 0, p.width, p.height);

  // 勝者メッセージ
  const color = winner === 0 ? COLORS.PLAYER1 : COLORS.PLAYER2;
  const text = `プレイヤー${winner + 1}の勝利！`;

  // 背景付きテキスト
  p.fill(255);
  p.stroke(color);
  p.strokeWeight(3);
  p.textSize(32);
  p.textAlign(p.CENTER, p.CENTER);
  p.text(text, p.width / 2, p.height / 2 - 20);

  // 編集モード移行の案内
  p.noStroke();
  p.fill(200);
  p.textSize(16);
  p.text('編集モードに移行しました', p.width / 2, p.height / 2 + 30);
}
```

### 手番情報の表示

```javascript
// renderer.js

drawInfo(state) {
  const p = this.p;

  p.fill(0);
  p.noStroke();
  p.textSize(16);
  p.textAlign(p.LEFT, p.TOP);

  // 手番またはモード表示
  let turnText;
  if (state.winner !== null) {
    turnText = `勝者: プレイヤー${state.winner + 1}（編集モード）`;
  } else if (state.mode === 'edit') {
    turnText = '編集モード';
  } else {
    turnText = `手番: プレイヤー${state.currentPlayer + 1}`;

    // 現在の手番プレイヤーの色でハイライト
    const color = state.currentPlayer === 0 ? COLORS.PLAYER1 : COLORS.PLAYER2;
    p.fill(color);
  }
  p.text(turnText, 10, 10);

  // 残り壁
  p.fill(0);
  const p1 = state.players[0];
  const p2 = state.players[1];
  p.text(`残り壁: P1=${p1.wallsLeft}  P2=${p2.wallsLeft}`, 10, 35);
}
```

## 勝利フロー図

```
┌─────────────────┐
│ 駒を移動        │
└────────┬────────┘
         ↓
┌─────────────────┐
│ 勝利判定        │
│ P1が y=8 ?      │
│ P2が y=0 ?      │
└────────┬────────┘
    YES  │  NO
    ↓    ↓
┌─────────────────┐  ┌─────────────────┐
│ winner = index  │  │ 手番交代        │
│ mode = 'edit'   │  │ switchTurn()    │
└────────┬────────┘  └─────────────────┘
         ↓
┌─────────────────┐
│ 勝利メッセージ  │
│ 編集モード案内  │
└─────────────────┘
```


