interface LeaderboardSettingsProps {
  email?: string;
  optedIn: boolean;
  optedInName: string;
  setOptedInName: (name: string) => void;
  isMockMode: boolean;
  handleToggleOptIn: (newVal: boolean) => Promise<void>;
  handleSaveLeaderboardName: () => Promise<void>;
}

export function LeaderboardSettings({
  optedIn,
  optedInName,
  setOptedInName,
  isMockMode,
  handleToggleOptIn,
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
        🏆 Global Leaderboard Settings
      </h3>
      <p style={{ margin: "0 0 16px", color: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}>
        Opt-in to show your water footprints and rankings publicly.
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

        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
          <input
            id="leaderboard-opt-in-chk"
            type="checkbox"
            checked={optedIn}
            onChange={(e) => handleToggleOptIn(e.target.checked)}
            disabled={isMockMode}
            style={{ width: "16px", height: "16px", cursor: "pointer" }}
          />
          <label
            htmlFor="leaderboard-opt-in-chk"
            style={{
              fontSize: "0.8125rem",
              color: "#8cdbfd",
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            Opt-in to Global Leaderboard rankings
          </label>
        </div>
      </div>
    </div>
  );
}
