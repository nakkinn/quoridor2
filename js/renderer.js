// 描画クラス
class Renderer {
  constructor(p5Instance) {
    this.p = p5Instance;
    this.offsetX = 50;  // 盤面の左上X座標
    this.offsetY = 120;  // 盤面の左上Y座標
  }

  // ゲーム全体を描画
  draw(state, uiState, inputHandler) {
    this.p.background(240);
    this.drawInfo(state, uiState);
    this.drawBoard();
    this.drawWalls(state, uiState);

    // 距離マップ表示（Sキーでサイクル）
    if (uiState.distanceMapMode > 0) {
      this.drawDistanceMap(state, uiState.distanceMapMode - 1);
    }

    // 確定距離表示（Fキーでサイクル）
    if (uiState.lockedDistanceMode > 0) {
      this.drawLockedDistanceMap(state, uiState.lockedDistanceMode - 1);
    }

    // 最短経路表示（Aキーでトグル、配置フェーズ以外）
    if (uiState.showPaths && !state.isPlacementPhase()) {
      this.drawShortestPaths(state);
    }

    // 壁評価表示（Dキーでトグル）
    if (uiState.showWallEvaluations) {
      this.drawWallEvaluations(state);
    }

    // 最適手表示（Gキーでトグル、配置フェーズ以外）
    if (uiState.showBestMove && state.mode === 'play' && state.winner === null && !state.isPlacementPhase()) {
      this.drawBestMove(state);
    }

    this.drawPieces(state, uiState, inputHandler);

    if (state.mode === 'play' && state.winner === null) {
      // 移動マーカーは常に表示
      this.drawMoveMarkers(state, uiState);
      this.drawWallPreview(uiState);
    }

    if (state.mode === 'edit') {
      this.drawEditModeIndicator();
      this.drawWallPreview(uiState);
    }

    if (state.winner !== null) {
      this.drawWinnerMessage(state.winner);
    }
  }

  // 情報表示（手番、残り壁、入力モード）
  drawInfo(state, uiState) {
    const p = this.p;

    p.textSize(16);
    p.textAlign(p.LEFT, p.TOP);
    p.noStroke();

    // 手番またはモード表示
    let turnText;
    if (state.winner !== null) {
      turnText = `勝者: プレイヤー${state.winner + 1}（編集モード）`;
      p.fill(0);
    } else if (state.mode === 'edit') {
      turnText = '編集モード';
      p.fill(100, 100, 255);
    } else if (state.isPlacementPhase()) {
      turnText = `配置フェーズ: プレイヤー${state.currentPlayer + 1}がスタート位置を選択`;
      const color = state.currentPlayer === 0 ? COLORS.PLAYER1 : COLORS.PLAYER2;
      p.fill(color);
    } else {
      turnText = `手番: プレイヤー${state.currentPlayer + 1}`;
      const color = state.currentPlayer === 0 ? COLORS.PLAYER1 : COLORS.PLAYER2;
      p.fill(color);
    }
    p.text(turnText, 10, 10);

    // 残り壁
    p.fill(0);
    const p1 = state.players[0];
    const p2 = state.players[1];
    p.text(`残り壁: P1=${p1.wallsLeft}  P2=${p2.wallsLeft}`, 10, 35);

    // 入力モード表示
    const modeText = uiState.inputMode === 'move' ? '移動モード' : '壁設置モード';
    const modeColor = uiState.inputMode === 'move' ? '#27ae60' : '#e67e22';
    p.fill(modeColor);
    p.text(`[${modeText}]  右クリックで切替`, 10, 55);
  }

  // 盤面のグリッド描画
  drawBoard() {
    const p = this.p;
    const size = CELL_SIZE * BOARD_SIZE;

    // 背景
    p.fill(COLORS.BOARD_BG);
    p.noStroke();
    p.rect(this.offsetX, this.offsetY, size, size);

    // グリッド線
    p.stroke(COLORS.BOARD_LINE);
    p.strokeWeight(1);

    for (let i = 0; i <= BOARD_SIZE; i++) {
      const pos = i * CELL_SIZE;
      // 縦線
      p.line(
        this.offsetX + pos, this.offsetY,
        this.offsetX + pos, this.offsetY + size
      );
      // 横線
      p.line(
        this.offsetX, this.offsetY + pos,
        this.offsetX + size, this.offsetY + pos
      );
    }
  }

