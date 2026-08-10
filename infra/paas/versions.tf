terraform {
  required_version = ">= 1.6.0"

  required_providers {
    neon = {
      source  = "kislerdm/neon"
      version = "~> 0.9"
    }
    vercel = {
      source  = "vercel/vercel"
      version = "~> 2.0"
    }
  }

  # Optional: uncomment and point at your remote backend once you have one.
  # backend "s3" {}
}
