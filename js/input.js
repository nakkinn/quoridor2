// UI状態クラス
class UIState {
  constructor() {
    this.validMoves = [];       // 現在の有効な移動先
    this.hoveredMove = null;    // ホバー中の移動先 { x, y }
    this.wallPreview = null;    // 壁プレビュー { x, y, dir }
    this.hoveredWall = null;    // ホバー中の既存壁 { x, y, dir } - 編集モード削除用
    this.currentWallDir = WALL_DIR.VERTICAL;  // 現在の壁方向（初期: 縦）
    this.inputMode = 'move';    // 'move' | 'wall' - 右クリックで切り替え

    // 編集モード用ドラッグ状態
    this.draggingPiece = null;  // ドラッグ中の駒インデックス (0 or 1)
    this.dragOffset = { x: 0, y: 0 };  // ドラッグ開始時のオフセット

    // 最短経路表示
    this.showPaths = false;     // Aキーでトグル

    // 距離マップ表示 (0: 非表示, 1: P1, 2: P2)
    this.distanceMapMode = 0;   // Sキーでサイクル

    // 壁評価表示
    this.showWallEvaluations = false;  // Dキーでトグル

    // 確定距離表示 (0: 非表示, 1: P1, 2: P2)
    this.lockedDistanceMode = 0;  // Fキーでサイクル

    // 最適手表示
    this.showBestMove = false;  // Gキーでトグル

    // CPU移動予約状態（各プレイヤー用）
    this.cpuMoveScheduled = [false, false];
  }

  reset() {
    this.validMoves = [];
    this.hoveredMove = null;
    this.wallPreview = null;
    this.hoveredWall = null;
    this.draggingPiece = null;
    this.cpuMoveScheduled = [false, false];
  }

  toggleInputMode() {
    this.inputMode = this.inputMode === 'move' ? 'wall' : 'move';
  }

  toggleShowPaths() {
    this.showPaths = !this.showPaths;
  }

  cycleDistanceMapMode() {
    this.distanceMapMode = (this.distanceMapMode + 1) % 3;
  }

  toggleWallEvaluations() {
    this.showWallEvaluations = !this.showWallEvaluations;
  }

  cycleLockedDistanceMode() {
    this.lockedDistanceMode = (this.lockedDistanceMode + 1) % 3;
  }

  toggleBestMove() {
    this.showBestMove = !this.showBestMove;
  }

  // P2のCPU有効/無効をトグル（Hキー）
  toggleP2Cpu() {
    cpuConfig[1].enabled = !cpuConfig[1].enabled;
    this.cpuMoveScheduled[1] = false;
    console.log(`P2 CPU: ${cpuConfig[1].enabled ? 'ON' : 'OFF'} (depth=${cpuConfig[1].depth})`);
  }

  // CPU対戦モードをトグル（Jキー）
  toggleCpuVsCpu() {
    const bothEnabled = cpuConfig[0].enabled && cpuConfig[1].enabled;
    if (bothEnabled) {
      // 両方ONなら両方OFF
      cpuConfig[0].enabled = false;
      cpuConfig[1].enabled = false;
      console.log('CPU vs CPU: OFF');
    } else {
      // それ以外なら両方ON
      cpuConfig[0].enabled = true;
      cpuConfig[1].enabled = true;
      this.cpuMoveScheduled = [false, false];
      console.log(`CPU vs CPU: ON (P1:depth=${cpuConfig[0].depth} vs P2:depth=${cpuConfig[1].depth})`);
    }
  }

  // CPU移動予約をリセット
  resetCpuSchedule() {
    this.cpuMoveScheduled = [false, false];
  }
}

// 入力処理クラス
class InputHandler {
  constructor(renderer, gameState, uiState) {
    this.renderer = renderer;
    this.gameState = gameState;
    this.uiState = uiState;
  }

  // 毎フレーム呼ばれる更新処理
  update(mouseX, mouseY) {
    // 移動可能マスは常に計算（両モードで表示するため）
    if (this.gameState.mode === 'play' && this.gameState.winner === null) {
      this.uiState.validMoves = getValidMoves(this.gameState);
    } else {
      this.uiState.validMoves = [];
    }

    // ドラッグ中は他のホバー処理をスキップ
    if (this.uiState.draggingPiece !== null) {
      this.uiState.hoveredMove = null;
      this.uiState.wallPreview = null;
      return;
    }

    if (this.gameState.mode === 'play' && this.gameState.winner === null) {
      this.updatePlayModeHover(mouseX, mouseY);
    } else if (this.gameState.mode === 'edit') {
      this.updateEditModeHover(mouseX, mouseY);
    } else {
      this.uiState.hoveredMove = null;
      this.uiState.wallPreview = null;
    }
  }