  // 壁を描画
  drawWalls(state, uiState) {
    for (let wy = 0; wy < WALL_GRID_SIZE; wy++) {
      for (let wx = 0; wx < WALL_GRID_SIZE; wx++) {
        const wallType = state.walls[wy][wx];
        if (wallType !== WALL_DIR.NONE) {
          // ホバー中の壁は別の色で描画
          const isHovered = uiState && uiState.hoveredWall &&
            uiState.hoveredWall.x === wx && uiState.hoveredWall.y === wy;
          const color = isHovered ? COLORS.WALL_HOVER_DELETE : COLORS.WALL;
          this.drawWallAt(wx, wy, wallType, color);
        }
      }
    }
  }

  // 指定位置に壁を描画
  drawWallAt(wx, wy, wallType, color) {
    const p = this.p;
    p.fill(color);
    p.noStroke();

    // 壁交点のピクセル座標
    const cx = this.offsetX + (wx + 1) * CELL_SIZE;
    const cy = this.offsetY + (wy + 1) * CELL_SIZE;

    if (wallType === WALL_DIR.VERTICAL) {
      // 縦壁: 2マス分の高さ
      p.rect(
        cx - WALL_THICKNESS / 2,
        cy - CELL_SIZE + WALL_THICKNESS / 2,
        WALL_THICKNESS,
        CELL_SIZE * 2 - WALL_THICKNESS
      );
    } else if (wallType === WALL_DIR.HORIZONTAL) {
      // 横壁: 2マス分の幅
      p.rect(
        cx - CELL_SIZE + WALL_THICKNESS / 2,
        cy - WALL_THICKNESS / 2,
        CELL_SIZE * 2 - WALL_THICKNESS,
        WALL_THICKNESS
      );
    }
  }

  // 駒を描画
  drawPieces(state, uiState, inputHandler) {
    const p = this.p;

    for (let i = 0; i < 2; i++) {
      // 未配置の駒は描画しない
      if (!state.piecePlaced[i]) continue;

      const player = state.players[i];
      const color = i === 0 ? COLORS.PLAYER1 : COLORS.PLAYER2;

      // ドラッグ中の駒は別の位置に描画
      let px, py;
      if (uiState.draggingPiece === i && inputHandler) {
        const dragPos = inputHandler.getDraggedPiecePosition(p.mouseX, p.mouseY);
        if (dragPos) {
          px = dragPos.x;
          py = dragPos.y;
        } else {
          px = this.offsetX + player.x * CELL_SIZE + CELL_SIZE / 2;
          py = this.offsetY + player.y * CELL_SIZE + CELL_SIZE / 2;
        }
      } else {
        px = this.offsetX + player.x * CELL_SIZE + CELL_SIZE / 2;
        py = this.offsetY + player.y * CELL_SIZE + CELL_SIZE / 2;
      }

      // 手番プレイヤー強調表示
      const isCurrentPlayer = (state.mode === 'play' && state.currentPlayer === i);
      if (isCurrentPlayer) {
        p.fill(color);
        p.stroke(120);
        p.strokeWeight(3);
      } else {
        p.fill(color);
        p.noStroke();
      }
      p.circle(px, py, PIECE_RADIUS * 2);

      // プレイヤー番号
      p.fill(255);
      p.noStroke();
      p.textSize(14);
      p.textAlign(p.CENTER, p.CENTER);
      p.text(i + 1, px, py);
    }
  }

  // 移動マーカーを描画
  drawMoveMarkers(state, uiState) {
    const p = this.p;
    const validMoves = uiState.validMoves || [];

    for (const move of validMoves) {
      const px = this.offsetX + move.x * CELL_SIZE + CELL_SIZE / 2;
      const py = this.offsetY + move.y * CELL_SIZE + CELL_SIZE / 2;

      // ホバー判定
      const isHovered = uiState.hoveredMove &&
        uiState.hoveredMove.x === move.x &&
        uiState.hoveredMove.y === move.y;

      const radius = isHovered && uiState.inputMode === 'move' ? MARKER_HOVER_RADIUS : MARKER_RADIUS;
      const color = isHovered && uiState.inputMode === 'move' ? COLORS.MARKER_HOVER : COLORS.MARKER;

      p.fill(color);
      p.noStroke();
      p.circle(px, py, radius * 2);
    }
  }

