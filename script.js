const canvas = document.getElementById("pongCanvas");
const ctx = canvas.getContext("2d");

const playerScoreEl = document.getElementById("playerScore");
const computerScoreEl = document.getElementById("computerScore");
const playerWinsEl = document.getElementById("playerWins");
const computerWinsEl = document.getElementById("computerWins");
const matchStatusEl = document.getElementById("matchStatus");
const roundCounterEl = document.getElementById("roundCounter");
const difficultyDisplayEl = document.getElementById("difficultyDisplay");
const ballSpeedDisplayEl = document.getElementById("ballSpeedDisplay");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");
const newGameBtn = document.getElementById("newGameBtn");
const nextRoundBtn = document.getElementById("nextRoundBtn");
const gameOverlay = document.getElementById("gameOverlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayMessage = document.getElementById("overlayMessage");

const soundToggle = document.getElementById("soundToggle");
const sensitivitySlider = document.getElementById("sensitivitySlider");
const sensitivityValue = document.getElementById("sensitivityValue");
const speedMultiplierInput = document.getElementById("speedMultiplier");
const speedMultiplierValue = document.getElementById("speedMultiplierValue");
const particlesToggle = document.getElementById("particlesToggle");
const trailToggle = document.getElementById("trailToggle");
const difficultyButtons = document.querySelectorAll(".difficulty-btn");

const menuButtons = document.querySelectorAll(".menu-btn");
const screens = document.querySelectorAll(".screen");

const startScreen = document.getElementById("startScreen");
const startBtn = document.getElementById("startBtn");
const modeButtons = document.querySelectorAll("[data-mode]");
const difficultyMenuButtons = document.querySelectorAll("[data-difficulty]");

const touchUpBtn = document.getElementById("touchUp");
const touchDownBtn = document.getElementById("touchDown");
const soundToggleMenu = document.getElementById("soundToggleMenu");

const paddleWidth = 12;
const paddleHeight = 100;
const ballRadius = 8;
const basePlayerHeight = paddleHeight;

const player = {
  x: 20,
  y: canvas.height / 2 - paddleHeight / 2,
  width: paddleWidth,
  height: paddleHeight,
  speed: 7,
  color: "#00d4ff"
};

const computer = {
  x: canvas.width - paddleWidth - 20,
  y: canvas.height / 2 - paddleHeight / 2,
  width: paddleWidth,
  height: paddleHeight,
  speed: 5,
  color: "#ffd700"
};

const rightPlayer = {
  x: canvas.width - 20 - paddleWidth,
  y: canvas.height / 2 - paddleHeight / 2,
  width: paddleWidth,
  height: paddleHeight,
  speed: 7,
  color: "#ffd700"
};

const ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: ballRadius,
  dx: 4,
  dy: 4,
  speed: 4,
  trail: []
};

const settings = {
  difficulty: "normal",
  soundEnabled: true,
  sensitivity: 5,
  speedMultiplier: 1,
  particlesEnabled: true,
  trailEnabled: true
};

const gameMode = {
  mode: "single"
};

const difficultyMap = {
  easy: { computerSpeed: 4, reaction: 0.08, accuracy: 0.7 },
  normal: { computerSpeed: 5.2, reaction: 0.12, accuracy: 0.85 },
  hard: { computerSpeed: 6.5, reaction: 0.16, accuracy: 0.95 },
  impossible: { computerSpeed: 8, reaction: 0.2, accuracy: 1 }
};

const state = {
  playerScore: 0,
  computerScore: 0,
  playerRoundWins: 0,
  computerRoundWins: 0,
  isPaused: false,
  round: 1,
  matchOver: false,
  rally: 0,
  maxRally: 0,
  totalRallies: 0
};

const roundCountdown = {
  active: false,
  value: 3,
  timer: 0
};

const centerBanner = {
  text: "",
  visible: false,
  timer: 0
};

const activeEffects = {
  slow: 0,
  boost: 0,
  stretch: 0
};

const keys = {};
let mouseY = canvas.height / 2;
let particles = [];
let powerUps = [];
let gameStarted = false;
let touchMoveState = {
  up: false,
  down: false
};

const savedSettingsKey = "pongGameSettings";

function getDefaultSettings() {
  return {
    difficulty: "normal",
    soundEnabled: true,
    mode: "single"
  };
}

