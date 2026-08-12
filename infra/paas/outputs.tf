output "neon_project_id" {
  description = "Neon project id."
  value       = neon_project.pilot.id
}

output "database_url_pooled" {
  description = "Pooled DATABASE_URL for the API (Render)."
  value       = neon_project.pilot.connection_uri_pooler
  sensitive   = true
}

output "database_url_direct" {
  description = "Direct DATABASE_URL for migrations / seed (GitHub Actions or laptop)."
  value       = neon_project.pilot.connection_uri
  sensitive   = true
}

output "vercel_project_id" {
  description = "Vercel project id."
  value       = vercel_project.web.id
}

output "render_api_url" {
  description = "Expected Render API origin (must match render.yaml service name)."
  value       = var.render_api_url
}

output "next_steps" {
  description = "Human checklist after apply."
  value       = <<-EOT
    1. tofu output -raw database_url_pooled  → paste into Render as DATABASE_URL
    2. Set Render secret JWT_ACCESS_SECRET (openssl rand -hex 32)
    3. Connect this repo's render.yaml Blueprint in the Render dashboard (plan: free)
    4. tofu output -raw database_url_direct → migrate+seed (needs PILOT_COACH_PASSWORD):
         DATABASE_URL=… pnpm db:migrate && DATABASE_URL=… pnpm db:seed
    5. Open https://<vercel-domain> → sign in as coach@pilot.local
    6. Expect a cold start on first API hit (Render free spins down after idle)
  EOT
}
