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
    this.gameStarted = false;   // ゲームが開始されたか
    this.gameMode = '1p';        // '1p' or '2p'
    this.playerFirst = true;    // プレイヤーが先手か
    this.cpuThinking = false;   // CPU思考中

    // 配置フェーズ
    this.placementPhase = false;  // 配置フェーズか
    this.placingPlayer = 0;       // 配置中のプレイヤー (0 or 1)

    // ドラッグ状態
    this.draggingPiece = null;  // ドラッグ中の駒 (0 or 1)
    this.dragStartPos = null;   // ドラッグ開始位置 {x, y}
    this.dragCurrentPos = null; // 現在のドラッグ位置 {x, y}
    this.selectedMove = null;   // 選択中の移動先
    this.draggingWall = null;   // ドラッグ中の壁 {wallType, previewPos, isValid}
    this.globalTouchPos = null; // グローバルタッチ位置（壁ドラッグ用）
  }

  reset() {
    this.cpuThinking = false;
    this.placementPhase = false;
    this.placingPlayer = 0;
    this.draggingPiece = null;
    this.dragStartPos = null;
    this.dragCurrentPos = null;
    this.selectedMove = null;
    this.draggingWall = null;
    this.globalTouchPos = null;
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

  // グローバルタッチイベント（壁ドラッグ用）
  setupGlobalTouchEvents();

  setupPopup();
  setupButtons();
  showPopup();
}

function draw() {
  renderer.draw(gameState, mobileState);

  // ゲーム開始前は処理しない
  if (!mobileState.gameStarted) return;

  updateUI();

  // 配置フェーズでのCPU処理
  if (mobileState.placementPhase) {
    handleCPUPlacement();
  } else {
    handleCPU();
  }
}

// ========================================
// グローバルタッチイベント（壁ドラッグ用）
// ========================================

function setupGlobalTouchEvents() {
  document.addEventListener('touchmove', (e) => {
    if (mobileState.draggingWall) {
      e.preventDefault();
      const touch = e.touches[0];
      mobileState.globalTouchPos = { x: touch.clientX, y: touch.clientY };
      updateWallDragPreview();
    }
  }, { passive: false });

  document.addEventListener('touchend', (e) => {
    if (mobileState.draggingWall) {
      e.preventDefault();
      handleWallDrop();
    }
  }, { passive: false });

  // マウスイベント（デバッグ用）
  document.addEventListener('mousemove', (e) => {
    if (mobileState.draggingWall) {
      mobileState.globalTouchPos = { x: e.clientX, y: e.clientY };
      updateWallDragPreview();
    }
  });

  document.addEventListener('mouseup', (e) => {
    if (mobileState.draggingWall) {
      handleWallDrop();
    }
  });
}

function updateWallDragPreview() {
  if (!mobileState.draggingWall || !mobileState.globalTouchPos) return;

  const canvasWrapper = document.getElementById('canvas-wrapper');
  const rect = canvasWrapper.getBoundingClientRect();

  // キャンバス上の座標を計算
  // 1人用: 上方向にオフセット（人間は下側）
  // 2人用: 上側プレイヤー(player 0)は下方向、下側プレイヤー(player 1)は上方向
  let yOffset;
  if (mobileState.gameMode === '2p') {
    yOffset = gameState.currentPlayer === 0 ? 50 : -50;
  } else {
    yOffset = -50;  // 1人用は常に上方向
  }
  const canvasX = mobileState.globalTouchPos.x - rect.left;
  const canvasY = mobileState.globalTouchPos.y - rect.top + yOffset;

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
}

function handleWallDrop() {
  if (!mobileState.draggingWall) return;

  const { previewPos, isValid, wallType } = mobileState.draggingWall;

  if (previewPos && isValid) {
    moveHistory.saveState(gameState);
    executeWallPlacement(gameState, previewPos.wx, previewPos.wy, wallType);
  }

  mobileState.draggingWall = null;
  mobileState.globalTouchPos = null;
}

// ========================================
// ポップアップダイアログ
// ========================================

