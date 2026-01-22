// ========================================
// モバイル用メイン
// ========================================

// グローバル変数
let gameState;
let mobileState;
let renderer;
let canvasSize;
let moveHistory;

// モバイル状態
class MobileState {
  constructor() {
    this.gameMode = '1p';        // '1p' or '2p'
    this.playerFirst = true;    // プレイヤーが先手か
    this.cpuThinking = false;   // CPU思考中
    this.draggingPiece = null;  // ドラッグ中の駒 (0 or 1)
    this.dragPos = null;        // ドラッグ位置 {x, y}
    this.draggingWall = null;   // ドラッグ中の壁 {wallType, previewPos, isValid}
    this.canvasOffset = { x: 0, y: 0 };  // キャンバスのオフセット
  }

  reset() {
    this.cpuThinking = false;
    this.draggingPiece = null;
    this.dragPos = null;
    this.draggingWall = null;
  }
}

// 履歴管理（Undo用）
class MoveHistory {
  constructor() {
    this.states = [];
  }

  saveState(state) {
    this.states.push(state.clone());
  }

  undo(count) {
    for (let i = 0; i < count && this.states.length > 0; i++) {
      this.states.pop();
    }
    return this.states.length > 0
      ? this.states[this.states.length - 1].clone()
      : null;
  }

  canUndo(count) {
    return this.states.length >= count;
  }

  clear() {
    this.states = [];
  }
}

// ========================================
// p5.js セットアップ
// ========================================

function setup() {
  // キャンバスサイズを計算（画面幅に合わせる）
  const maxWidth = Math.min(window.innerWidth - 20, 400);
  canvasSize = maxWidth;

  const canvas = createCanvas(canvasSize, canvasSize);
  canvas.parent('canvas-wrapper');

  // タッチイベントのデフォルト動作を無効化
  canvas.elt.addEventListener('touchstart', e => e.preventDefault(), { passive: false });
  canvas.elt.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  canvas.elt.addEventListener('touchend', e => e.preventDefault(), { passive: false });

  gameState = new GameState();
  mobileState = new MobileState();
  moveHistory = new MoveHistory();
  renderer = new MobileRenderer(window);
  renderer.calculateSizes(canvasSize);

  setupPopup();
  setupButtons();
  showPopup();
}

function draw() {
  renderer.draw(gameState, mobileState);
  updateUI();
  handleCPU();
}

// ========================================
// ポップアップダイアログ
// ========================================

function setupPopup() {
  // モード選択ボタン
  document.getElementById('btn-mode-1p').addEventListener('click', () => {
    mobileState.gameMode = '1p';
    document.getElementById('btn-mode-1p').classList.add('selected');
    document.getElementById('btn-mode-2p').classList.remove('selected');
    document.getElementById('turn-selection').classList.remove('hidden');
  });

  document.getElementById('btn-mode-2p').addEventListener('click', () => {
    mobileState.gameMode = '2p';
    document.getElementById('btn-mode-2p').classList.add('selected');
    document.getElementById('btn-mode-1p').classList.remove('selected');
    document.getElementById('turn-selection').classList.add('hidden');
  });

  // 先手/後手選択
  document.getElementById('btn-first').addEventListener('click', () => {
    mobileState.playerFirst = true;
    document.getElementById('btn-first').classList.add('selected');
    document.getElementById('btn-second').classList.remove('selected');
  });

  document.getElementById('btn-second').addEventListener('click', () => {
    mobileState.playerFirst = false;
    document.getElementById('btn-second').classList.add('selected');
    document.getElementById('btn-first').classList.remove('selected');
  });

  // 開始ボタン
  document.getElementById('btn-start-game').addEventListener('click', startGame);
}

function showPopup() {
  document.getElementById('popup-overlay').classList.remove('hidden');
  document.getElementById('game-container').style.pointerEvents = 'none';
}

function hidePopup() {
  document.getElementById('popup-overlay').classList.add('hidden');
  document.getElementById('game-container').style.pointerEvents = 'auto';
}

