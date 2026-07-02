interface LeaderboardSettingsProps {
  email?: string;
  optedInName: string;
  setOptedInName: (name: string) => void;
  isMockMode: boolean;
  handleSaveLeaderboardName: () => Promise<void>;
}

export function LeaderboardSettings({
  optedInName,
  setOptedInName,
  isMockMode,
  handleSaveLeaderboardName
}: LeaderboardSettingsProps) {
  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.02)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "28px"
      }}
    >
      <h3 style={{ margin: "0 0 10px", fontSize: "1rem", color: "#fff" }}>
        🏆 Global Leaderboard Nickname
      </h3>
      <p style={{ margin: "0 0 16px", color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>
        Set a custom nickname to display on the public leaderboard. Defaults to your email username.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <label style={{ fontSize: "0.8125rem", color: "rgba(255,255,255,0.7)" }}>
            Display Name:
          </label>
          <input
            type="text"
            value={optedInName}
            onChange={(e) => setOptedInName(e.target.value)}
            disabled={isMockMode}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "0.8125rem",
              padding: "6px 12px",
              outline: "none"
            }}
          />
          <button
            type="button"
            onClick={handleSaveLeaderboardName}
            disabled={isMockMode}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "0.75rem",
              padding: "6px 12px",
              cursor: "pointer"
            }}
          >
            Save Name
          </button>
        </div>
      </div>
    </div>
  );
}
