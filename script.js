const startBtn = document.getElementById("start-btn");
const restartBtn = document.getElementById("restart-btn");

const titleScreen = document.getElementById("title-screen");
const gameScreen = document.getElementById("game-screen");
const resultScreen = document.getElementById("result-screen");

const playArea = document.getElementById("play-area");
const timeDisplay = document.getElementById("time");
const scoreDisplay = document.getElementById("score");
const finalScore = document.getElementById("final-score");

let score = 0;
let score1 = 0;
let score2 = 0;
let timeLeft = 30;
let gameInterval;
let bugInterval;
let mode = 'single'; // 'single' or 'two'
let spawnToggle = false; // for alternating spawn in two-player mode

// 虫の種類を定義
const bugTypes = [
  { emoji: "🐞", size: 50, speed: 2500, score: 1 }, // てんとう虫: 標準
  { emoji: "🦋", size: 60, speed: 3000, score: 2 }, // 蝶: 大きい、遅い
  { emoji: "🐜", size: 40, speed: 2000, score: 3 }, // アリ: 小さい、速い
  { emoji: "🪲", size: 55, speed: 2800, score: 2 }, // カブトムシ: やや大きい
  { emoji: "🐝", size: 45, speed: 1500, score: 5 }, // ハチ: 小さい、非常に速い
];

