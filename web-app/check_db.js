/* global fetch, console */
const supabaseUrl = "https://ffgynwxpjkrkwvkrucoz.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmZ3lud3hwamtya3d2a3J1Y296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5ODc4ODQsImV4cCI6MjA5ODU2Mzg4NH0.iijDhvQMy4AdlBVu3KvOmXAHb6MaSUK09568It-tUWk";

async function runAudit() {
  try {
    // 1. Get all leaderboard_profiles
    const profilesRes = await fetch(`${supabaseUrl}/rest/v1/leaderboard_profiles?select=*`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`
      }
    });
    const profiles = await profilesRes.json();
    console.log("=== Leaderboard Profiles ===");
    console.log(profiles);

    // 2. Get all profiles
    const profsRes = await fetch(`${supabaseUrl}/rest/v1/profiles?select=*`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`
      }
    });
    const profs = await profsRes.json();
    console.log("\n=== Profiles ===");
    console.log(profs);

    // 3. Get all usage_daily
    const usageRes = await fetch(`${supabaseUrl}/rest/v1/usage_daily?select=*`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`
      }
    });
    const usage = await usageRes.json();
    console.log("\n=== Usage Daily ===");
    console.log(usage);

    // 4. Get all leaderboard_entries_raw
    const entriesRes = await fetch(`${supabaseUrl}/rest/v1/leaderboard_entries_raw?select=*`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`
      }
    });
    const entries = await entriesRes.json();
    console.log("\n=== Leaderboard Entries Raw ===");
    console.log(entries);

  } catch (err) {
    console.error("Audit error:", err);
  }
}

runAudit();
