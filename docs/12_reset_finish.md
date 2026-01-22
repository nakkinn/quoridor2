# 12. リセット・仕上げ

## 目的

リセット機能の実装と全体の仕上げを行う。

## 完了条件

- [x] リセットボタンで初期状態に戻る
- [x] 全機能が正常に動作する
- [x] UIが見やすく整っている
- [x] エラーなく動作する

## 詳細設計

### リセット機能

```javascript
// game.js - GameStateクラス内

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
```

### リセットボタンのUI

```javascript
// main.js

function setupButtons() {
  // リセットボタン
  const resetBtn = document.getElementById('btn-reset');
  resetBtn.addEventListener('click', () => {
    if (confirm('ゲームをリセットしますか？')) {
      gameState.reset();
      uiState.reset();
      updateButtonLabel();
    }
  });

  // 編集モードボタン
  const editBtn = document.getElementById('btn-edit');
  editBtn.addEventListener('click', () => {
    gameState.toggleMode();
    updateButtonLabel();
  });
}

function updateButtonLabel() {
  const editBtn = document.getElementById('btn-edit');
  editBtn.textContent = gameState.mode === 'play' ? '編集モード' : '対戦モード';
}
```

### 全体の初期化フロー

```javascript
// main.js

let gameState;
let uiState;
let renderer;
let inputHandler;

function setup() {
  // p5.jsキャンバス作成
  const canvas = createCanvas(600, 600);
  canvas.parent('canvas-wrapper');

  // 各コンポーネントの初期化
  gameState = new GameState();
  uiState = new UIState();
  renderer = new Renderer(window);
  inputHandler = new InputHandler(renderer, gameState, uiState);

  // ボタンのセットアップ
  setupButtons();
  setupStatePanel();

  // 初期表示の更新
  updateButtonLabel();
  updateStateDisplay();
}

function draw() {
  // 入力状態の更新
  inputHandler.update(mouseX, mouseY);

  // 描画
  renderer.draw(gameState, uiState);

  // 状態パネルの更新
  updateStateDisplay();
}

function mouseClicked() {
  if (gameState.mode === 'play') {
    inputHandler.handleClick(mouseX, mouseY);
  } else {
    inputHandler.handleEditClick(mouseX, mouseY);
  }
}

function mouseWheel(event) {
  inputHandler.handleWheel(event.delta);
  return false;
}
```

### スタイル調整

```css
/* style.css */

* {
  box-sizing: border-box;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  margin: 0;
  padding: 20px;
  background-color: #f0f0f0;
}

#game-container {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

#canvas-wrapper {
  flex-shrink: 0;
}

#state-panel {
  background: white;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  min-width: 300px;
}

#state-panel label {
  display: block;
  font-weight: bold;
  margin-bottom: 5px;
}

#state-input {
  width: 100%;
  font-family: monospace;
  font-size: 12px;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  resize: vertical;
}

#state-formatted {
  background: #f8f8f8;
  padding: 10px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 11px;
  white-space: pre-wrap;
  max-height: 300px;
  overflow-y: auto;
}

#controls {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}

#controls button {
  padding: 10px 20px;
  font-size: 14px;
  cursor: pointer;
  border: none;
  border-radius: 4px;
  background-color: #3498db;
  color: white;
  transition: background-color 0.2s;
}

#controls button:hover {
  background-color: #2980b9;
}

#btn-reset {
  background-color: #e74c3c;
}

#btn-reset:hover {
  background-color: #c0392b;
}

#state-panel button {
  padding: 5px 10px;
  margin-right: 5px;
  margin-top: 10px;
  cursor: pointer;
  border: 1px solid #ccc;
  border-radius: 4px;
  background: white;
}

#state-panel button:hover {
  background: #f0f0f0;
}
```

### 最終チェックリスト

```
■ 基本動作
- [ ] ゲームが起動する
- [ ] 盤面が正しく表示される
- [ ] 駒が正しい初期位置にある

■ 対戦モード
- [ ] 移動マーカーが表示される
- [ ] マーカーホバーで拡大する
- [ ] クリックで駒が移動する
- [ ] 壁プレビューが表示される
- [ ] マウスホイールで壁の向きが変わる
- [ ] クリックで壁が配置される
- [ ] 手番が正しく切り替わる
- [ ] 勝利判定が正しく動作する

■ 編集モード
- [ ] モード切り替えができる
- [ ] 駒を自由に移動できる
- [ ] 壁を自由に配置/削除できる

■ エクスポート/インポート
- [ ] 状態が常時表示される
- [ ] コピーボタンが動作する
- [ ] 有効なデータがインポートできる
- [ ] 無効なデータでエラーが出る

■ その他
- [ ] リセットボタンが動作する
- [ ] UIが見やすい
```