function startGame() {
  hidePopup();

  // ゲーム状態をリセット
  gameState.reset();
  mobileState.reset();
  moveHistory.clear();

  // 配置フェーズをスキップ（固定位置で開始）
  gameState.players[0] = { x: 4, y: 0, wallsLeft: 10 };
  gameState.players[1] = { x: 4, y: 8, wallsLeft: 10 };
  gameState.piecePlaced = [true, true];
  gameState.turnNumber = 3;

  // 先手設定
  if (mobileState.gameMode === '1p') {
    if (mobileState.playerFirst) {
      // プレイヤー先手 = P1（青）が人間
      gameState.currentPlayer = 0;
    } else {
      // プレイヤー後手 = P2（赤）が人間、CPUが先手
      gameState.currentPlayer = 0;
    }
  } else {
    // 2人用は常にP1先手
    gameState.currentPlayer = 0;
  }

  // 初期状態を保存
  moveHistory.saveState(gameState);

  // UI更新
  updateWallAreas();
  updateUI();
}

// ========================================
// ボタン
// ========================================

function setupButtons() {
  document.getElementById('btn-restart').addEventListener('click', () => {
    showPopup();
  });

  document.getElementById('btn-undo').addEventListener('click', handleUndo);

  // 壁ドラッグ領域のタッチイベント
  setupWallDragAreas();
}

function handleUndo() {
  const undoCount = mobileState.gameMode === '1p' ? 2 : 1;

  if (moveHistory.canUndo(undoCount)) {
    const prevState = moveHistory.undo(undoCount);
    if (prevState) {
      gameState.players = prevState.players.map(p => ({ ...p }));
      gameState.walls = prevState.walls.map(row => [...row]);
      gameState.currentPlayer = prevState.currentPlayer;
      gameState.winner = prevState.winner;
      mobileState.reset();
    }
  }
}

// ========================================
// 壁ドラッグ領域
// ========================================

function setupWallDragAreas() {
  const verticalZone = document.getElementById('drag-vertical');
  const horizontalZone = document.getElementById('drag-horizontal');

  // 縦壁ドラッグ開始
  verticalZone.addEventListener('touchstart', (e) => {
    startWallDrag(WALL_DIR.VERTICAL, e);
  });

  // 横壁ドラッグ開始
  horizontalZone.addEventListener('touchstart', (e) => {
    startWallDrag(WALL_DIR.HORIZONTAL, e);
  });

  // 上部の壁領域（2人用）
  const topWallArea = document.getElementById('top-wall-area');
  if (topWallArea) {
    const topVertical = topWallArea.querySelector('.vertical-zone');
    const topHorizontal = topWallArea.querySelector('.horizontal-zone');
    if (topVertical) {
      topVertical.addEventListener('touchstart', (e) => {
        startWallDrag(WALL_DIR.VERTICAL, e);
      });
    }
    if (topHorizontal) {
      topHorizontal.addEventListener('touchstart', (e) => {
        startWallDrag(WALL_DIR.HORIZONTAL, e);
      });
    }
  }
}

function startWallDrag(wallType, e) {
  e.preventDefault();

  // 壁が残っているかチェック
  const player = gameState.players[gameState.currentPlayer];
  if (player.wallsLeft <= 0) return;

  // CPU思考中は操作不可
  if (mobileState.cpuThinking) return;

  // 勝者決定後は操作不可
  if (gameState.winner !== null) return;

  mobileState.draggingWall = {
    wallType: wallType,
    previewPos: null,
    isValid: false
  };
}

// ========================================
// タッチイベント
// ========================================

