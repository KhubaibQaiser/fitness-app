variable "project_name" {
  type        = string
  description = "Base name for Neon project, Vercel project, and Render service."
  default     = "gymos-pilot"
}

variable "github_repo" {
  type        = string
  description = "GitHub repo as owner/name (must match the Vercel Git integration)."
  default     = "KhubaibQaiser/fitness-app"
}

variable "git_production_branch" {
  type        = string
  description = "Branch that triggers production deploys on Vercel / Render."
  default     = "main"
}

variable "neon_org_id" {
  type        = string
  description = "Neon Organization ID (Console → Settings → General). Required by Neon’s API."
}

variable "neon_region_id" {
  type        = string
  description = "Neon region id (e.g. aws-ap-southeast-1, aws-us-east-1)."
  default     = "aws-ap-southeast-1"
}

variable "neon_pg_version" {
  type        = number
  description = "Postgres major version for the Neon project."
  default     = 17
}

variable "vercel_framework" {
  type        = string
  description = "Vercel framework preset."
  default     = "nextjs"
}

variable "render_api_url" {
  type        = string
  description = <<-EOT
    Public HTTPS origin of the Render API service (no trailing slash).
    Must match the Blueprint service name: https://<service-name>.onrender.com
    Used as API_ORIGIN so Next.js rewrites keep the gate cookie same-origin.
  EOT
  default     = "https://gymos-api.onrender.com"
}

variable "manage_vercel_git" {
  type        = bool
  description = "Connect the GitHub repo to the Vercel project (requires Vercel GitHub app installed)."
  default     = true
}

# --- Vercel API migration (ADR-0016). Everything below is off by default, so an
# --- existing `tofu plan` shows no change until you opt in.

variable "manage_vercel_api" {
  type        = bool
  description = "Create the Vercel project that hosts the API (apps/api). Off until the Phase 0 spike is ready."
  default     = false
}

variable "api_project_name" {
  type        = string
  description = "Vercel project name for the API."
  default     = "gymos-api"
}

variable "api_serverless_region" {
  type        = string
  description = "Vercel function region; keep it next to Neon (aws-ap-southeast-1 is Singapore, sin1)."
  default     = "sin1"
}

variable "api_tenant_manifest_path" {
  type        = string
  description = "TENANT_MANIFEST_PATH for the Vercel API. UNVERIFIED: confirm where includeFiles places the file in the Phase 0 spike."
  default     = "infra/tenants/pilot.json"
}

variable "api_origin" {
  type        = string
  description = <<-EOT
    Origin the web app proxies /v1, /gate and /health to (API_ORIGIN). Empty keeps
    render_api_url, so production stays on Render. THIS IS THE CUTOVER SWITCH:
    set it to the Vercel API origin (and apply) to cut over; set it back to roll back.
    It sets API_ORIGIN for both the production and preview targets of the web project.
  EOT
  default     = ""
}

variable "web_domain" {
  type        = string
  description = "Custom domain for the web project (e.g. gymos.khubaibqaiser.com). Empty = none. DNS lives in the demo-infra repo."
  default     = ""
}

variable "api_domain" {
  type        = string
  description = "Custom domain for the API project (e.g. gymos-api.khubaibqaiser.com). Attach at the cutover rehearsal, not earlier. Ignored unless manage_vercel_api is true."
  default     = ""
}

variable "manage_neon_test_branch" {
  type        = bool
  description = "Create a copy-on-write Neon branch + pooled endpoint for testing the Vercel API against production-shaped data."
  default     = false
}
