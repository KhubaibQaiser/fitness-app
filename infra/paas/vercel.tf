# Next.js web on Vercel free. Browser stays same-origin; /v1,/gate,/health
# are rewritten to Render via API_ORIGIN (see apps/web/next.config.mjs).

resource "vercel_project" "web" {
  name            = var.project_name
  framework       = var.vercel_framework
  root_directory  = "apps/web"
  install_command = "cd ../.. && corepack enable && pnpm install --frozen-lockfile"
  build_command   = "cd ../.. && pnpm --filter @gymos/web build"
  # Do not set output_directory for Next.js — Vercel owns the .next layout.
  node_version    = "22.x"

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
      value     = var.render_api_url
      target    = ["production", "preview"]
      sensitive = false
    },
  ]
}
