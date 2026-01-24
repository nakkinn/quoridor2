// モバイル用描画クラス
class MobileRenderer {
  constructor(p5Instance) {
    this.p = p5Instance;
    this.boardSize = 0;
    this.cellSize = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.wallThickness = 6;
    this.pieceRadius = 0;
  }

  // キャンバスサイズに合わせて計算
  calculateSizes(canvasSize) {
    this.boardSize = canvasSize;
    this.cellSize = canvasSize / BOARD_SIZE;
    this.offsetX = 0;
    this.offsetY = 0;
    this.pieceRadius = this.cellSize * 0.35;
    this.wallThickness = Math.max(4, this.cellSize * 0.12);
  }

  // ゲーム全体を描画
  draw(state, mobileState) {
    const p = this.p;

    // 背景（白基調）
    p.background('#f5f5f5');

    // 盤面
    this.drawBoard();

    // 壁
    this.drawWalls(state);

    // 壁アニメーション
    if (mobileState.animation && mobileState.animation.type === 'wall') {
      this.drawWallAnimation(mobileState.animation);
    }

    // 配置フェーズ
    if (mobileState.placementPhase) {
      // 1人用モードではCPUのターン(player 0)は表示しない
      const isHumanPlacement = mobileState.gameMode === '2p' || mobileState.placingPlayer === 1;
      if (isHumanPlacement) {
        this.drawPlacementPhase(state, mobileState);
      }
    } else {
      // 移動可能マス（壁ドラッグ中、アニメーション中は非表示）
      // 1人用モードではCPUのターン(player 0)は表示しない
      const isHumanTurn = mobileState.gameMode === '2p' || state.currentPlayer === 1;
      const isAnimating = mobileState.animation !== null;
      if (state.mode === 'play' && state.winner === null && !mobileState.cpuThinking && !mobileState.draggingWall && isHumanTurn && !isAnimating) {
        this.drawValidMoves(state, mobileState);
      }
    }

    // 駒
    this.drawPieces(state, mobileState);

    // ドラッグ中の壁プレビュー
    if (mobileState.draggingWall) {
      this.drawDraggingWall(mobileState);
    }

    // 勝者表示
    if (state.winner !== null) {
      this.drawWinner(state.winner);
    }
  }

  // 盤面を描画
  drawBoard() {
    const p = this.p;

    // 背景（白基調）
    p.fill('#ffffff');
    p.noStroke();
    p.rect(0, 0, this.boardSize, this.boardSize, 8);

    // グリッド線
    p.stroke('#ccc');
    p.strokeWeight(1);

    for (let i = 0; i <= BOARD_SIZE; i++) {
      const pos = i * this.cellSize;
      p.line(pos, 0, pos, this.boardSize);
      p.line(0, pos, this.boardSize, pos);
    }
  }

  // 壁を描画
  drawWalls(state) {
    const p = this.p;

    for (let wy = 0; wy < WALL_GRID_SIZE; wy++) {
      for (let wx = 0; wx < WALL_GRID_SIZE; wx++) {
        const wallType = state.walls[wy][wx];
        if (wallType !== WALL_DIR.NONE) {
          this.drawWallAt(wx, wy, wallType, '#8B4513');
        }
      }
    }
  }

  // 指定位置に壁を描画
  drawWallAt(wx, wy, wallType, color, alpha = 255) {
    const p = this.p;

    if (alpha < 255) {
      p.fill(p.color(color).levels[0], p.color(color).levels[1], p.color(color).levels[2], alpha);
    } else {
      p.fill(color);
    }
    p.noStroke();

    const cx = (wx + 1) * this.cellSize;
    const cy = (wy + 1) * this.cellSize;
    const wallLen = this.cellSize * 2 - this.wallThickness;

    if (wallType === WALL_DIR.VERTICAL) {
      p.rect(
        cx - this.wallThickness / 2,
        cy - this.cellSize + this.wallThickness / 2,
        this.wallThickness,
        wallLen,
        3
      );
    } else if (wallType === WALL_DIR.HORIZONTAL) {
      p.rect(
        cx - this.cellSize + this.wallThickness / 2,
        cy - this.wallThickness / 2,
        wallLen,
        this.wallThickness,
        3
      );
    }
  }