function loadSettings() {
  const saved = localStorage.getItem(savedSettingsKey);
  if (!saved) return getDefaultSettings();
  try {
    return { ...getDefaultSettings(), ...JSON.parse(saved) };
  } catch {
    return getDefaultSettings();
  }
}

function saveSettings() {
  const settingsToSave = {
    difficulty: settings.difficulty,
    soundEnabled: settings.soundEnabled,
    mode: gameMode.mode
  };
  localStorage.setItem(savedSettingsKey, JSON.stringify(settingsToSave));
}

function applySavedSettings() {
  const saved = loadSettings();
  settings.difficulty = saved.difficulty || "normal";
  settings.soundEnabled = saved.soundEnabled !== false;
  gameMode.mode = saved.mode || "single";

  difficultyButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.difficulty === settings.difficulty);
  });

  const modeButton = document.querySelector(`[data-mode="${gameMode.mode}"]`);
  if (modeButton) {
    document.querySelectorAll("[data-mode]").forEach((btn) => btn.classList.remove("mode-btn-active"));
    modeButton.classList.add("mode-btn-active");
  }

  if (soundToggleMenu) soundToggleMenu.checked = settings.soundEnabled;
  if (soundToggle) soundToggle.checked = settings.soundEnabled;
  setDifficulty(settings.difficulty);
  updateScoreboard();
}

function switchScreen(screenId) {
  screens.forEach((screen) => screen.classList.remove("active"));
  const target = document.getElementById(screenId);
  if (target) target.classList.add("active");
}

menuButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetScreen = btn.dataset.screen + "-screen";
    switchScreen(targetScreen);
    menuButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  });
});

function updateDifficultyDisplay() {
  const label = settings.difficulty.charAt(0).toUpperCase() + settings.difficulty.slice(1);
  if (difficultyDisplayEl) difficultyDisplayEl.textContent = label;
  computer.speed = difficultyMap[settings.difficulty].computerSpeed;
}

function updateBallSpeedDisplay() {
  const speed = Math.round(Math.hypot(ball.dx, ball.dy));
  if (ballSpeedDisplayEl) ballSpeedDisplayEl.textContent = String(speed);
}

function updateMatchStatus() {
  if (state.matchOver) {
    matchStatusEl.textContent = state.playerRoundWins >= 4 ? "🏆 Player Victory!" : "🤖 Computer Victory!";
    return;
  }

  if (state.isPaused) {
    matchStatusEl.textContent = "⏸️ Paused";
  } else if (state.playerScore === 0 && state.computerScore === 0) {
    matchStatusEl.textContent = "Ready!";
  } else {
    matchStatusEl.textContent = `${state.playerScore} - ${state.computerScore}`;
  }
}

function updateScoreboard() {
  playerScoreEl.textContent = state.playerScore;
  computerScoreEl.textContent = state.computerScore;
  playerWinsEl.textContent = state.playerRoundWins;
  computerWinsEl.textContent = state.computerRoundWins;
  roundCounterEl.textContent = state.round;
  updateMatchStatus();
  updateBallSpeedDisplay();
}

function setDifficulty(level) {
  settings.difficulty = level;
  difficultyButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.difficulty === level);
  });
  updateDifficultyDisplay();
}

function applyMenuSelection() {
  const selectedDifficulty = document.querySelector("[data-difficulty].active")?.dataset.difficulty || "normal";
  const selectedMode = document.querySelector("[data-mode].mode-btn-active")?.dataset.mode || "single";

  setDifficulty(selectedDifficulty);
  gameMode.mode = selectedMode;
}

if (difficultyMenuButtons.length > 0) {
  difficultyMenuButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      difficultyMenuButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      applyMenuSelection();
    });
  });
}

if (modeButtons.length > 0) {
  modeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      modeButtons.forEach((b) => b.classList.remove("mode-btn-active"));
      btn.classList.add("mode-btn-active");
      gameMode.mode = btn.dataset.mode;
      applyMenuSelection();
      saveSettings();
    });
  });
}

function resetBall() {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;

  const angle = (Math.random() - 0.5) * 1.2;
  const base = 4 * settings.speedMultiplier;
  ball.dx = (Math.random() > 0.5 ? 1 : -1) * base * Math.cos(angle);
  ball.dy = base * Math.sin(angle);
  ball.trail = [];
}

