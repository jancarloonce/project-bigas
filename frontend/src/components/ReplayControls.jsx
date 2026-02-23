const SPEEDS = [0.5, 1, 2, 4];

export default function ReplayControls({
  isPlaying,
  onPlayPause,
  speed,
  onSpeedChange,
  cycleIndex,
  totalCycles,
  onCycleChange,
  tickIndex,
  totalTicks,
  onTickChange,
  cycleScore,
}) {
  return (
    <div className="card space-y-3">
      {/* Cycle selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-pixel text-xs text-grain">CYCLE</span>
        {Array.from({ length: totalCycles }, (_, i) => (
          <button
            key={i}
            onClick={() => onCycleChange(i)}
            className={`font-pixel text-xs px-2 py-1 border-2 transition-colors ${
              cycleIndex === i
                ? "bg-paddy border-paddy-light text-soil-dark"
                : "bg-soil border-rock text-parchment hover:border-paddy"
            }`}
          >
            {i + 1}
          </button>
        ))}
        {cycleScore !== undefined && (
          <span className="font-pixel text-xs text-grain ml-auto">
            {cycleScore.toLocaleString()} g
          </span>
        )}
      </div>

      {/* Tick scrubber */}
      <div className="flex items-center gap-3">
        <span className="font-pixel text-xs text-grain w-16 shrink-0">
          {String(tickIndex + 1).padStart(3, "0")}/{String(totalTicks).padStart(3, "0")}
        </span>
        <input
          type="range"
          min={0}
          max={Math.max(0, totalTicks - 1)}
          value={tickIndex}
          onChange={(e) => onTickChange(Number(e.target.value))}
          className="flex-1 accent-paddy"
        />
      </div>

      {/* Play/Pause + speed */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onPlayPause} className="btn-primary py-2 px-4 text-xs">
          {isPlaying ? "⏸ PAUSE" : "▶ PLAY"}
        </button>

        <div className="flex items-center gap-1">
          <span className="font-pixel text-xs text-grain">SPEED</span>
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`font-pixel text-xs px-2 py-1 border-2 transition-colors ${
                speed === s
                  ? "bg-grain border-grain text-soil-dark"
                  : "bg-soil border-rock text-parchment hover:border-grain"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
