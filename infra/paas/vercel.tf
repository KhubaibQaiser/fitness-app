# Next.js web on Vercel free. Browser stays same-origin; /v1,/gate,/health
# are rewritten to Render via API_ORIGIN (see apps/web/next.config.mjs).

locals {
  # Defaults to Render so production is unchanged until api_origin is set (ADR-0016 cutover).
  api_origin = var.api_origin != "" ? var.api_origin : var.render_api_url
}

resource "vercel_project" "web" {
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

  environment = [
    {
      key       = "API_ORIGIN"
      value     = local.api_origin
      target    = ["production", "preview"]
      sensitive = false
    },
  ]
}

# --- API on Vercel (ADR-0016) -------------------------------------------------
# Secrets are NOT managed here (same convention as Render): set DATABASE_URL
# (Neon pooled), JWT_ACCESS_SECRET, OTP_PEPPER, RESEND_API_KEY, EMAIL_FROM and
# CRON_SECRET in the Vercel dashboard, so they never land in OpenTofu state.
#
# One setting the provider cannot express: enable "Include source files outside
# of the Root Directory" on this project (needed for ../../infra/tenants/**).

resource "vercel_project" "api" {
  count = var.manage_vercel_api ? 1 : 0

  name            = var.api_project_name
  root_directory  = "apps/api"
  install_command = "cd ../.. && corepack enable && pnpm install --frozen-lockfile --filter @gymos/api..."
  node_version    = "22.x"

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

  environment = [
    {
      key    = "AI_MODE"
      value  = "fallback"
      target = ["production", "preview"]
    },
    {
      key    = "TENANT_TIMEZONE"
      value  = "Asia/Karachi"
      target = ["production", "preview"]
    },
    {
      key    = "TENANT_MANIFEST_PATH"
      value  = var.api_tenant_manifest_path
      target = ["production", "preview"]
    },
  ]
}

resource "vercel_project_domain" "web" {
  count      = var.web_domain != "" ? 1 : 0
  project_id = vercel_project.web.id
  domain     = var.web_domain
}

resource "vercel_project_domain" "api" {
  count      = var.manage_vercel_api && var.api_domain != "" ? 1 : 0
  project_id = vercel_project.api[0].id
  domain     = var.api_domain
}
