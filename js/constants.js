// 盤面サイズ
const BOARD_SIZE = 9;        // 9×9マス
const WALL_GRID_SIZE = 8;    // 8×8壁交点

// 描画サイズ（ピクセル）
const CELL_SIZE = 50;        // 1マスのサイズ
const WALL_THICKNESS = 8;    // 壁の太さ
const PIECE_RADIUS = 20;     // 駒の半径
const MARKER_RADIUS = 12;    // 移動マーカーの半径
const MARKER_HOVER_RADIUS = 18; // ホバー時のマーカー半径

// 色
const COLORS = {
  BOARD_BG: '#f5deb3',       // 盤面背景
  BOARD_LINE: '#8b4513',     // 盤面の線
  PLAYER1: '#e74c3c',        // プレイヤー1（赤）
  PLAYER2: '#3498db',        // プレイヤー2（青）
  WALL: '#2c3e50',           // 壁
  WALL_PREVIEW: 'rgba(44, 62, 80, 0.4)', // 壁プレビュー
  WALL_HOVER_DELETE: '#e74c3c', // 削除予定の壁（赤）
  MARKER: 'rgba(46, 204, 113, 0.6)',     // 移動マーカー
  MARKER_HOVER: 'rgba(46, 204, 113, 0.9)' // ホバー時マーカー
};

// 壁の向き
const WALL_DIR = {
  NONE: 0,
  VERTICAL: 1,
  HORIZONTAL: 2
};

// 壁判定の閾値（ピクセル）
const WALL_HOVER_THRESHOLD = 30;