function startGame() {
  score = 0;
  score1 = 0;
  score2 = 0;
  timeLeft = 30;
  updateScore();
  timeDisplay.textContent = "じかん: " + timeLeft;

  titleScreen.classList.add("hidden");
  resultScreen.classList.add("hidden");
  gameScreen.classList.remove("hidden");

  // タイマー開始
  gameInterval = setInterval(() => {
    timeLeft--;
    timeDisplay.textContent = "じかん: " + timeLeft;
    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);

  // 虫を定期的に出す
  bugInterval = setInterval(() => spawnBug(), 1000);
}

const basket = document.getElementById("basket");
const popSound = document.getElementById("pop-sound");
const bgm = document.getElementById("bgm");

function spawnBug() {
  // ランダムな種類の虫を選択
  const bugType = bugTypes[Math.floor(Math.random() * bugTypes.length)];

  const bug = document.createElement("div");
  bug.classList.add("bug");
  bug.textContent = bugType.emoji;
  bug.style.fontSize = `${bugType.size}px`; // サイズを設定
  bug.style.transition = `top ${bugType.speed / 1000}s linear, left ${bugType.speed / 1000}s linear`; // 動きを滑らかに

  // 初期位置
  let x, y;
  if (mode === 'two') {
    // 交互にどちらのプレイヤー領域に出るか決める
    const half = spawnToggle ? 'top' : 'bottom';
    spawnToggle = !spawnToggle;
    if (half === 'top') {
      x = Math.random() * (playArea.clientWidth - bugType.size);
      y = Math.random() * (playArea.clientHeight / 2 - bugType.size);
    } else {
      x = Math.random() * (playArea.clientWidth - bugType.size);
      y = Math.random() * (playArea.clientHeight / 2 - bugType.size) + playArea.clientHeight / 2;
    }
    bug.dataset.half = half;
  } else {
    x = Math.random() * (playArea.clientWidth - bugType.size);
    y = Math.random() * (playArea.clientHeight - bugType.size);
  }
  bug.style.left = `${x}px`;
  bug.style.top = `${y}px`;

  // append all bugs to playArea so they can move across the middle line
  playArea.appendChild(bug);

  // 動き回る処理
  const moveInterval = setInterval(() => {
    if (!bug.parentNode) {
      clearInterval(moveInterval);
      return;
    }
    // position changes keep bug moving across whole play area (can cross halves)
    const newX = Math.random() * (playArea.clientWidth - bugType.size);
    const newY = Math.random() * (playArea.clientHeight - bugType.size);
    bug.style.left = `${newX}px`;
    bug.style.top = `${newY}px`;
    // determine if bug is in bottom half now; if crossing, reparent into proper container
    if (mode === 'two') {
      const centerY = newY + bugType.size / 2;
      const halfLine = playArea.clientHeight / 2;
      const currentParent = bug.parentElement;
      if (centerY > halfLine) {
        const target = document.getElementById('player2-area');
        if (currentParent !== target) {
          // compute global position
          const rect = bug.getBoundingClientRect();
          // move element into target and preserve visual position
          target.appendChild(bug);
          const parentRect = target.getBoundingClientRect();
          bug.style.left = `${rect.left - parentRect.left}px`;
          bug.style.top = `${rect.top - parentRect.top}px`;
        }
      } else {
        const target = document.getElementById('player1-area');
        if (currentParent !== target) {
          const rect = bug.getBoundingClientRect();
          target.appendChild(bug);
          const parentRect = target.getBoundingClientRect();
          bug.style.left = `${rect.left - parentRect.left}px`;
          bug.style.top = `${rect.top - parentRect.top}px`;
        }
      }
    }
  }, bugType.speed); // 種類に応じた速度で移動
  // expose for delegated handler
  bug._moveInterval = moveInterval;
  bug.dataset.score = bugType.score;
  bug.dataset.speed = bugType.speed;
  bug.dataset.size = bugType.size;

  // 6秒後に自動で消える
  setTimeout(() => {
    if (bug.parentNode) {
      bug.remove();
      clearInterval(moveInterval);
    }
  }, 6000);
}

// Delegated pointer handling to allow simultaneous multi-touch
const activePointers = new Set();

function handlePointerDown(e) {
  // track pointer
  activePointers.add(e.pointerId);
  // show a quick touch-dot for feedback
  const dot = document.createElement('div');
  dot.className = 'touch-dot';
  dot.style.left = (e.clientX - 12) + 'px';
  dot.style.top = (e.clientY - 12) + 'px';
  document.body.appendChild(dot);
  setTimeout(() => dot.remove(), 300);
  // find the topmost bug under the pointer
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (!el) return;
  const bug = el.closest('.bug');
  if (!bug) return;

  // if already caught, ignore
  if (bug.dataset.caught) return;

  // emulate the previous capture logic for this bug
  bug.dataset.caught = '1';
  // stop its move interval if present (we stored moveInterval on element)
  try { if (bug._moveInterval) clearInterval(bug._moveInterval); } catch (err) {}

  // find bugType score by reading font size or dataset if available
  const scoreValue = parseInt(bug.dataset.score || '1', 10);

  // assign score based on where the pointer is (tap location), not spawn location
  const playRectMain = playArea.getBoundingClientRect();
  let targetPlayer = 'single';
  if (mode === 'two') {
    const relativeY = e.clientY - playRectMain.top;
    if (relativeY < playRectMain.height / 2) { score1 += scoreValue; targetPlayer = 'top'; }
    else { score2 += scoreValue; targetPlayer = 'bottom'; }
  } else {
    score += scoreValue;
  }
  updateScore();

  // play sound and show effect
  popSound.currentTime = 0;
  popSound.play();
  // compute global center of bug for effect
  const bugRect = bug.getBoundingClientRect();
  const bugCenterX = bugRect.left + bugRect.width / 2;
  const bugCenterY = bugRect.top + bugRect.height / 2;
  showEffect(bugCenterX, bugCenterY, scoreValue);

  // animate to basket (choose basket position depending on mode and half)
  const playRect = playArea.getBoundingClientRect();
  let basketX, basketY;
  // Choose basket based on where the user tapped (targetPlayer), not spawn half
  let basketEl;
  if (mode === 'two') {
    basketEl = (targetPlayer === 'top') ? document.getElementById('basket1') : document.getElementById('basket2');
  } else {
    basketEl = basket;
  }
  const basketRect = basketEl.getBoundingClientRect();
  basketX = basketRect.left + basketRect.width/2 - playRect.left;
  basketY = basketRect.top + basketRect.height/2 - playRect.top;

  // animate faster for small/fast bugs (speed is in ms); scale animation combined
  const bSpeed = parseInt(bug.dataset.speed || '1500', 10);
  const duration = Math.max(600, 1200 - (bSpeed / 2));
  bug.style.transition = `left ${duration}ms ease-in, top ${duration}ms ease-in, transform ${duration}ms ease-in, opacity ${duration}ms ease-in`;
  bug.getBoundingClientRect();
  // place bug relative to playArea; if bug is inside a player-area we need to
  // transform coordinates to that container's coordinate space
  const parentRect = bug.parentElement.getBoundingClientRect();
  const relX = basketX + playRect.left - parentRect.left;
  const relY = basketY + playRect.top - parentRect.top;
  bug.style.left = `${relX}px`;
  bug.style.top = `${relY}px`;
  // combine rotation+scale for a nicer fly effect
  bug.style.transform = 'translateZ(0) scale(0.6) rotate(0deg)';
  // apply final transform at end via CSS class
  bug.classList.add('fly-to-basket');
  const onTransitionEnd = () => { if (bug.parentNode) bug.remove(); bug.removeEventListener('transitionend', onTransitionEnd); };
  bug.addEventListener('transitionend', onTransitionEnd);
}

function handlePointerUp(e) {
  activePointers.delete(e.pointerId);
}

playArea.addEventListener('pointerdown', handlePointerDown, { passive: false });
playArea.addEventListener('pointerup', handlePointerUp);
playArea.addEventListener('pointercancel', handlePointerUp);

// スコアエフェクトを表示
function showEffect(x, y, scoreValue) {
  const effect = document.createElement("div");
  effect.classList.add("effect");
  effect.textContent = `+${scoreValue}`; // スコアを表示
  // position relative to playArea
  const playRect = playArea.getBoundingClientRect();
  effect.style.left = (x - playRect.left) + "px";
  effect.style.top = (y - playRect.top) + "px";

  playArea.appendChild(effect);
  // add a quick scale animation
  effect.style.animation = 'effectScale 700ms ease-out forwards';

  setTimeout(() => {
    effect.remove();
  }, 700);
}

function updateScore() {
  if (mode === 'two') {
    const s1 = document.getElementById('score1');
    const s2 = document.getElementById('score2');
    if (s1) s1.textContent = `プレイヤー1: ${score1}`;
    if (s2) s2.textContent = `プレイヤー2: ${score2}`;
  } else {
    // single mode: use scoreDisplay if exists, otherwise reuse score1 element
    if (scoreDisplay) scoreDisplay.textContent = "スコア: " + score;
    else {
      const s1 = document.getElementById('score1');
      if (s1) s1.textContent = `スコア: ${score}`;
    }
  }
}

function endGame() {
  clearInterval(gameInterval);
  clearInterval(bugInterval);
  // keep player area containers, remove only bug/effect elements
  Array.from(playArea.children).forEach(child => {
    if (!child.classList.contains('player-area')) child.remove();
  });

  gameScreen.classList.add("hidden");
  resultScreen.classList.remove("hidden");

  if (mode === 'two') {
    finalScore.textContent = `プレイヤー1: ${score1} / プレイヤー2: ${score2}`;
    // show two-player restart option visually (handled by buttons already present)
  } else {
    finalScore.textContent = `合計スコアは${score}点でした！`;
  }
}

// スタートボタンが押されたときに再生
// Start buttons (single / two)
const startSingleBtn = document.getElementById('start-single');
const startTwoBtn = document.getElementById('start-two');
const restartSingleBtn = document.getElementById('restart-single');
const restartTwoBtn = document.getElementById('restart-two');

function startSingle() {
  mode = 'single';
  document.body.classList.remove('mode-two');
  document.body.classList.add('mode-single');
  document.getElementById('basket1').style.display = 'none';
  document.getElementById('basket2').style.display = 'none';
  if (bgm.paused) {
    bgm.volume = 0.5; // 音量は少し控えめに
    bgm.play().catch(err => console.log("BGM再生エラー:", err));
  }
  startGame();
}

function startTwo() {
  mode = 'two';
  document.body.classList.remove('mode-single');
  document.body.classList.add('mode-two');
  document.getElementById('basket').style.display = 'none';
  document.getElementById('basket1').style.display = '';
  document.getElementById('basket2').style.display = '';
  if (bgm.paused) {
    bgm.volume = 0.5; // 音量は少し控えめに
    bgm.play().catch(err => console.log("BGM再生エラー:", err));
  }
  startGame();
}

if (startSingleBtn) startSingleBtn.addEventListener('click', startSingle);
if (startTwoBtn) startTwoBtn.addEventListener('click', startTwo);
if (restartSingleBtn) restartSingleBtn.addEventListener('click', () => { mode = 'single'; startGame(); });
if (restartTwoBtn) restartTwoBtn.addEventListener('click', () => { mode = 'two'; startGame(); });

// サービスワーカーの登録（PWA 向け）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then((reg) => console.log('ServiceWorker 登録成功:', reg.scope))
      .catch((err) => console.log('ServiceWorker 登録失敗:', err));
  });
}