  // 配置フェーズの描画
  drawPlacementPhase(state, mobileState) {
    const p = this.p;
    const placingPlayer = mobileState.placingPlayer;

    // 配置可能な9箇所をハイライト
    const y = placingPlayer === 0 ? 0 : 8;
    for (let x = 0; x < BOARD_SIZE; x++) {
      const px = x * this.cellSize + this.cellSize / 2;
      const py = y * this.cellSize + this.cellSize / 2;

      // 選択中かどうか
      const isSelected = mobileState.selectedMove &&
                         mobileState.selectedMove.x === x &&
                         mobileState.selectedMove.y === y;

      if (isSelected) {
        // 選択中: 明るいハイライト
        p.fill(255, 220, 0, 200);
        p.noStroke();
        p.rect(
          x * this.cellSize + 2,
          y * this.cellSize + 2,
          this.cellSize - 4,
          this.cellSize - 4,
          8
        );

        p.fill(255, 220, 0, 255);
        p.circle(px, py, this.cellSize * 0.5);
      } else {
        // 非選択: 通常のハイライト
        p.fill(255, 200, 0, 80);
        p.noStroke();
        p.rect(
          x * this.cellSize + 4,
          y * this.cellSize + 4,
          this.cellSize - 8,
          this.cellSize - 8,
          8
        );

        p.fill(255, 200, 0, 150);
        p.circle(px, py, this.cellSize * 0.25);
      }
    }
  }

  // 移動可能マスを描画
  drawValidMoves(state, mobileState) {
    const p = this.p;
    const validMoves = getValidMoves(state);

    for (const move of validMoves) {
      const px = move.x * this.cellSize + this.cellSize / 2;
      const py = move.y * this.cellSize + this.cellSize / 2;

      // 選択中の移動先かどうか
      const isSelected = mobileState.selectedMove &&
                         mobileState.selectedMove.x === move.x &&
                         mobileState.selectedMove.y === move.y;

      if (isSelected) {
        // 選択中: より明るいハイライト
        p.fill(255, 220, 0, 200);
        p.noStroke();
        p.rect(
          move.x * this.cellSize + 2,
          move.y * this.cellSize + 2,
          this.cellSize - 4,
          this.cellSize - 4,
          8
        );

        // 大きなマーカー
        p.fill(255, 220, 0, 255);
        p.circle(px, py, this.cellSize * 0.5);
      } else {
        // 非選択: 通常のハイライト
        p.fill(255, 200, 0, 80);
        p.noStroke();
        p.rect(
          move.x * this.cellSize + 4,
          move.y * this.cellSize + 4,
          this.cellSize - 8,
          this.cellSize - 8,
          8
        );

        // 小さなマーカー
        p.fill(255, 200, 0, 150);
        p.circle(px, py, this.cellSize * 0.25);
      }
    }
  }

  // 駒を描画
  drawPieces(state, mobileState) {
    const p = this.p;

    for (let i = 0; i < 2; i++) {
      const player = state.players[i];

      // アニメーション中の駒かどうかチェック
      const isAnimating = mobileState.animation &&
                          mobileState.animation.type === 'move' &&
                          mobileState.animation.playerIndex === i;

      // 配置されていない駒は盤面外に表示
      if (!state.piecePlaced[i]) {
        // 盤面外の位置（y=-1 または y=9）
        const outY = i === 0 ? -1 : 9;
        const px = player.x * this.cellSize + this.cellSize / 2;
        const py = outY * this.cellSize + this.cellSize / 2;

        // 盤面外なので位置をクランプ
        const clampedPy = i === 0
          ? Math.max(-this.cellSize / 2, py)
          : Math.min(this.boardSize + this.cellSize / 2, py);

        this.drawPieceAt(px, clampedPy, i, mobileState.placingPlayer === i, 1);
      } else if (isAnimating) {
        // アニメーション中：補間位置に描画
        const anim = mobileState.animation;
        const t = this.easeOutCubic(anim.progress);
        const fromPx = anim.fromX * this.cellSize + this.cellSize / 2;
        const fromPy = anim.fromY * this.cellSize + this.cellSize / 2;
        const toPx = anim.toX * this.cellSize + this.cellSize / 2;
        const toPy = anim.toY * this.cellSize + this.cellSize / 2;
        const px = fromPx + (toPx - fromPx) * t;
        const py = fromPy + (toPy - fromPy) * t;
        this.drawPieceAt(px, py, i, false, 1);
      } else {
        const px = player.x * this.cellSize + this.cellSize / 2;
        const py = player.y * this.cellSize + this.cellSize / 2;
        this.drawPieceAt(px, py, i, state.currentPlayer === i, 1);
      }
    }
  }

