import { Link, useLocation } from "react-router-dom";

export default function NavBar() {
  const { pathname } = useLocation();

  return (
    <nav className="border-b-2 border-rock bg-soil px-4 py-3 flex items-center justify-between">
      <Link to="/" className="font-pixel text-sm text-paddy-light hover:text-ripe no-underline">
        BIGAS
      </Link>
      <div className="flex gap-4">
        <Link
          to="/"
          className={`font-pixel text-xs no-underline transition-colors ${
            pathname === "/" ? "text-ripe" : "text-parchment hover:text-paddy-light"
          }`}
        >
          SUBMIT
        </Link>
        <Link
          to="/leaderboard"
          className={`font-pixel text-xs no-underline transition-colors ${
            pathname === "/leaderboard" ? "text-ripe" : "text-parchment hover:text-paddy-light"
          }`}
        >
          LEADERBOARD
        </Link>
      </div>
    </nav>
  );
}
