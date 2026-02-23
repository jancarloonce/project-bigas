const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function submitBot({ botName, code, file }) {
  const form = new FormData();
  form.append("bot_name", botName);
  if (file) {
    form.append("file", file);
  } else {
    form.append("code", code);
  }
  const res = await fetch(`${API_BASE}/submit`, { method: "POST", body: form });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || "Submission failed");
  }
  return res.json();
}

export async function getJob(jobId) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`);
  if (!res.ok) throw new Error("Job not found");
  return res.json();
}

export async function getLeaderboard() {
  const res = await fetch(`${API_BASE}/leaderboard`);
  if (!res.ok) throw new Error("Failed to load leaderboard");
  return res.json();
}
