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
    <div className="bento-card" style={{ marginBottom: "var(--space-md)" }}>
      <h3>🏆 Global Leaderboard Nickname</h3>
      <p
        style={{
          marginBottom: "var(--space-sm)",
          fontSize: "0.8rem",
          color: "var(--color-text-secondary)"
        }}
      >
        Set a custom nickname to display on the public leaderboard. Defaults to your email username.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <label
            style={{
              fontSize: "0.85rem",
              color: "var(--color-text-secondary)",
              fontWeight: "bold"
            }}
          >
            Display Name:
          </label>
          <input
            type="text"
            value={optedInName}
            onChange={(e) => setOptedInName(e.target.value)}
            disabled={isMockMode}
            style={{
              background: "rgba(0, 240, 255, 0.03)",
              border: "1px solid rgba(0, 240, 255, 0.15)",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "0.85rem",
              padding: "8px 16px",
              outline: "none",
              fontFamily: "var(--font-body)",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease"
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "var(--color-cyan)";
              e.target.style.boxShadow = "0 0 10px rgba(0, 240, 255, 0.2)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(0, 240, 255, 0.15)";
              e.target.style.boxShadow = "none";
            }}
          />
          <button
            type="button"
            onClick={handleSaveLeaderboardName}
            disabled={isMockMode}
            style={{
              minHeight: "36px",
              padding: "0 16px"
            }}
          >
            Save Name
          </button>
        </div>
      </div>
    </div>
  );
}
