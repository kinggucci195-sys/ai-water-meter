/* global fetch */

const projectUrl =
  process.env.VITE_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  "https://ffgynwxpjkrkwvkrucoz.supabase.co";
const publishableKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!publishableKey) {
  console.error(
    "Missing VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY. Use the Supabase publishable key."
  );
  process.exit(1);
}

const response = await fetch(`${projectUrl}/auth/v1/settings`, {
  headers: {
    apikey: publishableKey
  }
});

if (!response.ok) {
  console.error(`Unable to read Supabase auth settings: ${response.status} ${response.statusText}`);
  process.exit(1);
}

const settings = await response.json();
const providers = {
  github: settings.external?.github === true,
  google: settings.external?.google === true
};

console.log(JSON.stringify({ projectUrl, providers }, null, 2));

if (!providers.google || !providers.github) {
  console.log("\nNext required setup:");
  if (!providers.google) {
    console.log(
      "- Google: create a Google Web OAuth client, then enable Google in Supabase with its Client ID and Secret."
    );
  }
  if (!providers.github) {
    console.log(
      "- GitHub: create a GitHub OAuth App, then enable GitHub in Supabase with its Client ID and Secret."
    );
  }
}
