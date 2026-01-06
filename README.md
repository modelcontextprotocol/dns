# MCP DNS Management

Infrastructure as Code for managing MCP Cloudflare DNS records using Pulumi.

DNS records are defined in [`src/config/records.ts`](src/config/records.ts), keyed by domain name.

## Deployment

### Production Deployment (Automated)

**Note:** Production deployment is automatically handled by GitHub Actions. All merges to the `main` branch trigger an automatic deployment via [the configured GitHub Actions workflow](.github/workflows/deploy.yml).

### Manual Deployment

Pre-requisites:

- [Pulumi CLI installed](https://www.pulumi.com/docs/iac/download-install/)
- [Google Cloud SDK installed](https://cloud.google.com/sdk/docs/install)
- Access to GCP project and GCS bucket
- Required credentials and secrets

1. Authenticate with GCP: `gcloud auth application-default login`
2. Get the passphrase file `passphrase.prod.txt` from the maintainers
3. Preview changes: `make preview`
4. Deploy changes: `make up`

## Initial Setup

If setting up this infrastructure for the first time:

### 1. Create GCS Bucket for Pulumi State

```bash
gcloud projects create mcp-dns-prod
gcloud config set project mcp-dns-prod
gcloud services enable storage.googleapis.com

# Create service account for CI/CD
gcloud iam service-accounts create pulumi-svc \
  --display-name="Pulumi Service Account"

gcloud projects add-iam-policy-binding mcp-dns-prod \
  --member="serviceAccount:pulumi-svc@mcp-dns-prod.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud iam service-accounts keys create sa-key.json \
  --iam-account=pulumi-svc@mcp-dns-prod.iam.gserviceaccount.com

# Create bucket
gsutil mb gs://mcp-dns-prod-pulumi-state
```

### 2. Create Cloudflare API Token

1. Go to [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. Create a token with **Zone:DNS:Edit** permission for the zones you want to manage
3. Note the token value

### 3. Initialize Pulumi Stack

```bash
# Login to Pulumi backend
pulumi login gs://mcp-dns-prod-pulumi-state

# Create production stack
export PULUMI_CONFIG_PASSPHRASE_FILE=passphrase.prod.txt
pulumi stack init prod

# Configure application secrets in Pulumi
pulumi config set --secret cloudflare:apiToken "your-api-token"
pulumi config set cloudflare:accountId "your-account-id"
```

You can find your Cloudflare Account ID in the Cloudflare dashboard URL or in the right sidebar of any zone's overview page.

### 4. Configure GitHub Actions Secrets

Add the CI/CD secrets to GitHub Actions (repository settings → Secrets and variables → Actions):

- `GCP_PROD_SERVICE_ACCOUNT_KEY`: Content of `sa-key.json`
- `PULUMI_PROD_PASSPHRASE`: The passphrase you set above
