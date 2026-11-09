# Credentials via env (never commit secrets):
#   NEON_API_KEY
#   VERCEL_API_TOKEN
#   TF_VAR_vercel_team_id (team accounts; the provider does not read VERCEL_TEAM_ID itself)

provider "neon" {}

provider "vercel" {
  # api_token defaults to VERCEL_API_TOKEN
  team = var.vercel_team_id != "" ? var.vercel_team_id : null
}