function touchStarted() {
  if (mobileState.cpuThinking) return false;
  if (gameState.winner !== null) return false;
  if (gameState.mode !== 'play') return false;

  const canvasWrapper = document.getElementById('canvas-wrapper');
  const rect = canvasWrapper.getBoundingClientRect();
  mobileState.canvasOffset = { x: rect.left, y: rect.top };

  const tx = touches[0]?.x ?? mouseX;
  const ty = touches[0]?.y ?? mouseY;

  // 1人用で自分のターンじゃない場合は操作不可
  if (mobileState.gameMode === '1p') {
    const isPlayerTurn = mobileState.playerFirst
      ? gameState.currentPlayer === 0
      : gameState.currentPlayer === 1;
    if (!isPlayerTurn) return false;
  }

  // 駒のタップチェック
  const player = gameState.players[gameState.currentPlayer];
  if (renderer.isPieceTapped(tx, ty, player.x, player.y)) {
    mobileState.draggingPiece = gameState.currentPlayer;
    mobileState.dragPos = { x: tx, y: ty };
    return false;
  }

  // 移動可能マスのタップチェック
  const validMoves = getValidMoves(gameState);
  const tappedMove = renderer.getValidMoveTapped(tx, ty, validMoves);
  if (tappedMove) {
    moveHistory.saveState(gameState);
    executeMove(gameState, tappedMove.x, tappedMove.y);
    return false;
  }

  return false;
}

function touchMoved() {
  if (mobileState.cpuThinking) return false;

  const tx = touches[0]?.x ?? mouseX;
  const ty = touches[0]?.y ?? mouseY;

  // 駒のドラッグ
  if (mobileState.draggingPiece !== null) {
    mobileState.dragPos = { x: tx, y: ty };
    return false;
  }

  // 壁のドラッグ
  if (mobileState.draggingWall) {
    // キャンバス上の座標を計算（指より上にオフセット）
    const canvasRect = document.getElementById('canvas-wrapper').getBoundingClientRect();
    const canvasX = tx;
    const canvasY = ty - 50;  // 50px上にオフセット

    if (canvasY >= 0 && canvasY < canvasSize && canvasX >= 0 && canvasX < canvasSize) {
      const wallPos = renderer.pixelToWallPos(canvasX, canvasY);

      if (wallPos.wx >= 0 && wallPos.wx < WALL_GRID_SIZE &&
          wallPos.wy >= 0 && wallPos.wy < WALL_GRID_SIZE) {
        const isValid = canPlaceWall(gameState, wallPos.wx, wallPos.wy, mobileState.draggingWall.wallType);
        mobileState.draggingWall.previewPos = wallPos;
        mobileState.draggingWall.isValid = isValid;
      } else {
        mobileState.draggingWall.previewPos = null;
        mobileState.draggingWall.isValid = false;
      }
    } else {
      mobileState.draggingWall.previewPos = null;
      mobileState.draggingWall.isValid = false;
    }

    return false;
  }

  return false;
}

function touchEnded() {
  const tx = touches[0]?.x ?? mouseX;
  const ty = touches[0]?.y ?? mouseY;

  // 駒のドロップ
  if (mobileState.draggingPiece !== null) {
    const cell = renderer.pixelToCell(tx, ty);

    // 移動可能かチェック
    const validMoves = getValidMoves(gameState);
    const isValid = validMoves.some(m => m.x === cell.x && m.y === cell.y);

    if (isValid) {
      moveHistory.saveState(gameState);
      executeMove(gameState, cell.x, cell.y);
    }

    mobileState.draggingPiece = null;
    mobileState.dragPos = null;
    return false;
  }

  // 壁のドロップ
  if (mobileState.draggingWall) {
    const { previewPos, isValid, wallType } = mobileState.draggingWall;

    if (previewPos && isValid) {
      moveHistory.saveState(gameState);
      executeWallPlacement(gameState, previewPos.wx, previewPos.wy, wallType);
    }

    mobileState.draggingWall = null;
    return false;
  }

  return false;
}

// マウスイベントもサポート（デバッグ用）
function mousePressed() {
  if (touches.length === 0) {
    touchStarted();
  }
  return false;
}

function mouseDragged() {
  if (touches.length === 0) {
    touchMoved();
  }
  return false;
}

function mouseReleased() {
  if (touches.length === 0) {
    touchEnded();
  }
  return false;
}

// ========================================
// CPU処理
// ========================================

