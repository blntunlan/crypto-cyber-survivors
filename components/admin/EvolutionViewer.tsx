import { useEffect, useRef, useState } from 'react';
// import { Card } from "@/components/ui/card"; // REMOVED - Component not found

/**
 * EvolutionViewer - Project Darwin Spectator
 * Connects to the Training Server (ws://localhost:8080) and renders the simulation.
 */

export interface SimSnapshot {
  player?: {
    x: number;
    y: number;
    hp: number;
  };
  enemies?: Array<{
    x: number;
    y: number;
    type: string;
  }>;
}

export default function EvolutionViewer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generation, setGeneration] = useState(0);
  const [bestFitness, setBestFitness] = useState(0);
  const [status, setStatus] = useState('Disconnected');
  const [logs, setLogs] = useState<string[]>([]);

  // Simulation Data Refs (for Animation Frame)
  const simDataRef = useRef<SimSnapshot | null>(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8080');

    ws.onopen = () => {
      setStatus('Connected to Darwin Trainer');
      addLog('Connected to neural network training stream...');
    };

    ws.onmessage = event => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'GENERATION_UPDATE') {
          setGeneration(data.generation);
          setBestFitness(data.bestFitness);
          addLog(
            `Generation ${data.generation} Complete. Best Fitness: ${Math.floor(data.bestFitness)}`
          );
        } else if (data.type === 'SIM_UPDATE') {
          // Real-time frame data
          simDataRef.current = data.snapshot;
        }
      } catch (err) {
        console.error('Parse error:', err);
      }
    };

    ws.onclose = () => setStatus('Disconnected (Trainer offline?)');

    return () => ws.close();
  }, []);

  // Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      // Clear
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid
      ctx.strokeStyle = '#113';
      ctx.beginPath();
      for (let x = 0; x < canvas.width; x += 50) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
      }
      for (let y = 0; y < canvas.height; y += 50) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
      }
      ctx.stroke();

      const snap = simDataRef.current;
      if (snap) {
        // Scale factors (Simulation is 1920x1080, Canvas is 800x450)
        const sx = canvas.width / 1920;
        const sy = canvas.height / 1080;

        // Player
        if (snap.player) {
          ctx.fillStyle = '#0af'; // Cyan
          ctx.beginPath();
          ctx.arc(snap.player.x * sx, snap.player.y * sy, 8, 0, Math.PI * 2);
          ctx.fill();

          // HP Bar
          ctx.fillStyle = '#f00';
          ctx.fillRect(snap.player.x * sx - 10, snap.player.y * sy - 15, 20, 4);
          ctx.fillStyle = '#0f0';
          ctx.fillRect(
            snap.player.x * sx - 10,
            snap.player.y * sy - 15,
            20 * (snap.player.hp / 100),
            4
          );
        }

        // Enemies (We need snapshot to include enemies)
      } else {
        ctx.fillStyle = '#333';
        ctx.fillText('Waiting for simulation data...', 20, 20);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 10));
  };

  return (
    <div className="min-h-screen bg-black p-8 font-mono text-green-500">
      <h1 className="mb-4 flex items-center gap-4 text-3xl font-bold tracking-wider">
        PROJECT DARWIN
        <span className="rounded border border-green-800 bg-green-900/30 px-2 py-1 text-xs text-green-400">
          DEV MODE
        </span>
      </h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Visualizer (Brain / Map) */}
        <div className="space-y-4 lg:col-span-2">
          <div className="relative aspect-video overflow-hidden rounded-sm border border-green-900/50 bg-gray-950 p-1 shadow-2xl shadow-green-900/20 ring-1 ring-green-900/50">
            <canvas
              ref={canvasRef}
              width={800}
              height={450}
              className="h-full w-full object-contain"
            />
            <div className="absolute left-4 top-4 rounded border border-green-900/50 bg-black/80 p-2 text-xs text-green-400 backdrop-blur">
              STATUS:{' '}
              <span
                className={
                  status.includes('Connected')
                    ? 'animate-pulse text-emerald-400'
                    : 'text-red-500'
                }
              >
                {status}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Panel */}
        <div className="space-y-4">
          <div className="rounded-sm border border-green-900/50 bg-gray-950 p-6 shadow-lg">
            <h2 className="mb-4 border-b border-green-800 pb-2 text-xl font-bold text-green-400">
              Training Metrics
            </h2>

            <div className="mb-6 grid grid-cols-2 gap-4">
              <div className="rounded border border-green-900/30 bg-green-900/10 p-4">
                <div className="mb-1 text-xs uppercase text-gray-400">Generation</div>
                <div className="text-4xl font-bold text-white">{generation}</div>
              </div>
              <div className="rounded border border-green-900/30 bg-green-900/10 p-4">
                <div className="mb-1 text-xs uppercase text-gray-400">High Score</div>
                <div className="text-4xl font-bold text-emerald-400">
                  {Math.floor(bestFitness)}
                </div>
              </div>
            </div>

            <div className="custom-scrollbar h-64 overflow-y-auto rounded border border-green-900/30 bg-black/40 p-2 font-mono text-xs">
              {logs.map((log, i) => (
                <div key={i} className="mb-1 border-b border-white/5 pb-1 opacity-80">
                  <span className="mr-2 text-green-700">
                    [{new Date().toLocaleTimeString()}]
                  </span>
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