function startRoundCountdown() {
  roundCountdown.active = true;
  roundCountdown.value = 3;
  roundCountdown.timer = 0;
  state.isPaused = true;
  matchStatusEl.textContent = "3";
  matchStatusEl.style.color = "#ffd166";
}

function updateRoundCountdown() {
  if (!roundCountdown.active) return;

  roundCountdown.timer += 1;

  if (roundCountdown.timer >= 60) {
    roundCountdown.timer = 0;
    roundCountdown.value -= 1;

    if (roundCountdown.value > 0) {
      matchStatusEl.textContent = String(roundCountdown.value);
    } else {
      matchStatusEl.textContent = "GO!";
      matchStatusEl.style.color = "#5cf2b7";
      roundCountdown.active = false;
      state.isPaused = false;
      setTimeout(() => {
        matchStatusEl.textContent = "Playing";
        matchStatusEl.style.color = "#5cf2b7";
      }, 500);
    }
  }
}

function showCenterBanner(text, duration = 90) {
  centerBanner.text = text;
  centerBanner.visible = true;
  centerBanner.timer = duration;
}

function updateCenterBanner() {
  if (!centerBanner.visible) return;
  centerBanner.timer -= 1;
  if (centerBanner.timer <= 0) {
    centerBanner.visible = false;
  }
}

function resetRound() {
  state.playerScore = 0;
  state.computerScore = 0;
  state.isPaused = false;
  state.rally = 0;
  resetBall();
  pauseBtn.textContent = "⏸️ Pause";
  gameOverlay.classList.remove("show");
  updateScoreboard();
  startRoundCountdown();
  showCenterBanner("Round " + state.round, 60);
}

function resetGame() {
  state.playerRoundWins = 0;
  state.computerRoundWins = 0;
  state.round = 1;
  state.matchOver = false;
  nextRoundBtn.textContent = "Next Round";
  resetRound();
  updateScoreboard();
  resetPowerEffects();
}

function togglePause() {
  if (state.matchOver) return;
  state.isPaused = !state.isPaused;
  pauseBtn.textContent = state.isPaused ? "▶️ Resume" : "⏸️ Pause";
  updateMatchStatus();
}

function showStartScreen() {
  startScreen.classList.add("active");
  gameStarted = false;
  state.isPaused = true;
}

function hideStartScreen() {
  startScreen.classList.remove("active");
  gameStarted = true;
  state.isPaused = false;
  applyMenuSelection();
  saveSettings();
}

if (startBtn) startBtn.addEventListener("click", hideStartScreen);

function handlePlayerMovement() {
  if (keys["ArrowUp"] || keys["w"]) {
    player.y -= player.speed;
  }
  if (keys["ArrowDown"] || keys["s"]) {
    player.y += player.speed;
  }

  const target = mouseY - player.height / 2;
  player.y += (target - player.y) * 0.18;

  player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
}

function handleTouchControls() {
  if (touchMoveState.up) {
    player.y -= player.speed;
  }
  if (touchMoveState.down) {
    player.y += player.speed;
  }
  player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
}

function handleRightPlayerMovement() {
  if (gameMode.mode === "single") {
    handleComputerMovement();
    return;
  }

  if (keys["i"] || keys["I"]) {
    rightPlayer.y -= rightPlayer.speed;
  }
  if (keys["k"] || keys["K"]) {
    rightPlayer.y += rightPlayer.speed;
  }

  rightPlayer.y = Math.max(0, Math.min(canvas.height - rightPlayer.height, rightPlayer.y));
}

function handleComputerMovement() {
  const difficulty = difficultyMap[settings.difficulty];
  const targetY = ball.y - computer.height / 2;
  const difference = targetY - computer.y;

  if (Math.abs(difference) > 1) {
    if (Math.random() > difficulty.accuracy) {
      computer.y += difference * difficulty.reaction * (Math.random() * 0.6 + 0.7);
    } else {
      computer.y += difference * difficulty.reaction;
    }
  }

  computer.y = Math.max(0, Math.min(canvas.height - computer.height, computer.y));
}

function createParticles(x, y, color) {
  if (!settings.particlesEnabled) return;

  for (let i = 0; i < 8; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 7,
      vy: (Math.random() - 0.5) * 7,
      life: 1,
      color
    });
  }
}

