import { Link } from "react-router-dom";

export default function LeaderboardTable({ entries }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="card text-center font-pixel text-xs text-rock py-8">
        No submissions yet. Be the first to submit a bot!
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-mono text-sm">
        <thead>
          <tr className="border-b-2 border-rock">
            <th className="font-pixel text-xs text-grain text-left px-3 py-2">#</th>
            <th className="font-pixel text-xs text-grain text-left px-3 py-2">BOT</th>
            <th className="font-pixel text-xs text-grain text-right px-3 py-2">AVG (g)</th>
            <th className="font-pixel text-xs text-grain text-right px-3 py-2 hidden md:table-cell">
              C1
            </th>
            <th className="font-pixel text-xs text-grain text-right px-3 py-2 hidden md:table-cell">
              C2
            </th>
            <th className="font-pixel text-xs text-grain text-right px-3 py-2 hidden md:table-cell">
              C3
            </th>
            <th className="font-pixel text-xs text-grain text-right px-3 py-2 hidden md:table-cell">
              C4
            </th>
            <th className="font-pixel text-xs text-grain text-right px-3 py-2 hidden md:table-cell">
              C5
            </th>
            <th className="font-pixel text-xs text-grain text-right px-3 py-2 hidden lg:table-cell">
              SUBMITTED
            </th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr
              key={entry.job_id}
              className={`border-b border-rock/40 hover:bg-soil transition-colors ${
                i === 0 ? "bg-paddy/10" : ""
              }`}
            >
              <td className="px-3 py-2">
                <span
                  className={`font-pixel text-xs ${
                    i === 0
                      ? "text-ripe"
                      : i === 1
                      ? "text-parchment"
                      : i === 2
                      ? "text-grain"
                      : "text-rock"
                  }`}
                >
                  {entry.rank}
                </span>
              </td>
              <td className="px-3 py-2 font-pixel text-xs text-parchment max-w-[120px] truncate">
                {entry.bot_name}
              </td>
              <td className="px-3 py-2 text-right font-pixel text-xs text-paddy-light">
                {entry.final_score.toLocaleString()}
              </td>
              {entry.cycle_scores.slice(0, 5).map((s, ci) => (
                <td
                  key={ci}
                  className="px-3 py-2 text-right text-parchment/70 hidden md:table-cell"
                >
                  {s.toLocaleString()}
                </td>
              ))}
              <td className="px-3 py-2 text-right text-rock text-xs hidden lg:table-cell">
                {new Date(entry.submitted_at).toLocaleDateString()}
              </td>
              <td className="px-3 py-2 text-right">
                <Link
                  to={`/result/${entry.job_id}`}
                  className="font-pixel text-xs text-paddy hover:text-ripe transition-colors"
                >
                  REPLAY
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
