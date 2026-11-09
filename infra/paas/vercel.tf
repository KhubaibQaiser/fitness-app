# Next.js web on Vercel free. Browser stays same-origin; /v1,/gate,/health
# are rewritten to Render via API_ORIGIN (see apps/web/next.config.mjs).

locals {
  # Defaults to Render so production is unchanged until api_origin is set (ADR-0016 cutover).
  api_origin = var.api_origin != "" ? var.api_origin : var.render_api_url
}

resource "vercel_project" "web" {
  team_id         = var.vercel_team_id != "" ? var.vercel_team_id : null
  name            = var.project_name
  framework       = var.vercel_framework
  root_directory  = "apps/web"
  install_command = "cd ../.. && corepack enable && pnpm install --frozen-lockfile"
  build_command   = "cd ../.. && pnpm --filter @gymos/web build"
  # Do not set output_directory for Next.js — Vercel owns the .next layout.
  node_version = "22.x"

  git_repository = var.manage_vercel_git ? {
    type              = "github"
    repo              = var.github_repo
    production_branch = var.git_production_branch
  } : null

  # Public production URL so /gate/enter?key=… works on the coach's phone.
  vercel_authentication = {
    deployment_type = "none"
  }
}

# API_ORIGIN is its own resource (adopted by the import block below) because the project's inline
# `environment` cannot adopt a variable that already exists. This is the cutover switch (api_origin).
resource "vercel_project_environment_variable" "web_api_origin" {
  project_id = vercel_project.web.id
  team_id    = var.vercel_team_id != "" ? var.vercel_team_id : null
  key        = "API_ORIGIN"
  value      = local.api_origin
  target     = ["production", "preview"]
  sensitive  = false
}

# Existing variable on the production web project; a no-op once it is in state.
import {
  to = vercel_project_environment_variable.web_api_origin
  id = "team_OpgANjI9xXc4bjJpbev3uRpk/prj_7f5IIQz5ccsV0YZUUlC2Q7r312hv/9P3W3GnLugMlcqM8"
}

# --- API on Vercel (ADR-0016) -------------------------------------------------
# Secrets come from CI (TF_VAR_*) and live only in the encrypted R2 state. Nothing is set by hand
# in the dashboard. The build bundles the workspace TypeScript and the tenant manifest into the
# function (Vercel's zero-config functions cannot run workspace packages).

resource "random_password" "api_cron" {
  count   = var.manage_vercel_api ? 1 : 0
  length  = 40
  special = false
}

locals {
  api_database_url = var.api_use_production_db ? local.production_pooled_url : local.vercel_test_pooled_url

  api_env_plain = {
    AI_MODE              = "fallback"
    TENANT_TIMEZONE      = "Asia/Karachi"
    TENANT_MANIFEST_PATH = var.api_tenant_manifest_path
    EMAIL_FROM           = var.api_email_from
  }
  api_env_secret = var.manage_vercel_api ? {
    DATABASE_URL      = local.api_database_url
    JWT_ACCESS_SECRET = var.api_jwt_access_secret
    OTP_PEPPER        = var.api_otp_pepper
    RESEND_API_KEY    = var.api_resend_api_key
    CRON_SECRET       = random_password.api_cron[0].result
  } : {}
}

resource "vercel_project" "api" {
  count   = var.manage_vercel_api ? 1 : 0
  team_id = var.vercel_team_id != "" ? var.vercel_team_id : null

  name            = var.api_project_name
  root_directory  = "apps/api"
  install_command = "cd ../.. && corepack enable && pnpm install --frozen-lockfile --filter @gymos/api..."
  # Bundles the API into .vercel/output (Build Output API); see apps/api/scripts/build-vercel.mjs.
  build_command = "node scripts/build-vercel.mjs"
  node_version  = "22.x"

  serverless_function_region = var.api_serverless_region

  git_repository = var.manage_vercel_git ? {
    type              = "github"
    repo              = var.github_repo
    production_branch = var.git_production_branch
  } : null

  # The API is public (browsers and the mobile app call it directly).
  vercel_authentication = {
    deployment_type = "none"
  }

  environment = concat(
    [for k, v in local.api_env_plain : { key = k, value = v, target = ["production", "preview"] }],
    [for k, v in local.api_env_secret : { key = k, value = v, target = ["production", "preview"], sensitive = true }],
  )

  lifecycle {
    precondition {
      condition     = var.manage_neon_test_branch || var.api_use_production_db
      error_message = "The Vercel API needs a database: enable manage_neon_test_branch or api_use_production_db."
    }
    precondition {
      condition     = length(var.api_jwt_access_secret) >= 32 && length(var.api_otp_pepper) >= 32 && var.api_resend_api_key != "" && var.api_email_from != ""
      error_message = "Set api_jwt_access_secret and api_otp_pepper (both >= 32 chars, as the API requires), api_resend_api_key and api_email_from (TF_VAR_* from CI secrets)."
    }
  }
}

resource "vercel_project_domain" "web" {
  count      = var.web_domain != "" ? 1 : 0
  project_id = vercel_project.web.id
  team_id    = var.vercel_team_id != "" ? var.vercel_team_id : null
  domain     = var.web_domain
}

resource "vercel_project_domain" "api" {
  count      = var.manage_vercel_api && var.api_domain != "" ? 1 : 0
  project_id = vercel_project.api[0].id
  team_id    = var.vercel_team_id != "" ? var.vercel_team_id : null
  domain     = var.api_domain
}