function playTone(type) {
  if (!settings.soundEnabled) return;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  try {
    const audioContext = new AudioCtx();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = type === "hit" ? "sine" : type === "wall" ? "square" : "triangle";
    oscillator.frequency.value = type === "score" ? 600 : type === "win" ? 800 : type === "hit" ? 440 : 350;

    gainNode.gain.setValueAtTime(0.12, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.15);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.15);
  } catch (e) {
    // Audio context not available
  }
}

function updateBall() {
  if (state.isPaused) return;

  ball.x += ball.dx;
  ball.y += ball.dy;

  if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= canvas.height) {
    ball.dy *= -1;
    ball.y = Math.max(ball.radius, Math.min(canvas.height - ball.radius, ball.y));
    playTone("wall");
    createParticles(ball.x, ball.y, "#00d4ff");
  }

  updateBallCollisions();
}

function updateBallCollisions() {
  const playerHit =
    ball.x - ball.radius <= player.x + player.width &&
    ball.y >= player.y &&
    ball.y <= player.y + player.height &&
    ball.dx < 0;

  const rightPaddle = gameMode.mode === "single" ? computer : rightPlayer;

  const computerHit =
    ball.x + ball.radius >= rightPaddle.x &&
    ball.y >= rightPaddle.y &&
    ball.y <= rightPaddle.y + rightPaddle.height &&
    ball.dx > 0;

  if (playerHit) {
    const hitRatio = (ball.y - (player.y + player.height / 2)) / (player.height / 2);
    ball.dx = Math.abs(ball.dx) + 0.4;
    ball.dy = hitRatio * 7;
    ball.x = player.x + player.width + ball.radius;
    state.rally += 1;
    state.maxRally = Math.max(state.maxRally, state.rally);
    playTone("hit");
    createParticles(ball.x, ball.y, "#00d4ff");
  }

  if (computerHit) {
    const hitRatio = (ball.y - (rightPaddle.y + rightPaddle.height / 2)) / (rightPaddle.height / 2);
    ball.dx = -Math.abs(ball.dx) - 0.4;
    ball.dy = hitRatio * 7;
    ball.x = rightPaddle.x - ball.radius;
    state.rally += 1;
    state.maxRally = Math.max(state.maxRally, state.rally);
    playTone("hit");
    createParticles(ball.x, ball.y, "#ffd700");
  }

  if (ball.x + ball.radius < 0) {
    state.computerScore += 1;
    state.rally = 0;
    playTone("score");
    createParticles(ball.x, ball.y, "#ffd700");
    if (state.computerScore >= 5) {
      endRound("Computer");
    } else {
      resetBall();
    }
  }

  if (ball.x - ball.radius > canvas.width) {
    state.playerScore += 1;
    state.rally = 0;
    playTone("score");
    createParticles(ball.x, ball.y, "#00d4ff");
    if (state.playerScore >= 5) {
      endRound("Player");
    } else {
      resetBall();
    }
  }

  updateScoreboard();
}

function flashScore(winner) {
  const flash = document.createElement("div");
  flash.className = "score-flash";
  flash.textContent = winner === "Player" ? "Player +1" : "Computer +1";
  flash.style.color = winner === "Player" ? "#67e8f9" : "#fbbf24";
  canvas.parentElement.appendChild(flash);

  setTimeout(() => {
    flash.remove();
  }, 700);
}

function endRound(winner) {
  state.matchOver = true;
  state.isPaused = true;
  pauseBtn.textContent = "▶️ Resume";

  if (winner === "Player") {
    state.playerRoundWins += 1;
  } else {
    state.computerRoundWins += 1;
  }

  flashScore(winner);

  if (state.playerRoundWins >= 4 || state.computerRoundWins >= 4) {
    overlayTitle.textContent = `${winner} Wins the Match!`;
    overlayMessage.textContent = "Final score: " + state.playerRoundWins + " - " + state.computerRoundWins;
    nextRoundBtn.textContent = "Play Again";
  } else {
    overlayTitle.textContent = `${winner} Wins the Round!`;
    overlayMessage.textContent = "Best of 7 match";
    nextRoundBtn.textContent = "Next Round";
    state.round += 1;
  }

  gameOverlay.classList.add("show");
  playTone("win");
}

