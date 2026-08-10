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
    suspend_timeout_seconds  = 300
  }

  branch {
    name          = "main"
    database_name = "gymos"
    role_name     = "gymos"
  }
}
