terraform {
  required_version = ">= 1.10.0" # use_lockfile on the S3 backend

  required_providers {
    neon = {
      source  = "kislerdm/neon"
      version = "~> 0.9"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "~> 2.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.9"
    }
  }

  # State lives on Cloudflare R2 (same bucket and pattern as the demo-infra repo, own key). CI only:
  # the endpoint comes from -backend-config=backend.hcl, the key pair from AWS_ACCESS_KEY_ID /
  # AWS_SECRET_ACCESS_KEY, and encryption from TF_ENCRYPTION (see scripts/infra/tf-env.sh).
  backend "s3" {
    bucket                      = "demo-infra-tfstate"
    key                         = "gymos/paas"
    region                      = "auto"
    use_path_style              = true
    use_lockfile                = true
    skip_s3_checksum            = true
    skip_credentials_validation = true
    skip_region_validation      = true
    skip_requesting_account_id  = true
    skip_metadata_api_check     = true
  }
}
