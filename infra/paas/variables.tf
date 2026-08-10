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
