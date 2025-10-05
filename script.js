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
let timeLeft = 30;
let gameInterval;
let bugInterval;

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
  bugInterval = setInterval(spawnBug, 1000);
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
  const x = Math.random() * (playArea.clientWidth - bugType.size);
  const y = Math.random() * (playArea.clientHeight - bugType.size);
  bug.style.left = `${x}px`;
  bug.style.top = `${y}px`;

  // 捕まえたときの処理
  // pointerdown を使って、移動中のタップを確実に検出する。
  // 二重処理を防ぐためにフラグを使う。
  function captureBug(e) {
    // 既に捕まっている場合は無視
    if (bug.dataset.caught) return;
    bug.dataset.caught = "1";

    if (e.preventDefault) e.preventDefault();

    // pointer をキャプチャ（可能なら）して安定させる
    if (e.pointerId && bug.setPointerCapture) {
      try { bug.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }

    clearInterval(moveInterval); // 動きを止める
    score += bugType.score; // 種類に応じたスコアを加算
    updateScore();

    // 効果音を再生
    popSound.currentTime = 0; // 毎回最初から再生
    popSound.play();

    // スコアエフェクト
    showEffect(bug.offsetLeft, bug.offsetTop, bugType.score);

    // バスケットの位置を計算
    const basketRect = basket.getBoundingClientRect();
    const playRect = playArea.getBoundingClientRect();
    const basketX = basketRect.left + basketRect.width / 2 - playRect.left;
    const basketY = basketRect.top + basketRect.height / 2 - playRect.top;

    // かごに飛んでいく
    // 以前は要素作成時に top/left の transition を設定していたため
    // クラスの transition が効かずアニメーションが期待どおり動かないことがある。
    // ここで明示的に inline の transition を上書きして、left/top/transform/opacity を
    // 1s でアニメーションさせる。
    bug.style.transition = 'left 1s ease-in, top 1s ease-in, transform 1s ease-in, opacity 1s ease-in';

    // 読み込み済みのスタイルを確実に反映させる（reflow）
    // これにより次の位置変更でトランジションが有効になる
    /* eslint-disable no-unused-expressions */
    bug.getBoundingClientRect();
    /* eslint-enable no-unused-expressions */

    // イベントリスナーを外して二重発火を防ぐ
    bug.removeEventListener("pointerdown", captureBug);
    bug.removeEventListener("click", captureBug);

    // 位置を変更してクラスを追加すると、上でセットした transition によって
    // left/top と transform/opacity が滑らかに変化する。
    bug.style.left = `${basketX}px`;
    bug.style.top = `${basketY}px`;
    bug.classList.add("fly-to-basket");

    // transitionend を待ってから要素を削除する（堅牢な方法）
    const onTransitionEnd = (ev) => {
      // いずれかのプロパティの遷移が終われば削除する
      if (bug.parentNode) bug.remove();
      bug.removeEventListener('transitionend', onTransitionEnd);
      // pointer capture を解放する（安全のため）
      try {
        if (ev && ev.pointerId && bug.releasePointerCapture) bug.releasePointerCapture(ev.pointerId);
      } catch (err) { /* ignore */ }
    };
    bug.addEventListener('transitionend', onTransitionEnd);
  }

  // pointerdown をまず使い、念のため click もフォールバックで追加
  bug.addEventListener("pointerdown", captureBug, { passive: false });
  bug.addEventListener("click", captureBug);

  playArea.appendChild(bug);

  // 動き回る処理
  const moveInterval = setInterval(() => {
    if (!bug.parentNode) {
      clearInterval(moveInterval);
      return;
    }
    const newX = Math.random() * (playArea.clientWidth - bugType.size);
    const newY = Math.random() * (playArea.clientHeight - bugType.size);
    bug.style.left = `${newX}px`;
    bug.style.top = `${newY}px`;
  }, bugType.speed); // 種類に応じた速度で移動

  // 6秒後に自動で消える
  setTimeout(() => {
    if (bug.parentNode) {
      bug.remove();
      clearInterval(moveInterval);
    }
  }, 6000);
}

// スコアエフェクトを表示
function showEffect(x, y, scoreValue) {
  const effect = document.createElement("div");
  effect.classList.add("effect");
  effect.textContent = `+${scoreValue}`; // スコアを表示
  effect.style.left = x + "px";
  effect.style.top = y + "px";

  playArea.appendChild(effect);

  setTimeout(() => {
    effect.remove();
  }, 1000);
}

function updateScore() {
  scoreDisplay.textContent = "スコア: " + score;
}

function endGame() {
  clearInterval(gameInterval);
  clearInterval(bugInterval);
  playArea.innerHTML = "";

  gameScreen.classList.add("hidden");
  resultScreen.classList.remove("hidden");

  finalScore.textContent = `合計スコアは${score}点でした！`;
}

// スタートボタンが押されたときに再生
startBtn.addEventListener("click", () => {
  if (bgm.paused) {
    bgm.volume = 0.5; // 音量は少し控えめに
    bgm.play().catch(err => console.log("BGM再生エラー:", err));
  }
  startGame();
});

restartBtn.addEventListener("click", startGame);

// サービスワーカーの登録（PWA 向け）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((reg) => console.log('ServiceWorker 登録成功:', reg.scope))
      .catch((err) => console.log('ServiceWorker 登録失敗:', err));
  });
}
