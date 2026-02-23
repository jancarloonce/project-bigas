import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import GridVisualizer from "../components/GridVisualizer";
import ReplayControls from "../components/ReplayControls";
import AdBanner from "../components/AdBanner";
import { getJob } from "../lib/api";

const POLL_INTERVAL = 1500;

export default function ResultPage() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);

  // Replay state
  const [cycleIndex, setCycleIndex] = useState(0);
  const [tickIndex, setTickIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const animRef = useRef(null);
  const lastTimeRef = useRef(null);

  // Polling
  useEffect(() => {
    let timer;
    async function poll() {
      try {
        const data = await getJob(jobId);
        setJob(data);
        if (data.status === "complete" || data.status === "error") return;
        timer = setTimeout(poll, POLL_INTERVAL);
      } catch (e) {
        setError(e.message);
      }
    }
    poll();
    return () => clearTimeout(timer);
  }, [jobId]);

  // Auto-play animation
  const replay = job?.result?.replay ?? job?.result;
  const cycle = replay?.cycles?.[cycleIndex];
  const totalTicks = cycle?.ticks?.length ?? 0;
  const totalCycles = replay?.cycles?.length ?? 0;

  const advanceTick = useCallback(() => {
    setTickIndex((t) => {
      if (t + 1 < totalTicks) return t + 1;
      // End of cycle
      if (cycleIndex + 1 < totalCycles) {
        setCycleIndex((c) => c + 1);
        return 0;
      }
      setIsPlaying(false);
      return t;
    });
  }, [totalTicks, cycleIndex, totalCycles]);

  useEffect(() => {
    if (!isPlaying) {
      cancelAnimationFrame(animRef.current);
      lastTimeRef.current = null;
      return;
    }
    const msPerTick = 1000 / (speed * 10); // 10 ticks/s at 1x

    function frame(ts) {
      if (lastTimeRef.current === null) lastTimeRef.current = ts;
      const elapsed = ts - lastTimeRef.current;
      if (elapsed >= msPerTick) {
        lastTimeRef.current = ts;
        advanceTick();
      }
      animRef.current = requestAnimationFrame(frame);
    }
    animRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animRef.current);
  }, [isPlaying, speed, advanceTick]);

  // Reset tick on cycle change
  useEffect(() => setTickIndex(0), [cycleIndex]);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="font-pixel text-xs text-red-400">{error}</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <div className="font-pixel text-xs text-rock animate-pulse">LOADING...</div>
      </div>
    );
  }

  if (job.status === "pending" || job.status === "running") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-4">
        <div className="font-pixel text-xs text-paddy-light animate-pulse">
          {job.status === "pending" ? "QUEUED..." : "RUNNING BOT..."}
        </div>
        <div className="text-parchment/50 text-sm">
          Your bot is {job.status === "pending" ? "waiting in queue" : "farming right now"}.
          This page will update automatically.
        </div>
      </div>
    );
  }

  if (job.status === "error") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <h1 className="font-pixel text-sm text-red-400">BOT ERROR</h1>
        <div className="card border-red-700 text-red-300 font-mono text-sm whitespace-pre-wrap">
          {job.error || "Unknown error"}
        </div>
        <Link to="/" className="btn-secondary inline-block">
          TRY AGAIN
        </Link>
      </div>
    );
  }

  const result = job.result?.replay ?? job.result;
  const finalScore = result?.final_score ?? 0;
  const cycleScores = result?.cycle_scores ?? [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Score card */}
      <div className="card space-y-4">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-pixel text-sm text-paddy-light">{job.bot_name}</h1>
            <div className="font-pixel text-2xl text-ripe mt-1">
              {finalScore.toLocaleString()} g
            </div>
            <div className="text-parchment/60 text-xs mt-1">average across 5 cycles</div>
          </div>
          <Link to="/leaderboard" className="btn-secondary text-xs py-2 px-4">
            LEADERBOARD
          </Link>
        </div>

        {/* Per-cycle scores */}
        <div className="flex gap-3 flex-wrap">
          {cycleScores.map((s, i) => (
            <button
              key={i}
              onClick={() => { setCycleIndex(i); setTickIndex(0); setIsPlaying(false); }}
              className={`font-pixel text-xs px-3 py-2 border-2 transition-colors ${
                cycleIndex === i
                  ? "bg-paddy border-paddy-light text-soil-dark"
                  : "bg-soil border-rock text-parchment hover:border-paddy"
              }`}
            >
              C{i + 1}: {s.toLocaleString()}g
            </button>
          ))}
        </div>
      </div>

      {/* Ad between score and replay */}
      <AdBanner slot="3333333333" format="horizontal" className="w-full min-h-[90px]" />

      {/* Replay */}
      {result && (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <GridVisualizer
              replay={result}
              cycleIndex={cycleIndex}
              tickIndex={tickIndex}
            />
          </div>
          <div className="lg:w-80 space-y-4">
            <ReplayControls
              isPlaying={isPlaying}
              onPlayPause={() => setIsPlaying((p) => !p)}
              speed={speed}
              onSpeedChange={setSpeed}
              cycleIndex={cycleIndex}
              totalCycles={totalCycles}
              onCycleChange={(i) => { setCycleIndex(i); setTickIndex(0); }}
              tickIndex={tickIndex}
              totalTicks={totalTicks}
              onTickChange={setTickIndex}
              cycleScore={cycleScores[cycleIndex]}
            />

            {/* Legend */}
            <div className="card space-y-2">
              <div className="font-pixel text-xs text-grain">LEGEND</div>
              {[
                { color: "#e83030", label: "Shed" },
                { color: "#5c7488", label: "Rock" },
                { color: "#34c87e", label: "Empty (best)" },
                { color: "#2ca068", label: "Empty (great)" },
                { color: "#247a52", label: "Empty (good)" },
                { color: "#1a5c36", label: "Planted" },
                { color: "#2ea85e", label: "Growing" },
                { color: "#f5c018", label: "Ripe" },
                { color: "#e8c030", label: "Farmer" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2 text-xs text-parchment/80">
                  <div
                    className="w-4 h-4 shrink-0 border border-rock/50"
                    style={{ backgroundColor: color }}
                  />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom ad */}
      <AdBanner slot="4444444444" format="horizontal" className="w-full min-h-[90px]" />

      <div className="text-center">
        <Link to="/" className="btn-primary inline-block">
          SUBMIT ANOTHER BOT
        </Link>
      </div>
    </div>
  );
}
