import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import LeaderboardTable from "../components/LeaderboardTable";
import AdBanner from "../components/AdBanner";
import { getLeaderboard } from "../lib/api";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getLeaderboard()
      .then(setEntries)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Top ad */}
      <AdBanner slot="5555555555" format="horizontal" className="w-full min-h-[90px]" />

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1 className="font-pixel text-sm text-paddy-light">LEADERBOARD</h1>
            <Link to="/" className="btn-primary text-xs py-2 px-4">
              SUBMIT BOT
            </Link>
          </div>

          {loading && (
            <div className="font-pixel text-xs text-rock animate-pulse py-8 text-center">
              LOADING...
            </div>
          )}
          {error && (
            <div className="card border-red-700 text-red-300 font-pixel text-xs">{error}</div>
          )}
          {!loading && !error && (
            <div className="card p-0 overflow-hidden">
              <LeaderboardTable entries={entries} />
            </div>
          )}
        </div>

        {/* Sidebar ad */}
        <div className="hidden lg:block w-[300px] shrink-0 space-y-4">
          <AdBanner slot="6666666666" format="rectangle" className="w-[300px] min-h-[250px]" />

          {/* About section — helps with AdSense content requirements */}
          <div className="card space-y-3 text-xs text-parchment/70">
            <h2 className="font-pixel text-xs text-grain">ABOUT BIGAS</h2>
            <p>
              Bigas is a coding challenge game where you write a Python bot to
              control a farmer on a 64×64 rice paddy grid.
            </p>
            <p>
              Your bot gets <span className="text-grain">100 AP</span> per cycle
              across <span className="text-grain">5 cycles</span> to plant,
              grow, harvest, and deposit rice at the shed.
            </p>
            <p>
              Score is the <span className="text-grain">average grams</span> of
              rice deposited per cycle. Soil quality ranges from{" "}
              <span className="text-rock">good (250g)</span> to{" "}
              <span className="text-grain">great (500g)</span> to{" "}
              <span className="text-ripe">best (1000g)</span>.
            </p>
            <Link to="/" className="text-paddy-light hover:text-ripe block mt-2">
              Start farming →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
