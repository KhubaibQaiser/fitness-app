# Credentials via env (never commit secrets):
#   NEON_API_KEY
#   VERCEL_API_TOKEN
#   VERCEL_TEAM_ID (optional; required for team accounts)

provider "neon" {}

provider "vercel" {
  # api_token defaults to VERCEL_API_TOKEN
  # team defaults to VERCEL_TEAM_ID when set
}
