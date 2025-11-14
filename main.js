// Othello (Reversi) - simple implementation
const SIZE = 8;
const boardEl = document.getElementById('board');
const currentPlayerEl = document.getElementById('current-player');
const scoreBlackEl = document.getElementById('score-black');
const scoreWhiteEl = document.getElementById('score-white');
const restartBtn = document.getElementById('restart');
const vsAiCheckbox = document.getElementById('vs-ai');
const messageEl = document.getElementById('message');

let board = [];
let currentPlayer = 1; // 1 = black, -1 = white
let gameOver = false;

const DIRS = [
  [-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]
];

function initBoard(){
  board = Array.from({length:SIZE},()=>Array(SIZE).fill(0));
  const m = SIZE/2 - 1;
  board[m][m] = -1;
  board[m+1][m+1] = -1;
  board[m][m+1] = 1;
  board[m+1][m] = 1;
  currentPlayer = 1;
  gameOver = false;
  render();
}

function inBounds(x,y){return x>=0 && x<SIZE && y>=0 && y<SIZE}

function flipsForMove(x,y,player){
  if(board[x][y]!==0) return [];
  const flips = [];
  for(const [dx,dy] of DIRS){
    const line = [];
    let nx=x+dx, ny=y+dy;
    while(inBounds(nx,ny) && board[nx][ny] === -player){
      line.push([nx,ny]);
      nx += dx; ny += dy;
    }
    if(line.length>0 && inBounds(nx,ny) && board[nx][ny]===player){
      flips.push(...line);
    }
  }
  return flips;
}

function getValidMoves(player){
  const moves = new Map();
  for(let i=0;i<SIZE;i++) for(let j=0;j<SIZE;j++){
    const f = flipsForMove(i,j,player);
    if(f.length>0) moves.set(`${i},${j}`, f);
  }
  return moves;
}

function applyMove(x,y,player){
  const flips = flipsForMove(x,y,player);
  if(flips.length===0) return false;
  board[x][y]=player;
  for(const [i,j] of flips) board[i][j]=player;
  return true;
}

function countScores(){
  let b=0,w=0;
  for(let i=0;i<SIZE;i++) for(let j=0;j<SIZE;j++){
    if(board[i][j]===1) b++;
    if(board[i][j]===-1) w++;
  }
  return {b,w};
}

function render(){
  boardEl.innerHTML='';
  const valid = getValidMoves(currentPlayer);
  for(let i=0;i<SIZE;i++){
    for(let j=0;j<SIZE;j++){
      const cell = document.createElement('div');
      cell.className='cell';
      if(board[i][j]===1){
        const p = document.createElement('div'); p.className='piece black'; cell.appendChild(p);
      } else if(board[i][j]===-1){
        const p = document.createElement('div'); p.className='piece white'; cell.appendChild(p);
      } else if(valid.has(`${i},${j}`)){
        const dot = document.createElement('div'); dot.className='valid-dot'; cell.appendChild(dot);
      } else {
        cell.classList.add('disabled');
      }
      cell.dataset.x = i; cell.dataset.y = j;
      cell.addEventListener('click', onCellClick);
      boardEl.appendChild(cell);
    }
  }
  const s = countScores();
  scoreBlackEl.textContent = s.b;
  scoreWhiteEl.textContent = s.w;
  currentPlayerEl.textContent = currentPlayer===1 ? '黒' : '白';
  messageEl.textContent = '';
}

function onCellClick(e){
  if(gameOver) return;
  const x = Number(e.currentTarget.dataset.x);
  const y = Number(e.currentTarget.dataset.y);
  const ok = applyMove(x,y,currentPlayer);
  if(!ok) return;
  nextTurn();
}

function nextTurn(){
  currentPlayer = -currentPlayer;
  const valid = getValidMoves(currentPlayer);
  if(valid.size===0){
    // opponent has no moves
    currentPlayer = -currentPlayer;
    if(getValidMoves(currentPlayer).size===0){
      // game over
      gameOver = true;
      const s = countScores();
      if(s.b > s.w) messageEl.textContent = `終了 — 黒の勝ち (${s.b} : ${s.w})`;
      else if(s.w > s.b) messageEl.textContent = `終了 — 白の勝ち (${s.b} : ${s.w})`;
      else messageEl.textContent = `終了 — 引き分け (${s.b} : ${s.w})`;
      render();
      return;
    } else {
      messageEl.textContent = '相手に打つ手がありません。もう一度あなたの番です。';
    }
  }
  render();
  if(!gameOver && vsAiCheckbox.checked && currentPlayer===-1){
    // AI move (simple: choose move with max flips)
    setTimeout(() => aiMove(), 300);
  }
}