  // 対戦モード: ホバー状態を更新
  updatePlayModeHover(mouseX, mouseY) {
    this.uiState.hoveredMove = null;
    this.uiState.wallPreview = null;

    // 移動マーカーのホバーは常にチェック
    const hoveredMove = this.findHoveredMove(mouseX, mouseY);
    if (hoveredMove) {
      this.uiState.hoveredMove = hoveredMove;
    }

    // 壁設置モードの場合のみ壁プレビューを表示
    if (this.uiState.inputMode === 'wall') {
      const wallPreview = this.findWallPreview(mouseX, mouseY);
      if (wallPreview) {
        this.uiState.wallPreview = wallPreview;
      }
    }
  }

  // 編集モード: ホバー状態を更新
  updateEditModeHover(mouseX, mouseY) {
    this.uiState.hoveredMove = null;
    this.uiState.wallPreview = null;
    this.uiState.hoveredWall = null;

    // 壁設置モードの場合
    if (this.uiState.inputMode === 'wall') {
      // まず既存の壁のホバーをチェック
      const hoveredWall = this.findHoveredExistingWall(mouseX, mouseY);
      if (hoveredWall) {
        this.uiState.hoveredWall = hoveredWall;
        return;
      }

      // 既存壁がなければ新規配置のプレビュー
      const wallPreview = this.findEditWallPreview(mouseX, mouseY);
      if (wallPreview) {
        this.uiState.wallPreview = wallPreview;
      }
    }
  }

  // 編集モード: マウス位置にある既存の壁を探す
  findHoveredExistingWall(mouseX, mouseY) {
    const { wx, wy } = this.renderer.pixelToWallPos(mouseX, mouseY);

    if (wx < 0 || wx >= WALL_GRID_SIZE || wy < 0 || wy >= WALL_GRID_SIZE) {
      return null;
    }

    const { px, py } = this.renderer.wallPosToPixel(wx, wy);
    const distance = Math.sqrt((mouseX - px) ** 2 + (mouseY - py) ** 2);

    // 閾値内で既存の壁があるかチェック
    if (distance <= WALL_HOVER_THRESHOLD) {
      const wallDir = this.gameState.walls[wy][wx];
      if (wallDir !== WALL_DIR.NONE) {
        return { x: wx, y: wy, dir: wallDir };
      }
    }

    return null;
  }

  // マウス位置にある移動マーカーを探す
  findHoveredMove(mouseX, mouseY) {
    for (const move of this.uiState.validMoves) {
      const { px, py } = this.renderer.cellCenterToPixel(move.x, move.y);

      // マスの正方形内にあるか判定
      const halfCell = CELL_SIZE / 2;
      if (mouseX >= px - halfCell && mouseX <= px + halfCell &&
          mouseY >= py - halfCell && mouseY <= py + halfCell) {
        return move;
      }
    }
    return null;
  }

  // 対戦モード: マウス位置に対応する壁プレビューを探す
  findWallPreview(mouseX, mouseY) {
    const { wx, wy } = this.renderer.pixelToWallPos(mouseX, mouseY);

    if (wx < 0 || wx >= WALL_GRID_SIZE || wy < 0 || wy >= WALL_GRID_SIZE) {
      return null;
    }

    // 残り壁チェック
    const player = this.gameState.getCurrentPlayer();
    if (player.wallsLeft <= 0) {
      return null;
    }

    // 配置可能性チェック
    const dir = this.uiState.currentWallDir;

    if (canPlaceWall(this.gameState, wx, wy, dir)) {
      return { x: wx, y: wy, dir: dir };
    }

    // 逆方向でチェック
    const altDir = dir === WALL_DIR.VERTICAL
      ? WALL_DIR.HORIZONTAL
      : WALL_DIR.VERTICAL;

    if (canPlaceWall(this.gameState, wx, wy, altDir)) {
      return { x: wx, y: wy, dir: altDir };
    }

    return null;
  }

  // 編集モード: 壁プレビュー（経路チェックなし、重複チェックあり）
  findEditWallPreview(mouseX, mouseY) {
    const { wx, wy } = this.renderer.pixelToWallPos(mouseX, mouseY);

    if (wx < 0 || wx >= WALL_GRID_SIZE || wy < 0 || wy >= WALL_GRID_SIZE) {
      return null;
    }

    // 既に壁がある場合はプレビューなし（削除用にクリックは許可）
    if (this.gameState.walls[wy][wx] !== WALL_DIR.NONE) {
      return null;
    }

    const dir = this.uiState.currentWallDir;

    // 重複チェック（経路保証なし）
    if (canPlaceWallBasic(this.gameState, wx, wy, dir)) {
      return { x: wx, y: wy, dir: dir };
    }

    // 逆方向でチェック
    const altDir = dir === WALL_DIR.VERTICAL
      ? WALL_DIR.HORIZONTAL
      : WALL_DIR.VERTICAL;

    if (canPlaceWallBasic(this.gameState, wx, wy, altDir)) {
      return { x: wx, y: wy, dir: altDir };
    }

    return null;
  }

