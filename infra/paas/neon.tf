# Neon free-tier project — app data only.
# Queue/pg-boss is intentionally omitted on this PaaS pilot path (worker stripped).

resource "neon_project" "pilot" {
  name       = var.project_name
  region_id  = var.neon_region_id
  pg_version = var.neon_pg_version
  org_id     = var.neon_org_id

  history_retention_seconds = 21600 # 6h free-tier PITR window

  default_endpoint_settings {
    autoscaling_limit_min_cu = 0.25
    autoscaling_limit_max_cu = 0.25
  }

  branch {
    name          = "main"
    database_name = "gymos"
    role_name     = "gymos"
  }
}

# --- Test branch for the Vercel API (ADR-0016) --------------------------------
# Copy-on-write branch of production; the Vercel API is tested against this
# until cutover so it never touches production data.

resource "neon_branch" "vercel_test" {
  count      = var.manage_neon_test_branch ? 1 : 0
  project_id = neon_project.pilot.id
  parent_id  = neon_project.pilot.default_branch_id
  name       = "vercel-test"
}

resource "neon_endpoint" "vercel_test" {
  count          = var.manage_neon_test_branch ? 1 : 0
  project_id     = neon_project.pilot.id
  branch_id      = neon_branch.vercel_test[0].id
  type           = "read_write"
  pooler_enabled = true
}

locals {
  database_password = var.neon_database_password != "" ? var.neon_database_password : neon_project.pilot.database_password

  # The pooler host is the endpoint host with "-pooler" appended to its first label.
  # Production branch, pooled, with the real password (see neon_database_password).
  production_pooled_url = format(
    "postgresql://%s:%s@%s/%s?sslmode=require",
    neon_project.pilot.database_user,
    local.database_password,
    neon_project.pilot.database_host_pooler,
    neon_project.pilot.database_name,
  )

  vercel_test_pooled_url = var.manage_neon_test_branch ? format(
    "postgresql://%s:%s@%s/%s?sslmode=require",
    neon_project.pilot.database_user,
    local.database_password,
    replace(neon_endpoint.vercel_test[0].host, "/^([^.]+)/", "$1-pooler"),
    neon_project.pilot.database_name,
  ) : null
}