  // 壁のプレビュー（影）を描画
  drawWallPreview(uiState) {
    if (!uiState.wallPreview) return;

    const { x, y, dir } = uiState.wallPreview;
    this.drawWallAt(x, y, dir, COLORS.WALL_PREVIEW);
  }

  // 編集モードインジケーター
  drawEditModeIndicator() {
    const p = this.p;

    p.noFill();
    p.stroke(100, 100, 255);
    p.strokeWeight(3);
    p.rect(
      this.offsetX - 5,
      this.offsetY - 5,
      CELL_SIZE * BOARD_SIZE + 10,
      CELL_SIZE * BOARD_SIZE + 10
    );
  }

  // 勝者メッセージ
  drawWinnerMessage(winner) {
    const p = this.p;
    const text = `プレイヤー${winner + 1}の勝利！`;

    p.fill(0, 0, 0, 150);
    p.noStroke();
    p.rect(0, 0, p.width, p.height);

    const color = winner === 0 ? COLORS.PLAYER1 : COLORS.PLAYER2;

    p.fill(255);
    p.stroke(color);
    p.strokeWeight(3);
    p.textSize(32);
    p.textAlign(p.CENTER, p.CENTER);
    p.text(text, p.width / 2, p.height / 2 - 20);

    p.noStroke();
    p.fill(200);
    p.textSize(16);
    p.text('編集モードに移行しました', p.width / 2, p.height / 2 + 30);
  }

  // ピクセル座標からプレイヤー座標に変換
  pixelToCell(px, py) {
    const x = Math.floor((px - this.offsetX) / CELL_SIZE);
    const y = Math.floor((py - this.offsetY) / CELL_SIZE);
    return { x, y };
  }

  // ピクセル座標から最寄りの壁交点を取得
  pixelToWallPos(px, py) {
    const wx = Math.round((px - this.offsetX) / CELL_SIZE) - 1;
    const wy = Math.round((py - this.offsetY) / CELL_SIZE) - 1;
    return { wx, wy };
  }

  // 壁交点のピクセル座標を取得
  wallPosToPixel(wx, wy) {
    const px = this.offsetX + (wx + 1) * CELL_SIZE;
    const py = this.offsetY + (wy + 1) * CELL_SIZE;
    return { px, py };
  }

  // マス中心のピクセル座標を取得
  cellCenterToPixel(x, y) {
    const px = this.offsetX + x * CELL_SIZE + CELL_SIZE / 2;
    const py = this.offsetY + y * CELL_SIZE + CELL_SIZE / 2;
    return { px, py };
  }

  // 両プレイヤーの最短経路を描画
  drawShortestPaths(state) {
    const p = this.p;
    const PATH_OFFSET = 8;  // 経路をずらすピクセル数

    for (let i = 0; i < 2; i++) {
      const player = state.players[i];
      const goalY = i === 0 ? 8 : 0;
      const path = getShortestPath(state.walls, player.x, player.y, goalY);

      if (!path || path.length < 2) continue;

      // プレイヤーごとに色とオフセットを設定
      const color = i === 0 ? COLORS.PLAYER1 : COLORS.PLAYER2;
      const offset = i === 0 ? -PATH_OFFSET : PATH_OFFSET;

      p.stroke(color);
      p.strokeWeight(3);
      p.noFill();

      // 経路を線で描画
      p.beginShape();
      for (const point of path) {
        const { px, py } = this.cellCenterToPixel(point.x, point.y);
        p.vertex(px + offset, py + offset);
      }
      p.endShape();

      // 経路上の各点に小さな円を描画
      p.fill(color);
      p.noStroke();
      for (const point of path) {
        const { px, py } = this.cellCenterToPixel(point.x, point.y);
        p.circle(px + offset, py + offset, 8);
      }

      // 距離を表示
      const dist = path.length - 1;
      const startPos = this.cellCenterToPixel(player.x, player.y);
      p.fill(color);
      p.textSize(12);
      p.textAlign(p.CENTER, p.BOTTOM);
      p.text(`${dist}手`, startPos.px + offset, startPos.py - PIECE_RADIUS - 5);
    }
  }