  // 右クリック処理: モード切り替え
  handleRightClick() {
    this.uiState.toggleInputMode();
  }

  // 対戦モード: 左クリック処理
  handlePlayClick(mouseX, mouseY) {
    if (this.gameState.winner !== null) {
      return;
    }

    if (this.uiState.inputMode === 'move') {
      // 移動モード: ホバー中のマーカーに移動
      if (this.uiState.hoveredMove) {
        const move = this.uiState.hoveredMove;
        executeMove(this.gameState, move.x, move.y);
        this.uiState.reset();
      }
    } else {
      // 壁設置モード: 壁プレビューがあれば配置
      if (this.uiState.wallPreview) {
        const wall = this.uiState.wallPreview;
        executeWallPlacement(this.gameState, wall.x, wall.y, wall.dir);
        this.uiState.reset();
      }
    }
  }

  // 編集モード: マウスダウン処理
  handleEditMouseDown(mouseX, mouseY) {
    if (this.uiState.inputMode === 'move') {
      // 移動モード: 駒のドラッグ開始チェック
      for (let i = 0; i < 2; i++) {
        const player = this.gameState.players[i];
        const { px, py } = this.renderer.cellCenterToPixel(player.x, player.y);
        const dist = Math.sqrt((mouseX - px) ** 2 + (mouseY - py) ** 2);

        if (dist <= PIECE_RADIUS) {
          this.uiState.draggingPiece = i;
          this.uiState.dragOffset = { x: mouseX - px, y: mouseY - py };
          return;
        }
      }
    }
  }

  // 編集モード: マウスアップ処理
  handleEditMouseUp(mouseX, mouseY) {
    if (this.uiState.draggingPiece !== null) {
      // ドラッグ中の駒を配置
      const cell = this.renderer.pixelToCell(mouseX, mouseY);

      if (isValidCell(cell.x, cell.y)) {
        const other = this.gameState.players[1 - this.uiState.draggingPiece];

        // 他の駒と同じ位置でないことを確認
        if (cell.x !== other.x || cell.y !== other.y) {
          this.gameState.players[this.uiState.draggingPiece].x = cell.x;
          this.gameState.players[this.uiState.draggingPiece].y = cell.y;
        }
      }

      this.uiState.draggingPiece = null;
      return;
    }

    // 壁設置モード
    if (this.uiState.inputMode === 'wall') {
      // ホバー中の既存壁があれば削除
      if (this.uiState.hoveredWall) {
        const { x, y } = this.uiState.hoveredWall;
        this.gameState.walls[y][x] = WALL_DIR.NONE;
        return;
      }

      // 壁プレビューがあれば配置
      if (this.uiState.wallPreview) {
        const { x, y, dir } = this.uiState.wallPreview;
        if (canPlaceWallBasic(this.gameState, x, y, dir)) {
          this.gameState.walls[y][x] = dir;
        }
      }
    }
  }

  // 編集モード: 壁の配置/削除をトグル（重複チェックあり）
  toggleEditWallAt(wx, wy) {
    const current = this.gameState.walls[wy][wx];
    const dir = this.uiState.currentWallDir;

    if (current === WALL_DIR.NONE) {
      // 壁がない場合は配置（重複チェック、経路保証なし）
      if (canPlaceWallBasic(this.gameState, wx, wy, dir)) {
        this.gameState.walls[wy][wx] = dir;
      }
    } else if (current === dir) {
      // 同じ向きの壁がある場合は削除
      this.gameState.walls[wy][wx] = WALL_DIR.NONE;
    } else {
      // 異なる向きの壁がある場合は向きを変更（重複チェック）
      // 一度削除してから配置可能かチェック
      this.gameState.walls[wy][wx] = WALL_DIR.NONE;
      if (canPlaceWallBasic(this.gameState, wx, wy, dir)) {
        this.gameState.walls[wy][wx] = dir;
      } else {
        // 配置できない場合は元に戻す
        this.gameState.walls[wy][wx] = current;
      }
    }
  }

  // ドラッグ中の駒の位置を取得
  getDraggedPiecePosition(mouseX, mouseY) {
    if (this.uiState.draggingPiece === null) return null;
    return {
      x: mouseX - this.uiState.dragOffset.x,
      y: mouseY - this.uiState.dragOffset.y
    };
  }

  // マウスホイール処理
  handleWheel(delta) {
    // 壁の方向を切り替え
    if (this.uiState.currentWallDir === WALL_DIR.VERTICAL) {
      this.uiState.currentWallDir = WALL_DIR.HORIZONTAL;
    } else {
      this.uiState.currentWallDir = WALL_DIR.VERTICAL;
    }
  }
}