function spawnPowerUp() {
  if (powerUps.length > 0) return;
  if (Math.random() < 0.016) {
    const types = ["slow", "boost", "stretch"];
    const type = types[Math.floor(Math.random() * types.length)];
    powerUps.push({
      x: 120 + Math.random() * (canvas.width - 240),
      y: 60 + Math.random() * (canvas.height - 120),
      radius: 16,
      type,
      color:
        type === "slow" ? "#7c3aed" :
        type === "boost" ? "#22c55e" :
        "#f59e0b"
    });
  }
}

function updatePowerUps() {
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const powerUp = powerUps[i];

    powerUp.y += 1.5;

    if (powerUp.y + powerUp.radius > canvas.height || powerUp.y - powerUp.radius < 0) {
      powerUps.splice(i, 1);
      continue;
    }

    const playerHit =
      powerUp.x + powerUp.radius > player.x &&
      powerUp.x - powerUp.radius < player.x + player.width &&
      powerUp.y + powerUp.radius > player.y &&
      powerUp.y - powerUp.radius < player.y + player.height;

    if (playerHit) {
      applyPowerUp(powerUp.type);
      powerUps.splice(i, 1);
      continue;
    }
  }
}

function applyPowerUp(type) {
  if (type === "slow") {
    activeEffects.slow = 5;
    ball.dx *= 0.8;
    ball.dy *= 0.8;
    createParticles(ball.x, ball.y, "#7c3aed");
    playTone("hit");
  }

  if (type === "boost") {
    activeEffects.boost = 5;
    ball.dx *= 1.25;
    ball.dy *= 1.25;
    createParticles(ball.x, ball.y, "#22c55e");
    playTone("hit");
  }

  if (type === "stretch") {
    activeEffects.stretch = 6;
    player.height = basePlayerHeight * 1.5;
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
    createParticles(player.x, player.y, "#f59e0b");
    playTone("hit");
  }
}

function resetPowerEffects() {
  activeEffects.slow = 0;
  activeEffects.boost = 0;
  activeEffects.stretch = 0;
  player.height = basePlayerHeight;
}

function updatePowerEffects() {
  if (activeEffects.slow > 0) {
    activeEffects.slow -= 1 / 60;
  } else if (activeEffects.slow <= 0 && activeEffects.slow !== 0) {
    activeEffects.slow = 0;
    ball.dx /= 0.8;
    ball.dy /= 0.8;
  }

  if (activeEffects.boost > 0) {
    activeEffects.boost -= 1 / 60;
  } else if (activeEffects.boost <= 0 && activeEffects.boost !== 0) {
    activeEffects.boost = 0;
    ball.dx /= 1.25;
    ball.dy /= 1.25;
  }

  if (activeEffects.stretch > 0) {
    activeEffects.stretch -= 1 / 60;
  } else if (activeEffects.stretch <= 0 && activeEffects.stretch !== 0) {
    activeEffects.stretch = 0;
    player.height = basePlayerHeight;
    player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));
  }
}

