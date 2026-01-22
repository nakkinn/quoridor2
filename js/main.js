// グローバル変数
let gameState;
let uiState;
let renderer;
let inputHandler;

// p5.js setup
function setup() {
  const canvas = createCanvas(550, 600);
  canvas.parent('canvas-wrapper');

  // 右クリックメニューを無効化
  canvas.elt.addEventListener('contextmenu', (e) => e.preventDefault());

  gameState = new GameState();
  uiState = new UIState();
  renderer = new Renderer(window);
  inputHandler = new InputHandler(renderer, gameState, uiState);

  setupButtons();
  setupStatePanel();
  updateButtonLabel();
}

// p5.js draw loop
function draw() {
  inputHandler.update(mouseX, mouseY);
  renderer.draw(gameState, uiState, inputHandler);
  updateStateDisplay();

  // CPUモード: 各プレイヤーの自動操作（配置フェーズ以外）
  if (gameState.mode === 'play' && gameState.winner === null && !gameState.isPlacementPhase()) {
    const playerIndex = gameState.currentPlayer;
    const config = cpuConfig[playerIndex];

    if (config.enabled && !uiState.cpuMoveScheduled[playerIndex]) {
      uiState.cpuMoveScheduled[playerIndex] = true;

      setTimeout(() => {
        // まだ同じプレイヤーのターンでCPUが有効かチェック
        if (cpuConfig[playerIndex].enabled && gameState.mode === 'play' &&
            gameState.winner === null && gameState.currentPlayer === playerIndex &&
            !gameState.isPlacementPhase()) {
          // Min-Max探索で最適手を取得
          const result = getBestMoveMinMax(gameState);
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
}

// マウスクリック（左クリック）
function mousePressed() {
  // キャンバス外のクリックは無視
  if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) {
    return;
  }

  // 右クリック: モード切り替え
  if (mouseButton === RIGHT) {
    inputHandler.handleRightClick();
    return;
  }

  // 左クリック
  if (mouseButton === LEFT) {
    if (gameState.mode === 'play') {
      inputHandler.handlePlayClick(mouseX, mouseY);
    } else if (gameState.mode === 'edit') {
      inputHandler.handleEditMouseDown(mouseX, mouseY);
    }
  }
}

// マウスリリース
function mouseReleased() {
  // 編集モードでドラッグ終了
  if (gameState.mode === 'edit' && mouseButton === LEFT) {
    inputHandler.handleEditMouseUp(mouseX, mouseY);
  }
}

// マウスホイール
function mouseWheel(event) {
  inputHandler.handleWheel(event.delta);
  return false; // ページスクロール防止
}

// キー入力
function keyPressed() {
  // Aキー: 最短経路表示のトグル
  if (key === 'a' || key === 'A') {
    uiState.toggleShowPaths();
  }
  // Sキー: 距離マップ表示のサイクル（非表示→P1→P2→非表示）
  if (key === 's' || key === 'S') {
    uiState.cycleDistanceMapMode();
  }
  // Dキー: 壁評価表示のトグル
  if (key === 'd' || key === 'D') {
    uiState.toggleWallEvaluations();
  }
  // Fキー: 確定距離表示のサイクル（非表示→P1→P2→非表示）
  if (key === 'f' || key === 'F') {
    uiState.cycleLockedDistanceMode();
  }
  // Gキー: 最適手表示のトグル
  if (key === 'g' || key === 'G') {
    uiState.toggleBestMove();
  }
  // Hキー: P2 CPUのトグル
  if (key === 'h' || key === 'H') {
    uiState.toggleP2Cpu();
  }
  // Jキー: CPU vs CPUモードのトグル
  if (key === 'j' || key === 'J') {
    uiState.toggleCpuVsCpu();
  }
}

// ボタンのセットアップ
function setupButtons() {
  // スタートボタン
  const startBtn = document.getElementById('btn-start');
  startBtn.addEventListener('click', () => {
    // 先手設定を反映してゲーム開始
    const chkFirstPlayer = document.getElementById('chk-first-player');
    gameState.firstPlayer = chkFirstPlayer.checked ? 1 : 0;
    gameState.reset();
    uiState.reset();
    updateButtonLabel();
  });

  const editBtn = document.getElementById('btn-edit');
  editBtn.addEventListener('click', () => {
    gameState.toggleMode();
    uiState.reset();
    updateButtonLabel();
  });

  // 先手選択チェックボックス
  const chkFirstPlayer = document.getElementById('chk-first-player');
  chkFirstPlayer.addEventListener('change', () => {
    gameState.firstPlayer = chkFirstPlayer.checked ? 1 : 0;
  });
}

// ボタンラベルの更新
function updateButtonLabel() {
  const editBtn = document.getElementById('btn-edit');
  editBtn.textContent = gameState.mode === 'play' ? '編集モード' : '対戦モード';
}

// 状態パネルのセットアップ
function setupStatePanel() {
  const stateInput = document.getElementById('state-input');
  const btnCopy = document.getElementById('btn-copy');
  const btnApply = document.getElementById('btn-apply');

  // コピーボタン
  btnCopy.addEventListener('click', () => {
    const exportStr = exportState(gameState);
    navigator.clipboard.writeText(exportStr).then(() => {
      // コピー成功
    }).catch(err => {
      alert('コピーに失敗しました');
    });
  });

  // 反映ボタン
  btnApply.addEventListener('click', () => {
    const inputStr = stateInput.value;
    const result = importState(inputStr);

    if (result.success) {
      // 成功: 状態を更新
      gameState.players = result.state.players;
      gameState.walls = result.state.walls;
      gameState.currentPlayer = result.state.currentPlayer;
      gameState.mode = 'edit';
      gameState.winner = null;
      uiState.reset();
      updateButtonLabel();
    } else {
      // 失敗: アラートを表示、元のデータに戻す
      alert(`インポートエラー: ${result.error}`);
      stateInput.value = exportState(gameState);
    }
  });
}

// 状態表示の更新
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