function setupPopup() {
  // モバイル用にタッチイベントも追加
  function addTapListener(element, callback) {
    // タッチ開始時刻を記録（長押しとタップを区別）
    let touchStartTime = 0;
    let touchStartX = 0;
    let touchStartY = 0;

    element.addEventListener('touchstart', (e) => {
      touchStartTime = Date.now();
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    element.addEventListener('touchend', (e) => {
      e.preventDefault();
      const touchDuration = Date.now() - touchStartTime;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // 短いタップ（500ms以下）で移動が少ない場合のみ実行
      if (touchDuration < 500 && distance < 20) {
        callback();
      }
    }, { passive: false });

    // PCでのクリックもサポート
    element.addEventListener('click', (e) => {
      // タッチイベントが発火した場合はclickを無視（二重実行防止）
      if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) {
        return;
      }
      callback();
    });
  }

  // モード選択ボタン
  addTapListener(document.getElementById('btn-mode-1p'), () => {
    mobileState.gameMode = '1p';
    document.getElementById('btn-mode-1p').classList.add('selected');
    document.getElementById('btn-mode-2p').classList.remove('selected');
    document.getElementById('turn-selection').classList.remove('hidden');
  });

  addTapListener(document.getElementById('btn-mode-2p'), () => {
    mobileState.gameMode = '2p';
    document.getElementById('btn-mode-2p').classList.add('selected');
    document.getElementById('btn-mode-1p').classList.remove('selected');
    document.getElementById('turn-selection').classList.add('hidden');
  });

  // 先手/後手選択
  addTapListener(document.getElementById('btn-first'), () => {
    mobileState.playerFirst = true;
    document.getElementById('btn-first').classList.add('selected');
    document.getElementById('btn-second').classList.remove('selected');
  });

  addTapListener(document.getElementById('btn-second'), () => {
    mobileState.playerFirst = false;
    document.getElementById('btn-second').classList.add('selected');
    document.getElementById('btn-first').classList.remove('selected');
  });

  // 開始ボタン
  addTapListener(document.getElementById('btn-start-game'), startGame);
}

function showPopup() {
  document.getElementById('popup-overlay').classList.remove('hidden');
  document.getElementById('game-container').style.pointerEvents = 'none';
  mobileState.gameStarted = false;
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

  // 配置フェーズを開始
  // Player 0 (青): y=0 (画面上側)
  // Player 1 (赤): y=8 (画面下側)
  // 初期位置は盤面外（x=4, y=-1 または y=9）
  gameState.players[0] = { x: 4, y: -1, wallsLeft: 10 };  // 盤面外（上）
  gameState.players[1] = { x: 4, y: 9, wallsLeft: 10 };   // 盤面外（下）
  gameState.piecePlaced = [false, false];
  gameState.turnNumber = 1;

  // 配置フェーズ設定
  mobileState.placementPhase = true;

  // 先手設定と配置順
  if (mobileState.gameMode === '1p') {
    if (mobileState.playerFirst) {
      // 人間先手: 人間(player 1)が先に配置
      mobileState.placingPlayer = 1;
      gameState.currentPlayer = 1;
    } else {
      // 人間後手: CPU(player 0)が先に配置
      mobileState.placingPlayer = 0;
      gameState.currentPlayer = 0;
    }
  } else {
    // 2人用: player 0 (青/上側) が先に配置
    mobileState.placingPlayer = 0;
    gameState.currentPlayer = 0;
  }

  // ゲーム開始フラグ
  mobileState.gameStarted = true;

  // UI更新
  updateWallAreas();
  updateUI();
}

// 配置を確定
function confirmPlacement(playerIndex, x) {
  const y = playerIndex === 0 ? 0 : 8;
  gameState.players[playerIndex].x = x;
  gameState.players[playerIndex].y = y;
  gameState.piecePlaced[playerIndex] = true;

  // 次のプレイヤーへ
  if (!gameState.piecePlaced[0] || !gameState.piecePlaced[1]) {
    // まだ配置が終わっていない
    const nextPlayer = playerIndex === 0 ? 1 : 0;
    mobileState.placingPlayer = nextPlayer;
    gameState.currentPlayer = nextPlayer;
  } else {
    // 両方配置完了 → ゲーム開始
    mobileState.placementPhase = false;
    gameState.turnNumber = 3;

    // 先手設定
    if (mobileState.gameMode === '1p') {
      gameState.currentPlayer = mobileState.playerFirst ? 1 : 0;
    } else {
      gameState.currentPlayer = 0;
    }

    // 初期状態を保存
    moveHistory.saveState(gameState);
  }

  mobileState.selectedMove = null;
  mobileState.draggingPiece = null;
  mobileState.dragStartPos = null;
  mobileState.dragCurrentPos = null;
}

// ========================================
// ボタン
// ========================================

function setupButtons() {
  // addTapListenerはsetupPopupで定義済みなので同じパターンで実装
  function addButtonTapListener(element, callback) {
    let touchStartTime = 0;
    let touchStartX = 0;
    let touchStartY = 0;

    element.addEventListener('touchstart', (e) => {
      touchStartTime = Date.now();
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    element.addEventListener('touchend', (e) => {
      e.preventDefault();
      const touchDuration = Date.now() - touchStartTime;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (touchDuration < 500 && distance < 20) {
        callback();
      }
    }, { passive: false });

    element.addEventListener('click', (e) => {
      if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) {
        return;
      }
      callback();
    });
  }

  addButtonTapListener(document.getElementById('btn-restart'), () => {
    showPopup();
  });

  addButtonTapListener(document.getElementById('btn-undo'), handleUndo);

  // 壁ドラッグ領域のタッチイベント
  setupWallDragAreas();
}

function handleUndo() {
  if (!mobileState.gameStarted) return;
  if (mobileState.placementPhase) return;  // 配置フェーズ中はUndo不可

  const undoCount = mobileState.gameMode === '1p' ? 2 : 1;

  if (moveHistory.canUndo(undoCount)) {
    const prevState = moveHistory.undo(undoCount);
    if (prevState) {
      gameState.players = prevState.players.map(p => ({ ...p }));
      gameState.walls = prevState.walls.map(row => [...row]);
      gameState.currentPlayer = prevState.currentPlayer;
      gameState.winner = prevState.winner;
      mobileState.reset();
      mobileState.gameStarted = true;
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
  verticalZone.addEventListener('mousedown', (e) => {
    startWallDrag(WALL_DIR.VERTICAL, e);
  });

  // 横壁ドラッグ開始
  horizontalZone.addEventListener('touchstart', (e) => {
    startWallDrag(WALL_DIR.HORIZONTAL, e);
  });
  horizontalZone.addEventListener('mousedown', (e) => {
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
      topVertical.addEventListener('mousedown', (e) => {
        startWallDrag(WALL_DIR.VERTICAL, e);
      });
    }
    if (topHorizontal) {
      topHorizontal.addEventListener('touchstart', (e) => {
        startWallDrag(WALL_DIR.HORIZONTAL, e);
      });
      topHorizontal.addEventListener('mousedown', (e) => {
        startWallDrag(WALL_DIR.HORIZONTAL, e);
      });
    }
  }
}

function startWallDrag(wallType, e) {
  e.preventDefault();

  if (!mobileState.gameStarted) return;
  if (mobileState.placementPhase) return;  // 配置フェーズ中は壁設置不可

  // 壁が残っているかチェック
  const player = gameState.players[gameState.currentPlayer];
  if (player.wallsLeft <= 0) return;

  // CPU思考中は操作不可
  if (mobileState.cpuThinking) return;

  // 勝者決定後は操作不可
  if (gameState.winner !== null) return;

  // 1人用で自分のターンじゃない場合は操作不可
  if (mobileState.gameMode === '1p' && !isHumanTurn()) {
    return;
  }

  // 駒のドラッグ状態をクリア
  mobileState.draggingPiece = null;
  mobileState.dragStartPos = null;
  mobileState.dragCurrentPos = null;
  mobileState.selectedMove = null;

  mobileState.draggingWall = {
    wallType: wallType,
    previewPos: null,
    isValid: false
  };

  // 初期タッチ位置を設定
  if (e.touches) {
    mobileState.globalTouchPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  } else {
    mobileState.globalTouchPos = { x: e.clientX, y: e.clientY };
  }
}

// 人間のターンかどうか判定
function isHumanTurn() {
  if (mobileState.gameMode === '2p') return true;

  // 1人用: 人間は常に player 1 (赤/下側)
  return gameState.currentPlayer === 1;
}

// 人間が配置するターンかどうか
function isHumanPlacementTurn() {
  if (mobileState.gameMode === '2p') return true;

  // 1人用: 人間は常に player 1
  return mobileState.placingPlayer === 1;
}

// ========================================
// タッチイベント（キャンバス上）
// ========================================

function touchStarted() {
  if (!mobileState.gameStarted) return false;
  if (mobileState.cpuThinking) return false;
  if (gameState.winner !== null) return false;

  // 壁ドラッグ中は駒の移動を開始しない
  if (mobileState.draggingWall) return false;

  const tx = touches[0]?.x ?? mouseX;
  const ty = touches[0]?.y ?? mouseY;

  // 配置フェーズ
  if (mobileState.placementPhase) {
    if (!isHumanPlacementTurn()) return false;

    mobileState.draggingPiece = mobileState.placingPlayer;
    mobileState.dragStartPos = { x: tx, y: ty };
    mobileState.dragCurrentPos = { x: tx, y: ty };
    mobileState.selectedMove = null;
    return false;
  }

  // 通常フェーズ
  if (gameState.mode !== 'play') return false;

  // 1人用で自分のターンじゃない場合は操作不可
  if (mobileState.gameMode === '1p' && !isHumanTurn()) {
    return false;
  }

  // 盤面上どこでもドラッグ開始できる
  mobileState.draggingPiece = gameState.currentPlayer;
  mobileState.dragStartPos = { x: tx, y: ty };
  mobileState.dragCurrentPos = { x: tx, y: ty };
  mobileState.selectedMove = null;

  return false;
}

function touchMoved() {
  if (!mobileState.gameStarted) return false;
  if (mobileState.cpuThinking) return false;

  // 壁ドラッグ中は駒の移動処理をしない
  if (mobileState.draggingWall) return false;

  const tx = touches[0]?.x ?? mouseX;
  const ty = touches[0]?.y ?? mouseY;

  // 駒のドラッグ（変位による移動先選択）
  if (mobileState.draggingPiece !== null && mobileState.dragStartPos) {
    mobileState.dragCurrentPos = { x: tx, y: ty };

    // ドラッグ変位から移動先を決定
    const dx = tx - mobileState.dragStartPos.x;
    const dy = ty - mobileState.dragStartPos.y;

    if (mobileState.placementPhase) {
      // 配置フェーズ: 横方向のみ考慮
      const validPositions = getValidStartPositions(mobileState.placingPlayer);
      mobileState.selectedMove = selectPlacementByDrag(dx, validPositions);
    } else {
      // 通常フェーズ
      const validMoves = getValidMoves(gameState);
      mobileState.selectedMove = selectMoveByDrag(dx, dy, validMoves);
    }

    return false;
  }

  return false;
}

function touchEnded() {
  if (!mobileState.gameStarted) return false;

  // 壁ドラッグ中は駒の移動処理をしない
  if (mobileState.draggingWall) return false;

  // 駒のドロップ
  if (mobileState.draggingPiece !== null) {
    if (mobileState.selectedMove) {
      if (mobileState.placementPhase) {
        // 配置確定
        confirmPlacement(mobileState.placingPlayer, mobileState.selectedMove.x);
      } else {
        // 移動確定
        moveHistory.saveState(gameState);
        executeMove(gameState, mobileState.selectedMove.x, mobileState.selectedMove.y);
      }
    }

    mobileState.draggingPiece = null;
    mobileState.dragStartPos = null;
    mobileState.dragCurrentPos = null;
    mobileState.selectedMove = null;
    return false;
  }

  return false;
}

// 配置可能な位置を取得
function getValidStartPositions(playerIndex) {
  const y = playerIndex === 0 ? 0 : 8;
  const positions = [];
  for (let x = 0; x < BOARD_SIZE; x++) {
    positions.push({ x, y });
  }
  return positions;
}

// ドラッグ変位から配置位置を選択（横方向のみ）
function selectPlacementByDrag(dx, validPositions) {
  if (validPositions.length === 0) return null;

  // 変位が小さい場合は中央（x=4）
  const threshold = renderer.cellSize * 0.3;
  if (Math.abs(dx) < threshold) {
    return validPositions.find(p => p.x === 4) || validPositions[4];
  }

  // ドラッグ量に応じてx位置を決定
  const cellsOffset = Math.round(dx / renderer.cellSize);
  const targetX = Math.max(0, Math.min(8, 4 + cellsOffset));

  return validPositions.find(p => p.x === targetX) || validPositions[targetX];
}

// ドラッグ変位から移動先を選択
function selectMoveByDrag(dx, dy, validMoves) {
  if (validMoves.length === 0) return null;

  // 変位が小さい場合は選択なし
  const threshold = renderer.cellSize * 0.3;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < threshold) return null;

  // 現在のプレイヤー位置
  const player = gameState.players[gameState.currentPlayer];

  // ドラッグ方向に最も近い移動先を選択
  let bestMove = null;
  let bestScore = -Infinity;

  for (const move of validMoves) {
    // 移動先への方向ベクトル（ゲーム座標）
    const moveDx = move.x - player.x;
    const moveDy = move.y - player.y;

    // ドラッグ方向との内積（類似度）
    const score = dx * moveDx + dy * moveDy;

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
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

// CPU配置処理
function handleCPUPlacement() {
  if (!mobileState.gameStarted) return;
  if (!mobileState.placementPhase) return;
  if (mobileState.cpuThinking) return;
  if (mobileState.gameMode !== '1p') return;

  // CPUのターンかチェック（CPUは常に player 0）
  if (mobileState.placingPlayer !== 0) return;

  // CPU思考開始
  mobileState.cpuThinking = true;
  showThinking(true);

  const config = cpuConfig[0];

  cpuMoveTimeout = setTimeout(() => {
    // ランダムな位置を選択
    const randomX = Math.floor(Math.random() * BOARD_SIZE);
    confirmPlacement(0, randomX);

    mobileState.cpuThinking = false;
    showThinking(false);
  }, config.delay);
}

function handleCPU() {
  if (!mobileState.gameStarted) return;
  if (mobileState.placementPhase) return;
  if (mobileState.gameMode !== '1p') return;
  if (gameState.winner !== null) return;
  if (mobileState.cpuThinking) return;

  // CPUのターンかチェック（CPUは常に player 0）
  if (gameState.currentPlayer !== 0) return;

  // CPU思考開始
  mobileState.cpuThinking = true;
  showThinking(true);

  // CPUの設定を取得（CPU は player 0）
  const config = cpuConfig[0];

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
  // CPUプレイヤー情報の近くにアニメーションを表示
  const topThinking = document.getElementById('top-thinking');
  if (show) {
    topThinking.classList.remove('hidden');
  } else {
    topThinking.classList.add('hidden');
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

  // 上側 = player 0 (青) の壁
  topWalls.innerHTML = '';
  for (let i = 0; i < 10; i++) {
    const dot = document.createElement('span');
    dot.className = 'wall-dot' + (i >= gameState.players[0].wallsLeft ? ' used' : '');
    topWalls.appendChild(dot);
  }

  // 下側 = player 1 (赤) の壁
  bottomWalls.innerHTML = '';
  for (let i = 0; i < 10; i++) {
    const dot = document.createElement('span');
    dot.className = 'wall-dot' + (i >= gameState.players[1].wallsLeft ? ' used' : '');
    bottomWalls.appendChild(dot);
  }
}

function updateUndoButton() {
  const undoBtn = document.getElementById('btn-undo');

  if (mobileState.placementPhase) {
    undoBtn.disabled = true;
    return;
  }

  const undoCount = mobileState.gameMode === '1p' ? 2 : 1;
  undoBtn.disabled = !moveHistory.canUndo(undoCount);

  // ボタンテキストを更新
  undoBtn.textContent = undoCount === 1 ? '1手戻す' : '2手戻す';
}

function updatePlayerIcons() {
  const topIcon = document.getElementById('top-player-icon');
  const bottomIcon = document.getElementById('bottom-player-icon');
  const topLabel = document.getElementById('top-player-label');
  const bottomLabel = document.getElementById('bottom-player-label');

  // 上エリア = player 0 (青) の情報
  // 下エリア = player 1 (赤) の情報

  if (mobileState.gameMode === '1p') {
    // 1人用: 上=CPU(青)、下=人間(赤)
    topIcon.textContent = '🤖';
    bottomIcon.textContent = '👤';
    topLabel.textContent = 'CPU';
    bottomLabel.textContent = 'あなた';
  } else {
    // 2人用
    topIcon.textContent = '👤';
    bottomIcon.textContent = '👤';
    topLabel.textContent = 'プレイヤー1';
    bottomLabel.textContent = 'プレイヤー2';
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