  // イージング関数（滑らかな減速）
  easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
  }

  // 駒を指定位置に描画
  drawPieceAt(px, py, playerIndex, isCurrentPlayer, scale) {
    const p = this.p;
    const color = playerIndex === 0 ? '#3498db' : '#e74c3c';
    const radius = this.pieceRadius * scale;

    // 影
    p.fill(0, 0, 0, 50);
    p.noStroke();
    p.circle(px + 2, py + 2, radius * 2);

    // 本体
    p.fill(color);
    if (isCurrentPlayer) {
      p.stroke('#fff');
      p.strokeWeight(3);
    } else {
      p.noStroke();
    }
    p.circle(px, py, radius * 2);
  }

  // ドラッグ中の壁を描画
  drawDraggingWall(mobileState) {
    const { wallType, previewPos, isValid } = mobileState.draggingWall;

    if (previewPos) {
      const color = isValid ? '#8B4513' : '#e74c3c';
      this.drawWallAt(previewPos.wx, previewPos.wy, wallType, color, 180);
    }
  }

  // 壁アニメーション描画
  drawWallAnimation(animation) {
    const p = this.p;
    const { wx, wy, dir, progress } = animation;

    // イージングを適用
    const t = this.easeOutCubic(progress);

    // 開始位置（盤面上部から）と終了位置を計算
    const targetCx = (wx + 1) * this.cellSize;
    const targetCy = (wy + 1) * this.cellSize;
    const startCy = -this.cellSize;  // 盤面外上部から

    // 補間
    const cy = startCy + (targetCy - startCy) * t;

    // 透明度もアニメーション
    const alpha = Math.floor(100 + 155 * t);

    // 壁を描画
    p.fill(139, 69, 19, alpha);
    p.noStroke();

    const wallLen = this.cellSize * 2 - this.wallThickness;

    if (dir === WALL_DIR.VERTICAL) {
      p.rect(
        targetCx - this.wallThickness / 2,
        cy - this.cellSize + this.wallThickness / 2,
        this.wallThickness,
        wallLen,
        3
      );
    } else if (dir === WALL_DIR.HORIZONTAL) {
      p.rect(
        targetCx - this.cellSize + this.wallThickness / 2,
        cy - this.wallThickness / 2,
        wallLen,
        this.wallThickness,
        3
      );
    }
  }

  // 勝者表示（HTMLダイアログに移行したため空実装）
  drawWinner(winner) {
    // 勝者表示はHTMLダイアログで行う
  }

  // ピクセル座標からセル座標に変換
  pixelToCell(px, py) {
    const x = Math.floor(px / this.cellSize);
    const y = Math.floor(py / this.cellSize);
    return { x, y };
  }

  // ピクセル座標から壁座標に変換
  pixelToWallPos(px, py) {
    const wx = Math.round(px / this.cellSize) - 1;
    const wy = Math.round(py / this.cellSize) - 1;
    return { wx, wy };
  }

  // セル座標からピクセル座標（中心）に変換
  cellToPixel(x, y) {
    return {
      px: x * this.cellSize + this.cellSize / 2,
      py: y * this.cellSize + this.cellSize / 2
    };
  }

  // 壁座標からピクセル座標に変換
  wallPosToPixel(wx, wy) {
    return {
      px: (wx + 1) * this.cellSize,
      py: (wy + 1) * this.cellSize
    };
  }

  // 駒がタップされたか判定
  isPieceTapped(px, py, playerX, playerY) {
    const piecePx = playerX * this.cellSize + this.cellSize / 2;
    const piecePy = playerY * this.cellSize + this.cellSize / 2;
    const dist = Math.sqrt((px - piecePx) ** 2 + (py - piecePy) ** 2);
    return dist <= this.pieceRadius * 1.5;
  }

  // 移動可能マスがタップされたか判定
  getValidMoveTapped(px, py, validMoves) {
    for (const move of validMoves) {
      const movePx = move.x * this.cellSize + this.cellSize / 2;
      const movePy = move.y * this.cellSize + this.cellSize / 2;
      const dist = Math.sqrt((px - movePx) ** 2 + (py - movePy) ** 2);
      if (dist <= this.cellSize * 0.4) {
        return move;
      }
    }
    return null;
  }
}
