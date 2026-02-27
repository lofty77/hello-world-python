(() => {
  const canvas = document.getElementById("board");
  const ctx = canvas.getContext("2d");
  const scoreEl = document.getElementById("score");
  const overlayEl = document.getElementById("overlay");
  const restartBtn = document.getElementById("restart");
  const controlButtons = Array.from(document.querySelectorAll("[data-dir]"));
  const speedInput = document.getElementById("speed");
  const speedValueEl = document.getElementById("speedValue");
  const soundToggleBtn = document.getElementById("soundToggle");
  const rootStyle = getComputedStyle(document.documentElement);
  const colors = {
    grid: rootStyle.getPropertyValue("--grid").trim() || "#ded7cc",
    snake: rootStyle.getPropertyValue("--snake").trim() || "#2fbf71",
    snakeHead: rootStyle.getPropertyValue("--snake-head").trim() || "#1f8f52",
    food: rootStyle.getPropertyValue("--food").trim() || "#d94a3f",
  };

  const GRID_SIZE = 26;
  const CELL = canvas.width / GRID_SIZE;
  const TICK_MIN_MS = 70;
  const TICK_MAX_MS = 240;

  function speedToTick(speed) {
    const clamped = Math.min(10, Math.max(1, speed));
    const ratio = (clamped - 1) / 9;
    return Math.round(TICK_MAX_MS - ratio * (TICK_MAX_MS - TICK_MIN_MS));
  }

  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  const OPPOSITE = {
    up: "down",
    down: "up",
    left: "right",
    right: "left",
  };

  function positionsToSet(positions) {
    const set = new Set();
    for (const pos of positions) {
      set.add(`${pos.x},${pos.y}`);
    }
    return set;
  }

  function randomInt(max) {
    return Math.floor(Math.random() * max);
  }

  function spawnFood(snake, gridSize) {
    const occupied = positionsToSet(snake);
    const freeCells = [];
    for (let y = 0; y < gridSize; y += 1) {
      for (let x = 0; x < gridSize; x += 1) {
        const key = `${x},${y}`;
        if (!occupied.has(key)) {
          freeCells.push({ x, y });
        }
      }
    }
    if (freeCells.length === 0) return null;
    return freeCells[randomInt(freeCells.length)];
  }

  function createInitialState() {
    const startX = Math.floor(GRID_SIZE / 2);
    const startY = Math.floor(GRID_SIZE / 2);
    const snake = [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY },
    ];

    return {
      snake,
      direction: "right",
      nextDirection: "right",
      food: spawnFood(snake, GRID_SIZE),
      score: 0,
      gameOver: false,
    };
  }

  function step(state) {
    if (state.gameOver) return state;

    const nextDir = state.nextDirection;
    const dir = DIRS[nextDir];
    const head = state.snake[0];
    const nextHead = { x: head.x + dir.x, y: head.y + dir.y };

    if (
      nextHead.x < 0 ||
      nextHead.y < 0 ||
      nextHead.x >= GRID_SIZE ||
      nextHead.y >= GRID_SIZE
    ) {
      return { ...state, gameOver: true };
    }

    const bodySet = positionsToSet(state.snake);
    if (bodySet.has(`${nextHead.x},${nextHead.y}`)) {
      return { ...state, gameOver: true };
    }

    const ateFood =
      state.food && nextHead.x === state.food.x && nextHead.y === state.food.y;

    const newSnake = [nextHead, ...state.snake];
    if (!ateFood) {
      newSnake.pop();
    }

    const nextFood = ateFood ? spawnFood(newSnake, GRID_SIZE) : state.food;
    return {
      ...state,
      snake: newSnake,
      direction: nextDir,
      food: nextFood,
      score: state.score + (ateFood ? 1 : 0),
      gameOver: nextFood === null ? true : state.gameOver,
    };
  }

  let state = createInitialState();
  let lastTick = 0;
  let running = true;
  let paused = false;
  let tickMs = speedToTick(Number(speedInput.value));
  let soundEnabled = true;
  let audioCtx = null;

  function setOverlay(text, show) {
    overlayEl.textContent = text;
    overlayEl.classList.toggle("show", show);
  }

  function resetGame() {
    state = createInitialState();
    lastTick = 0;
    running = true;
    paused = false;
    setOverlay("", false);
    render();
  }

  function setDirection(nextDir) {
    if (state.gameOver) return;
    if (nextDir === OPPOSITE[state.direction]) return;
    state.nextDirection = nextDir;
  }

  function handleKey(event) {
    const key = event.key.toLowerCase();
    if (key === "arrowup" || key === "w") setDirection("up");
    if (key === "arrowdown" || key === "s") setDirection("down");
    if (key === "arrowleft" || key === "a") setDirection("left");
    if (key === "arrowright" || key === "d") setDirection("right");
    if (key === " " || key === "enter") {
      if (state.gameOver) {
        resetGame();
      } else {
        paused = !paused;
        setOverlay(paused ? "已暂停" : "", paused);
      }
    }
  }

  function drawGrid() {
    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i += 1) {
      const pos = i * CELL;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, canvas.height);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(canvas.width, pos);
      ctx.stroke();
    }
  }

  function drawCell(x, y, color, radius = 4) {
    ctx.fillStyle = color;
    const px = x * CELL + 1;
    const py = y * CELL + 1;
    const size = CELL - 2;
    ctx.beginPath();
    ctx.moveTo(px + radius, py);
    ctx.lineTo(px + size - radius, py);
    ctx.quadraticCurveTo(px + size, py, px + size, py + radius);
    ctx.lineTo(px + size, py + size - radius);
    ctx.quadraticCurveTo(px + size, py + size, px + size - radius, py + size);
    ctx.lineTo(px + radius, py + size);
    ctx.quadraticCurveTo(px, py + size, px, py + size - radius);
    ctx.lineTo(px, py + radius);
    ctx.quadraticCurveTo(px, py, px + radius, py);
    ctx.closePath();
    ctx.fill();
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();

    if (state.food) {
      drawCell(state.food.x, state.food.y, colors.food, 6);
    }

    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, colors.snake);
    grad.addColorStop(1, colors.snakeHead);

    state.snake.forEach((segment, index) => {
      let color = index === 0 ? colors.snakeHead : colors.snake;
      if (index !== 0) {
        color = index % 2 === 0 ? grad : colors.snake;
      }
      const radius = index === 0 ? 7 : 5;
      drawCell(segment.x, segment.y, color, radius);
    });

    // Draw eyes on head for a more snake-like look
    const head = state.snake[0];
    if (head) {
      const centerX = head.x * CELL + CELL / 2;
      const centerY = head.y * CELL + CELL / 2;
      const offset = CELL * 0.18;
      const eyeR = CELL * 0.08;
      ctx.fillStyle = "#0f1a14";
      if (state.direction === "up" || state.direction === "down") {
        ctx.beginPath();
        ctx.arc(centerX - offset, centerY, eyeR, 0, Math.PI * 2);
        ctx.arc(centerX + offset, centerY, eyeR, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(centerX, centerY - offset, eyeR, 0, Math.PI * 2);
        ctx.arc(centerX, centerY + offset, eyeR, 0, Math.PI * 2);
        ctx.fill();
      }

      // Small red tongue for added character
      ctx.strokeStyle = "#d94a3f";
      ctx.lineWidth = Math.max(2, CELL * 0.08);
      ctx.beginPath();
      if (state.direction === "up") {
        ctx.moveTo(centerX, head.y * CELL + 2);
        ctx.lineTo(centerX, head.y * CELL - CELL * 0.25);
      } else if (state.direction === "down") {
        ctx.moveTo(centerX, (head.y + 1) * CELL - 2);
        ctx.lineTo(centerX, (head.y + 1) * CELL + CELL * 0.25);
      } else if (state.direction === "left") {
        ctx.moveTo(head.x * CELL + 2, centerY);
        ctx.lineTo(head.x * CELL - CELL * 0.25, centerY);
      } else {
        ctx.moveTo((head.x + 1) * CELL - 2, centerY);
        ctx.lineTo((head.x + 1) * CELL + CELL * 0.25, centerY);
      }
      ctx.stroke();
    }

    scoreEl.textContent = String(state.score);

    if (state.gameOver) {
      const message = state.food === null ? "你赢了！按回车重新开始" : "游戏结束，按回车重新开始";
      setOverlay(message, true);
    }
  }

  function ensureAudio() {
    if (!soundEnabled) return null;
    if (!audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        audioCtx = new AudioContext();
      }
    }
    return audioCtx;
  }

  function playBeep(freq, durationMs) {
    const ctx = ensureAudio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.value = 0.06;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  }

  function loop(timestamp) {
    if (!lastTick) lastTick = timestamp;
    const elapsed = timestamp - lastTick;

    if (running && !paused && elapsed >= tickMs) {
      const prevScore = state.score;
      state = step(state);
      lastTick = timestamp;
      render();
      if (state.score > prevScore) playBeep(520, 90);
      if (state.gameOver) playBeep(180, 220);
    }

    requestAnimationFrame(loop);
  }

  restartBtn.addEventListener("click", resetGame);
  document.addEventListener("keydown", handleKey);
  document.addEventListener("pointerdown", ensureAudio, { once: true });
  soundToggleBtn.addEventListener("click", () => {
    soundEnabled = !soundEnabled;
    soundToggleBtn.textContent = `声音: ${soundEnabled ? "开" : "关"}`;
  });
  speedInput.addEventListener("input", (event) => {
    const value = Number(event.target.value);
    tickMs = speedToTick(value);
    speedValueEl.textContent = String(value);
  });
  controlButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const dir = btn.dataset.dir;
      if (DIRS[dir]) setDirection(dir);
    });
  });

  render();
  speedValueEl.textContent = String(speedInput.value);
  requestAnimationFrame(loop);

  // Expose minimal logic for potential tests
  window.__snakeGame = {
    step,
    createInitialState,
    spawnFood,
  };
})();
