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
    <div className="min-h-screen bg-black text-green-500 font-mono p-8">
      <h1 className="text-3xl font-bold mb-4 tracking-wider flex items-center gap-4">
        PROJECT DARWIN
        <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded border border-green-800">
          DEV MODE
        </span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Visualizer (Brain / Map) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gray-950 border border-green-900/50 p-1 aspect-video relative overflow-hidden ring-1 ring-green-900/50 shadow-2xl shadow-green-900/20 rounded-xl">
            <canvas
              ref={canvasRef}
              width={800}
              height={450}
              className="w-full h-full object-contain"
            />
            <div className="absolute top-4 left-4 text-xs bg-black/80 backdrop-blur border border-green-900/50 p-2 rounded text-green-400">
              STATUS:{' '}
              <span
                className={
                  status.includes('Connected')
                    ? 'text-emerald-400 animate-pulse'
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
          <div className="bg-gray-950 border border-green-900/50 p-6 shadow-lg rounded-xl">
            <h2 className="text-xl border-b border-green-800 pb-2 mb-4 text-green-400 font-bold">
              Training Metrics
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-green-900/10 p-4 rounded border border-green-900/30">
                <div className="text-xs text-gray-400 uppercase mb-1">Generation</div>
                <div className="text-4xl font-bold text-white">{generation}</div>
              </div>
              <div className="bg-green-900/10 p-4 rounded border border-green-900/30">
                <div className="text-xs text-gray-400 uppercase mb-1">High Score</div>
                <div className="text-4xl font-bold text-emerald-400">
                  {Math.floor(bestFitness)}
                </div>
              </div>
            </div>

            <div className="h-64 bg-black/40 rounded border border-green-900/30 p-2 font-mono text-xs overflow-y-auto custom-scrollbar">
              {logs.map((log, i) => (
                <div key={i} className="mb-1 opacity-80 border-b border-white/5 pb-1">
                  <span className="text-green-700 mr-2">
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