function drawBackground() {
  ctx.fillStyle = "#030b12";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(0, 212, 255, 0.08)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255, 215, 0, 0.04)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawNet() {
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPaddle(paddle) {
  ctx.fillStyle = paddle.color;
  ctx.shadowColor = paddle.color;
  ctx.shadowBlur = 16;
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
  ctx.shadowBlur = 0;
}

function drawRightPaddle() {
  const rightPaddle = gameMode.mode === "single" ? computer : rightPlayer;
  drawPaddle(rightPaddle);
}

function drawBall() {
  if (settings.trailEnabled) {
    ball.trail.push({ x: ball.x, y: ball.y });
    if (ball.trail.length > 10) ball.trail.shift();
  }

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < ball.trail.length; i++) {
    const trail = ball.trail[i];
    ctx.fillStyle = `rgba(255,255,255,${0.2 * (1 - i / ball.trail.length)})`;
    ctx.beginPath();
    ctx.arc(trail.x, trail.y, ball.radius * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles() {
  particles.forEach((particle, index) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life -= 0.03;

    if (particle.life <= 0) {
      particles.splice(index, 1);
    } else {
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function drawPowerUps() {
  powerUps.forEach((item) => {
    ctx.beginPath();
    ctx.fillStyle = item.color;
    ctx.arc(item.x, item.y, item.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#0b1020";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(item.type[0].toUpperCase(), item.x, item.y);
  });
}

function drawCenterBanner() {
  if (!centerBanner.visible) return;

  ctx.save();
  ctx.fillStyle = "rgba(17, 26, 40, 0.75)";
  ctx.fillRect(canvas.width / 2 - 140, canvas.height / 2 - 40, 280, 80);

  ctx.strokeStyle = "rgba(103, 232, 249, 0.7)";
  ctx.strokeRect(canvas.width / 2 - 140, canvas.height / 2 - 40, 280, 80);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(centerBanner.text, canvas.width / 2, canvas.height / 2);
  ctx.restore();
}

function draw() {
  drawBackground();
  drawNet();
  drawPaddle(player);
  drawRightPaddle();
  drawBall();
  drawParticles();
  drawPowerUps();
  drawCenterBanner();
}

function loop() {
  if (!state.isPaused && !roundCountdown.active && gameStarted) {
    handlePlayerMovement();
    handleTouchControls();
    handleRightPlayerMovement();
    updateBall();
    updatePowerEffects();
    updatePowerUps();
    spawnPowerUp();
  }

  updateRoundCountdown();
  updateCenterBanner();

  draw();
  requestAnimationFrame(loop);
}

document.addEventListener("keydown", (event) => {
  keys[event.key] = true;

  if (event.key === "m" || event.key === "M") {
    gameMode.mode = gameMode.mode === "single" ? "multi" : "single";
  }

  if (event.key === " ") {
    event.preventDefault();
    togglePause();
  }
});

document.addEventListener("keyup", (event) => {
  keys[event.key] = false;
});

canvas.addEventListener("mousemove", (event) => {
  if (!gameStarted) return;
  const rect = canvas.getBoundingClientRect();
  mouseY = event.clientY - rect.top;
});

canvas.addEventListener("touchmove", (event) => {
  if (!gameStarted) return;
  const touch = event.touches[0];
  const rect = canvas.getBoundingClientRect();
  mouseY = touch.clientY - rect.top;
}, { passive: true });

if (touchUpBtn) {
  touchUpBtn.addEventListener("pointerdown", () => {
    touchMoveState.up = true;
  });
  touchUpBtn.addEventListener("pointerup", () => {
    touchMoveState.up = false;
  });
  touchUpBtn.addEventListener("pointerleave", () => {
    touchMoveState.up = false;
  });
}

if (touchDownBtn) {
  touchDownBtn.addEventListener("pointerdown", () => {
    touchMoveState.down = true;
  });
  touchDownBtn.addEventListener("pointerup", () => {
    touchMoveState.down = false;
  });
  touchDownBtn.addEventListener("pointerleave", () => {
    touchMoveState.down = false;
  });
}

pauseBtn.addEventListener("click", togglePause);
resetBtn.addEventListener("click", resetRound);
newGameBtn.addEventListener("click", resetGame);

if (soundToggleMenu) {
  soundToggleMenu.addEventListener("change", (event) => {
    settings.soundEnabled = event.target.checked;
    saveSettings();
  });
}

if (soundToggle) {
  soundToggle.addEventListener("change", (event) => {
    settings.soundEnabled = event.target.checked;
    saveSettings();
  });
}

sensitivitySlider.addEventListener("input", (event) => {
  settings.sensitivity = parseInt(event.target.value, 10);
  sensitivityValue.textContent = settings.sensitivity;
  player.speed = 6 + settings.sensitivity * 0.8;
});

speedMultiplierInput.addEventListener("input", (event) => {
  settings.speedMultiplier = parseFloat(event.target.value);
  speedMultiplierValue.textContent = `${settings.speedMultiplier.toFixed(1)}x`;
});

particlesToggle.addEventListener("change", (event) => {
  settings.particlesEnabled = event.target.checked;
});

trailToggle.addEventListener("change", (event) => {
  settings.trailEnabled = event.target.checked;
});

difficultyButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    setDifficulty(btn.dataset.difficulty);
    saveSettings();
  });
});

nextRoundBtn.addEventListener("click", () => {
  if (state.matchOver && (state.playerRoundWins >= 4 || state.computerRoundWins >= 4)) {
    resetGame();
  } else {
    resetRound();
  }
});

applySavedSettings();
showStartScreen();
requestAnimationFrame(loop);