function aiMove(){
  // Use minimax with alpha-beta to select the best move
  const DEPTH = 4; // changeable: deeper -> stronger but slower
  const res = minimax(board, -1, DEPTH, -Infinity, Infinity);
  if(!res || !res.move){ nextTurn(); return; }
  const [x,y] = res.move;
  applyMove(x,y,-1);
  nextTurn();
}

// --- Stronger AI helpers: board simulation, evaluation, minimax ---
function cloneBoard(b){
  return b.map(row => row.slice());
}

function flipsForMoveOnBoard(b, x, y, player){
  if(b[x][y]!==0) return [];
  const flips = [];
  for(const [dx,dy] of DIRS){
    const line = [];
    let nx=x+dx, ny=y+dy;
    while(inBounds(nx,ny) && b[nx][ny] === -player){
      line.push([nx,ny]);
      nx += dx; ny += dy;
    }
    if(line.length>0 && inBounds(nx,ny) && b[nx][ny]===player){
      flips.push(...line);
    }
  }
  return flips;
}

function getValidMovesOnBoard(b, player){
  const moves = new Map();
  for(let i=0;i<SIZE;i++) for(let j=0;j<SIZE;j++){
    const f = flipsForMoveOnBoard(b,i,j,player);
    if(f.length>0) moves.set(`${i},${j}`, f);
  }
  return moves;
}

function applyMoveOnBoard(b, x, y, player){
  const flips = flipsForMoveOnBoard(b, x, y, player);
  if(flips.length===0) return false;
  b[x][y] = player;
  for(const [i,j] of flips) b[i][j] = player;
  return true;
}

// Positional weights (common Othello weight matrix)
const WEIGHTS = [
  [120, -20, 20, 5, 5, 20, -20, 120],
  [-20, -40, -5, -5, -5, -5, -40, -20],
  [20, -5, 15, 3, 3, 15, -5, 20],
  [5, -5, 3, 3, 3, 3, -5, 5],
  [5, -5, 3, 3, 3, 3, -5, 5],
  [20, -5, 15, 3, 3, 15, -5, 20],
  [-20, -40, -5, -5, -5, -5, -40, -20],
  [120, -20, 20, 5, 5, 20, -20, 120]
];

function evaluateBoard(b, player){
  // Evaluate from perspective of 'player' (1 or -1)
  let score = 0;
  let discs = 0;
  for(let i=0;i<SIZE;i++){
    for(let j=0;j<SIZE;j++){
      if(b[i][j]===player){ score += WEIGHTS[i][j]; discs++; }
      else if(b[i][j]===-player){ score -= WEIGHTS[i][j]; discs--; }
    }
  }
  // Mobility: number of moves for player - opponent
  const myMoves = getValidMovesOnBoard(b, player).size;
  const oppMoves = getValidMovesOnBoard(b, -player).size;
  let mobility = 0;
  if(myMoves + oppMoves !== 0) mobility = 100 * (myMoves - oppMoves) / (myMoves + oppMoves);

  // Disk difference (normalized)
  let diskDiff = 0;
  const totalDiscs = Math.abs(discs);
  if(totalDiscs>0) diskDiff = 100 * (discs) / (SIZE*SIZE);

  // Combine heuristics (weights tuned for reasonable play)
  return score * 1 + mobility * 2 + diskDiff * 0.5;
}

function minimax(b, player, depth, alpha, beta){
  // returns {score, move: [x,y]}
  if(depth===0){
    return {score: evaluateBoard(b, player)};
  }
  const moves = Array.from(getValidMovesOnBoard(b, player).keys());
  if(moves.length===0){
    // pass or game end
    const oppMoves = getValidMovesOnBoard(b, -player).size;
    if(oppMoves===0){
      // game over: final score
      const s = countScores();
      const final = (s.b - s.w) * (player===1 ? 1 : -1);
      return {score: final * 1000};
    }
    // pass turn
    const r = minimax(b, -player, depth-1, alpha, beta);
    return {score: -r.score};
  }

  let bestMove = null;
  let bestScore = -Infinity;
  for(const key of moves){
    const [x,y] = key.split(',').map(Number);
    const nb = cloneBoard(b);
    applyMoveOnBoard(nb, x, y, player);
    const r = minimax(nb, -player, depth-1, -beta, -alpha);
    const score = -r.score;
    if(score > bestScore){ bestScore = score; bestMove = [x,y]; }
    alpha = Math.max(alpha, score);
    if(alpha >= beta) break; // beta cutoff
  }
  return {score: bestScore, move: bestMove};
}

restartBtn.addEventListener('click', ()=>{
  initBoard();
});

vsAiCheckbox.addEventListener('change', ()=>{
  // if AI turned on and it's white turn, let AI move
  render();
  if(vsAiCheckbox.checked && currentPlayer===-1 && !gameOver){
    setTimeout(()=>aiMove(),150);
  }
});

initBoard();