let cpuMoveTimeout = null;

function handleCPU() {
  if (mobileState.gameMode !== '1p') return;
  if (gameState.winner !== null) return;
  if (mobileState.cpuThinking) return;

  // CPUのターンかチェック
  const isCpuTurn = mobileState.playerFirst
    ? gameState.currentPlayer === 1
    : gameState.currentPlayer === 0;

  if (!isCpuTurn) return;

  // CPU思考開始
  mobileState.cpuThinking = true;
  showThinking(true);

  // CPUの設定を取得
  const cpuPlayerIndex = mobileState.playerFirst ? 1 : 0;
  const config = cpuConfig[cpuPlayerIndex];

  cpuMoveTimeout = setTimeout(() => {
    if (gameState.winner !== null) {
      mobileState.cpuThinking = false;
      showThinking(false);
      return;
    }

    const result = getBestMoveMinMax(gameState, config.depth, config.pruneThreshold, config.useLockedDistance, config.eval);

    if (result.move) {
      moveHistory.saveState(gameState);
      if (result.move.type === 'move') {
        executeMove(gameState, result.move.x, result.move.y);
      } else if (result.move.type === 'wall') {
        executeWallPlacement(gameState, result.move.wx, result.move.wy, result.move.dir);
      }
    }

    mobileState.cpuThinking = false;
    showThinking(false);
  }, config.delay);
}

function showThinking(show) {
  const overlay = document.getElementById('thinking-overlay');
  if (show) {
    overlay.classList.remove('hidden');
  } else {
    overlay.classList.add('hidden');
  }
}

// ========================================
// UI更新
// ========================================

function updateUI() {
  updateWallsDisplay();
  updateUndoButton();
  updatePlayerIcons();
}

function updateWallsDisplay() {
  const topWalls = document.getElementById('top-walls');
  const bottomWalls = document.getElementById('bottom-walls');

  // P2（上）の壁
  topWalls.innerHTML = '';
  for (let i = 0; i < 10; i++) {
    const dot = document.createElement('span');
    dot.className = 'wall-dot' + (i >= gameState.players[1].wallsLeft ? ' used' : '');
    topWalls.appendChild(dot);
  }

  // P1（下）の壁
  bottomWalls.innerHTML = '';
  for (let i = 0; i < 10; i++) {
    const dot = document.createElement('span');
    dot.className = 'wall-dot' + (i >= gameState.players[0].wallsLeft ? ' used' : '');
    bottomWalls.appendChild(dot);
  }
}

function updateUndoButton() {
  const undoBtn = document.getElementById('btn-undo');
  const undoCount = mobileState.gameMode === '1p' ? 2 : 1;
  undoBtn.disabled = !moveHistory.canUndo(undoCount);
}

function updatePlayerIcons() {
  const topIcon = document.getElementById('top-player-icon');
  const bottomIcon = document.getElementById('bottom-player-icon');

  if (mobileState.gameMode === '1p') {
    if (mobileState.playerFirst) {
      // プレイヤー先手: P1=人間(下), P2=CPU(上)
      bottomIcon.textContent = '👤';
      topIcon.textContent = '🤖';
    } else {
      // プレイヤー後手: P1=CPU(下)→上になる?, P2=人間
      // 実際は表示位置は固定で、P2が上、P1が下
      topIcon.textContent = '🤖';
      bottomIcon.textContent = '👤';
    }
  } else {
    // 2人用
    topIcon.textContent = '👤';
    bottomIcon.textContent = '👤';
  }
}

function updateWallAreas() {
  const topWallArea = document.getElementById('top-wall-area');

  if (mobileState.gameMode === '2p') {
    topWallArea.classList.remove('hidden');
  } else {
    topWallArea.classList.add('hidden');
  }
}

// ウィンドウリサイズ対応
function windowResized() {
  const maxWidth = Math.min(windowWidth - 20, 400);
  canvasSize = maxWidth;
  resizeCanvas(canvasSize, canvasSize);
  renderer.calculateSizes(canvasSize);
}
