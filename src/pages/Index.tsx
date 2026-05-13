import { useEffect, useRef, useState, useCallback } from "react";

const CELL = 20;
const COLS = 20;
const ROWS = 16;
const WIDTH = COLS * CELL;
const HEIGHT = ROWS * CELL;

type Dir = "UP" | "DOWN" | "LEFT" | "RIGHT";
type Point = { x: number; y: number };

function getRandomFood(snake: Point[]): Point {
  while (true) {
    const x = Math.floor(Math.random() * COLS);
    const y = Math.floor(Math.random() * ROWS);
    if (!snake.find((s) => s.x === x && s.y === y)) return { x, y };
  }
}

export default function Index() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    snake: [{ x: 10, y: 8 }],
    dir: "RIGHT" as Dir,
    nextDir: "RIGHT" as Dir,
    food: { x: 15, y: 8 },
    score: 0,
    gameOver: false,
    running: false,
  });
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const rafRef = useRef<number>(0);
  const lastTickRef = useRef<number>(0);
  const SPEED = 120; // ms per tick

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const s = stateRef.current;

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Grid dots
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        ctx.fillRect(x * CELL + CELL / 2 - 1, y * CELL + CELL / 2 - 1, 2, 2);
      }
    }

    // Food
    ctx.fillStyle = "#e53e3e";
    ctx.fillRect(s.food.x * CELL + 2, s.food.y * CELL + 2, CELL - 4, CELL - 4);

    // Snake
    s.snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? "#fff" : "#22c55e";
      ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
    });
  }, []);

  const tick = useCallback(
    (ts: number) => {
      if (ts - lastTickRef.current < SPEED) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      lastTickRef.current = ts;

      const s = stateRef.current;
      if (!s.running || s.gameOver) return;

      s.dir = s.nextDir;
      const head = s.snake[0];
      let nx = head.x;
      let ny = head.y;
      if (s.dir === "UP") ny--;
      if (s.dir === "DOWN") ny++;
      if (s.dir === "LEFT") nx--;
      if (s.dir === "RIGHT") nx++;

      // Collision
      if (
        nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS ||
        s.snake.find((seg) => seg.x === nx && seg.y === ny)
      ) {
        s.gameOver = true;
        s.running = false;
        setGameOver(true);
        draw();
        return;
      }

      const newHead = { x: nx, y: ny };
      if (nx === s.food.x && ny === s.food.y) {
        s.snake = [newHead, ...s.snake];
        s.score++;
        s.food = getRandomFood(s.snake);
        setScore(s.score);
      } else {
        s.snake = [newHead, ...s.snake.slice(0, -1)];
      }

      draw();
      rafRef.current = requestAnimationFrame(tick);
    },
    [draw]
  );

  const startGame = useCallback(() => {
    const s = stateRef.current;
    s.snake = [{ x: 10, y: 8 }];
    s.dir = "RIGHT";
    s.nextDir = "RIGHT";
    s.food = getRandomFood(s.snake);
    s.score = 0;
    s.gameOver = false;
    s.running = true;
    setScore(0);
    setGameOver(false);
    setStarted(true);
    lastTickRef.current = 0;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (e.key === " " && (s.gameOver || !s.running)) {
        startGame();
        return;
      }
      if (!s.running) return;
      if (e.key === "ArrowUp" && s.dir !== "DOWN") s.nextDir = "UP";
      if (e.key === "ArrowDown" && s.dir !== "UP") s.nextDir = "DOWN";
      if (e.key === "ArrowLeft" && s.dir !== "RIGHT") s.nextDir = "LEFT";
      if (e.key === "ArrowRight" && s.dir !== "LEFT") s.nextDir = "RIGHT";
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [startGame]);

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const handleSwipe = (() => {
    let sx = 0, sy = 0;
    return {
      start: (e: React.TouchEvent) => {
        sx = e.touches[0].clientX;
        sy = e.touches[0].clientY;
      },
      end: (e: React.TouchEvent) => {
        const dx = e.changedTouches[0].clientX - sx;
        const dy = e.changedTouches[0].clientY - sy;
        const s = stateRef.current;
        if (!s.running) return;
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 20 && s.dir !== "LEFT") s.nextDir = "RIGHT";
          if (dx < -20 && s.dir !== "RIGHT") s.nextDir = "LEFT";
        } else {
          if (dy > 20 && s.dir !== "UP") s.nextDir = "DOWN";
          if (dy < -20 && s.dir !== "DOWN") s.nextDir = "UP";
        }
      },
    };
  })();

  const mobileBtn = (dir: Dir) => {
    const s = stateRef.current;
    if (!s.running) return;
    const opp = { UP: "DOWN", DOWN: "UP", LEFT: "RIGHT", RIGHT: "LEFT" } as const;
    if (s.dir !== opp[dir]) s.nextDir = dir;
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-white border-b border-black">
        <div className="container mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
          <a href="/" className="text-xl font-bold tracking-tighter">
            SNAKE
          </a>
          <div className="flex space-x-8">
            <a href="#game" className="text-sm uppercase tracking-widest hover:text-red-600 transition-colors">
              Играть
            </a>
            <a href="#rules" className="text-sm uppercase tracking-widest hover:text-red-600 transition-colors">
              Правила
            </a>
            <a href="#controls" className="text-sm uppercase tracking-widest hover:text-red-600 transition-colors">
              Управление
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 md:px-8 container mx-auto">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-7 mb-8 md:mb-0">
            <h1 className="text-8xl md:text-9xl font-bold tracking-tighter leading-none mb-6">
              SNAKE
            </h1>
            <p className="text-xl max-w-xl">
              Классическая змейка. Собирай еду, расти, не врезайся. Проверь, сколько очков ты наберёшь.
            </p>
          </div>
          <div className="col-span-12 md:col-span-5 flex items-center justify-center">
            <div className="relative w-full aspect-square bg-black flex items-center justify-center">
              <div className="text-white text-center select-none">
                <div className="text-7xl font-bold text-green-500 mb-2">▶</div>
                <div className="text-sm uppercase tracking-widest text-white/60">Нажми ПРОБЕЛ</div>
              </div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-red-600"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Game Section */}
      <section id="game" className="py-20 px-4 md:px-8 bg-black text-white">
        <div className="container mx-auto">
          <h2 className="text-6xl font-bold tracking-tighter mb-12">ИГРАТЬ</h2>
          <div className="flex flex-col items-center gap-6">
            {/* Score */}
            <div className="flex gap-12 text-center w-full max-w-[400px]">
              <div>
                <div className="text-sm uppercase tracking-widest text-neutral-400 mb-1">Счёт</div>
                <div className="text-5xl font-bold text-white">{score}</div>
              </div>
              <div>
                <div className="text-sm uppercase tracking-widest text-neutral-400 mb-1">Рекорд</div>
                <div className="text-5xl font-bold text-red-500">
                  {Math.max(score, Number(localStorage.getItem("snake_hi") ?? 0))}
                </div>
              </div>
            </div>

            {/* Canvas */}
            <div
              className="relative border border-white/20"
              style={{ width: WIDTH, maxWidth: "100%" }}
              onTouchStart={handleSwipe.start}
              onTouchEnd={handleSwipe.end}
            >
              <canvas
                ref={canvasRef}
                width={WIDTH}
                height={HEIGHT}
                style={{ display: "block", maxWidth: "100%" }}
              />
              {/* Overlay */}
              {(!started || gameOver) && (
                <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4">
                  {gameOver && (
                    <div className="text-red-600 text-4xl font-bold tracking-tighter">GAME OVER</div>
                  )}
                  {gameOver && (
                    <div className="text-white text-xl">Счёт: {score}</div>
                  )}
                  <button
                    onClick={startGame}
                    className="border-2 border-white text-white px-8 py-3 uppercase tracking-widest text-sm hover:bg-white hover:text-black transition-colors font-bold"
                  >
                    {gameOver ? "Играть снова" : "Начать игру"}
                  </button>
                  <div className="text-white/40 text-xs uppercase tracking-widest">или нажми ПРОБЕЛ</div>
                </div>
              )}
            </div>

            {/* Mobile controls */}
            <div className="flex flex-col items-center gap-2 md:hidden mt-2">
              <button
                onTouchStart={() => mobileBtn("UP")}
                className="w-14 h-14 bg-white text-black font-bold text-xl flex items-center justify-center"
              >
                ↑
              </button>
              <div className="flex gap-2">
                <button
                  onTouchStart={() => mobileBtn("LEFT")}
                  className="w-14 h-14 bg-white text-black font-bold text-xl flex items-center justify-center"
                >
                  ←
                </button>
                <button
                  onTouchStart={() => mobileBtn("DOWN")}
                  className="w-14 h-14 bg-white text-black font-bold text-xl flex items-center justify-center"
                >
                  ↓
                </button>
                <button
                  onTouchStart={() => mobileBtn("RIGHT")}
                  className="w-14 h-14 bg-white text-black font-bold text-xl flex items-center justify-center"
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rules Section */}
      <section id="rules" className="py-20 px-4 md:px-8">
        <div className="container mx-auto">
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 md:col-span-5">
              <h2 className="text-6xl font-bold tracking-tighter mb-8">ПРАВИЛА</h2>
              <div className="aspect-[4/5] bg-neutral-100 relative mb-8 md:mb-0 flex items-center justify-center">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 border-2 border-black"></div>
                <span className="text-9xl select-none z-10">🐍</span>
              </div>
            </div>
            <div className="col-span-12 md:col-span-7 md:pt-24">
              <p className="text-xl mb-6">
                Управляй змейкой и собирай красные квадраты еды. С каждым съеденным кусочком змейка становится длиннее.
              </p>
              <p className="mb-6">
                Избегай столкновений со стенками поля и с собственным хвостом — это мгновенно завершает игру.
              </p>
              <p className="mb-6">
                Чем больше еды съешь — тем выше счёт. Бей свой рекорд снова и снова!
              </p>
              <div className="grid grid-cols-2 gap-4 mt-12">
                <div>
                  <h3 className="text-sm uppercase tracking-widest mb-2">Цели</h3>
                  <ul className="space-y-2">
                    <li>Собирать еду</li>
                    <li>Расти длиннее</li>
                    <li>Не врезаться</li>
                    <li>Бить рекорды</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm uppercase tracking-widest mb-2">Проигрыш</h3>
                  <ul className="space-y-2">
                    <li>Удар о стену</li>
                    <li>Укус себя</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Controls Section */}
      <section id="controls" className="py-20 px-4 md:px-8 bg-red-600 text-white">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-6xl font-bold tracking-tighter mb-8">УПРАВЛЕНИЕ</h2>
              <p className="text-xl mb-8">Клавиатура или свайпы на мобильном — играй где удобно.</p>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="w-32 text-sm uppercase tracking-widest">Старт / рестарт</span>
                  <kbd className="bg-white text-red-600 font-bold px-4 py-2 text-sm">ПРОБЕЛ</kbd>
                </div>
                <div className="flex items-center gap-4">
                  <span className="w-32 text-sm uppercase tracking-widest">Движение</span>
                  <div className="flex gap-2">
                    <kbd className="bg-white text-red-600 font-bold px-3 py-2 text-sm">↑</kbd>
                    <kbd className="bg-white text-red-600 font-bold px-3 py-2 text-sm">↓</kbd>
                    <kbd className="bg-white text-red-600 font-bold px-3 py-2 text-sm">←</kbd>
                    <kbd className="bg-white text-red-600 font-bold px-3 py-2 text-sm">→</kbd>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="w-32 text-sm uppercase tracking-widest">Мобильный</span>
                  <span>Свайп в сторону движения</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <div className="bg-white/10 border border-white/30 p-8">
                <h3 className="text-2xl font-bold tracking-tighter mb-4">СОВЕТЫ</h3>
                <ul className="space-y-3 text-white/90">
                  <li className="flex gap-3"><span className="text-white font-bold">01</span>Двигайся вдоль краёв — больше места для манёвра</li>
                  <li className="flex gap-3"><span className="text-white font-bold">02</span>Планируй маршрут заранее, не гонись напрямую</li>
                  <li className="flex gap-3"><span className="text-white font-bold">03</span>Чем длиннее змейка — тем сложнее развернуться</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 md:px-8 border-t border-black">
        <div className="container mx-auto flex justify-between items-center">
          <span className="font-bold tracking-tighter">SNAKE</span>
          <span className="text-sm text-neutral-400 uppercase tracking-widest">Классическая игра</span>
        </div>
      </footer>
    </main>
  );
}
