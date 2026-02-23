import { BrowserRouter, Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import SubmitPage from "./pages/SubmitPage";
import ResultPage from "./pages/ResultPage";
import LeaderboardPage from "./pages/LeaderboardPage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <NavBar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<SubmitPage />} />
            <Route path="/result/:jobId" element={<ResultPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
          </Routes>
        </main>
        <footer className="border-t-2 border-rock bg-soil px-4 py-3 text-center font-pixel text-xs text-rock">
          BIGAS &copy; {new Date().getFullYear()} — GROW MORE RICE
        </footer>
      </div>
    </BrowserRouter>
  );
}