  // 距離マップを描画
  drawDistanceMap(state, playerIndex) {
    const p = this.p;
    const goalY = playerIndex === 0 ? 8 : 0;
    const distanceMap = getDistanceMap(state.walls, goalY);
    const color = playerIndex === 0 ? COLORS.PLAYER1 : COLORS.PLAYER2;

    p.textSize(14);
    p.textAlign(p.CENTER, p.CENTER);

    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const dist = distanceMap[y][x];
        const { px, py } = this.cellCenterToPixel(x, y);

        // 背景に薄い色を付ける（距離に応じて濃淡）
        if (dist >= 0) {
          const alpha = Math.max(30, 150 - dist * 10);
          if (playerIndex === 0) {
            p.fill(231, 76, 60, alpha);  // 赤系
          } else {
            p.fill(52, 152, 219, alpha); // 青系
          }
          p.noStroke();
          p.rect(
            this.offsetX + x * CELL_SIZE + 2,
            this.offsetY + y * CELL_SIZE + 2,
            CELL_SIZE - 4,
            CELL_SIZE - 4
          );
        }

        // 数字を描画
        p.fill(0);
        p.noStroke();
        if (dist === -1) {
          p.text('×', px, py);
        } else {
          p.text(dist, px, py);
        }
      }
    }

    // どのプレイヤーのマップか表示
    p.fill(color);
    p.textSize(14);
    p.textAlign(p.RIGHT, p.TOP);
    p.text(`P${playerIndex + 1}の距離マップ`, this.offsetX + CELL_SIZE * BOARD_SIZE, this.offsetY - 20);
  }

  // 壁評価を描画（Dキー）
  drawWallEvaluations(state) {
    const p = this.p;
    const evaluations = getAllWallEvaluations(state);

    // 短めの壁サイズ
    const SHORT_WALL_LENGTH = CELL_SIZE * 0.7;
    const WALL_OFFSET = 6;  // 縦横壁のずらし量

    for (const ev of evaluations) {
      const { wx, wy, dir, score } = ev;

      // 色を決定
      let color;
      if (score > 0) {
        // 有効（緑）- スコアに応じて濃さを変える
        const intensity = Math.min(255, 100 + score * 50);
        color = p.color(46, intensity, 113, 180);
      } else if (score < 0) {
        // 不利（赤）
        const intensity = Math.min(255, 100 + Math.abs(score) * 50);
        color = p.color(intensity, 46, 46, 180);
      } else {
        // 無効（灰）
        color = p.color(150, 150, 150, 120);
      }

      // 壁交点のピクセル座標
      const cx = this.offsetX + (wx + 1) * CELL_SIZE;
      const cy = this.offsetY + (wy + 1) * CELL_SIZE;

      p.fill(color);
      p.noStroke();

      if (dir === WALL_DIR.VERTICAL) {
        // 縦壁
        p.rect(
          cx - WALL_THICKNESS / 2,
          cy - SHORT_WALL_LENGTH / 2,
          WALL_THICKNESS,
          SHORT_WALL_LENGTH
        );
      } else {
        // 横壁
        p.rect(
          cx - SHORT_WALL_LENGTH / 2,
          cy - WALL_THICKNESS / 2,
          SHORT_WALL_LENGTH,
          WALL_THICKNESS
        );
      }
    }

    // ラベル表示
    const currentPlayer = state.currentPlayer;
    const labelColor = currentPlayer === 0 ? COLORS.PLAYER1 : COLORS.PLAYER2;
    p.fill(labelColor);
    p.textSize(14);
    p.textAlign(p.RIGHT, p.TOP);
    p.text(`P${currentPlayer + 1}視点の壁評価`, this.offsetX + CELL_SIZE * BOARD_SIZE, this.offsetY - 40);
  }

  // 確定距離マップを描画（Fキー）
  drawLockedDistanceMap(state, playerIndex) {
    const p = this.p;
    const lockedMap = getLockedDistanceMap(state, playerIndex);
    const color = playerIndex === 0 ? COLORS.PLAYER1 : COLORS.PLAYER2;

    p.textSize(14);
    p.textAlign(p.CENTER, p.CENTER);

    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const dist = lockedMap[y][x];
        const { px, py } = this.cellCenterToPixel(x, y);

        if (dist >= 0) {
          // 確定マス：濃い色で表示
          if (playerIndex === 0) {
            p.fill(231, 76, 60, 200);  // 赤系
          } else {
            p.fill(52, 152, 219, 200); // 青系
          }
          p.noStroke();
          p.rect(
            this.offsetX + x * CELL_SIZE + 2,
            this.offsetY + y * CELL_SIZE + 2,
            CELL_SIZE - 4,
            CELL_SIZE - 4
          );

          // 数字を描画
          p.fill(255);
          p.text(dist, px, py);
        } else {
          // 未確定マス：薄い背景のみ
          p.fill(200, 200, 200, 50);
          p.noStroke();
          p.rect(
            this.offsetX + x * CELL_SIZE + 2,
            this.offsetY + y * CELL_SIZE + 2,
            CELL_SIZE - 4,
            CELL_SIZE - 4
          );

          p.fill(150);
          p.text('?', px, py);
        }
      }
    }

    // どのプレイヤーのマップか表示
    p.fill(color);
    p.textSize(14);
    p.textAlign(p.RIGHT, p.TOP);
    const opponent = state.players[1 - playerIndex];
    p.text(`P${playerIndex + 1}の確定距離（相手壁:${opponent.wallsLeft}）`, this.offsetX + CELL_SIZE * BOARD_SIZE, this.offsetY - 60);
  }

  // 最適手を描画（Gキー）
  drawBestMove(state) {
    const p = this.p;
    const result = getBestMove(state);

    if (!result.move) return;

    const move = result.move;
    const score = result.score;
    const BEST_MOVE_COLOR = p.color(255, 200, 0, 200);  // 黄色

    if (move.type === 'move') {
      // 移動先マスをハイライト
      const { px, py } = this.cellCenterToPixel(move.x, move.y);

      p.fill(BEST_MOVE_COLOR);
      p.noStroke();
      p.rect(
        this.offsetX + move.x * CELL_SIZE + 4,
        this.offsetY + move.y * CELL_SIZE + 4,
        CELL_SIZE - 8,
        CELL_SIZE - 8,
        8  // 角丸
      );

      // 矢印アイコン
      p.fill(0);
      p.textSize(20);
      p.textAlign(p.CENTER, p.CENTER);
      p.text('→', px, py);

    } else if (move.type === 'wall') {
      // 壁を黄色で表示
      const cx = this.offsetX + (move.wx + 1) * CELL_SIZE;
      const cy = this.offsetY + (move.wy + 1) * CELL_SIZE;

      p.fill(BEST_MOVE_COLOR);
      p.stroke(200, 150, 0);
      p.strokeWeight(2);

      if (move.dir === WALL_DIR.VERTICAL) {
        p.rect(
          cx - WALL_THICKNESS / 2 - 2,
          cy - CELL_SIZE,
          WALL_THICKNESS + 4,
          CELL_SIZE * 2
        );
      } else {
        p.rect(
          cx - CELL_SIZE,
          cy - WALL_THICKNESS / 2 - 2,
          CELL_SIZE * 2,
          WALL_THICKNESS + 4
        );
      }
    }

    // スコア表示
    const currentPlayer = state.currentPlayer;
    const playerColor = currentPlayer === 0 ? COLORS.PLAYER1 : COLORS.PLAYER2;
    p.fill(playerColor);
    p.noStroke();
    p.textSize(14);
    p.textAlign(p.RIGHT, p.TOP);
    const moveTypeText = move.type === 'move' ? '移動' : '壁';
    p.text(`最適手: ${moveTypeText} (スコア: ${score.toFixed(1)})`, this.offsetX + CELL_SIZE * BOARD_SIZE, this.offsetY - 80);
  }
}
