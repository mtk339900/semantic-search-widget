# Deployment

Deploying a Nova.js application is straightforward thanks to its static-first architecture. This guide covers deploying to popular platforms, CI/CD pipelines, Docker containerization, and production performance tuning.

## Build Output

Before deploying, you need to create a production build:

```bash
npm run build
```

This generates the `dist/` directory with the following structure:

```
dist/
├── client/              # Client-side JavaScript bundles
│   ├── index.[hash].js
│   └── index.[hash].css
├── server/              # Server-side bundle (for SSR)
│   └── entry.js
├── prerendered/         # Static HTML pages (for SSG routes)
│   ├── index.html
│   └── about/index.html
├── public/              # Static assets
│   ├── favicon.ico
│   └── assets/
└── manifest.json        # Route and asset manifest
```

### Build Modes

Choose the right build mode based on your deployment target:

```javascript
// nova.config.js
export default {
  build: {
    // 'spa' for static hosting (no server required)
    // 'ssr' for Node.js server deployment
    // 'hybrid' for mixed SSG + SSR
    mode: 'hybrid',
  },
}
```

## Deploying to Vercel

Vercel is the recommended platform for Nova.js applications. It handles SSR, serverless functions, and edge caching automatically.

### Automatic Deployment

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Import the repository in the [Vercel dashboard](https://vercel.com/new)
3. Vercel auto-detects Nova.js and configures the build
4. Every push triggers an automatic deployment

### Manual Configuration

If auto-detection fails, create a `vercel.json`:

```json
{
  "builds": [
    {
      "src": "package.json",
      "use": "@nova-js/vercel-builder",
      "config": {
        "buildCommand": "npm run build",
        "outputDirectory": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/server/entry.js"
    }
  ]
}
```

### Environment Variables on Vercel

Set environment variables in the Vercel project settings:

1. Go to Project Settings → Environment Variables
2. Add your variables (e.g., `NOVA_AUTH_SECRET`)
3. Select the environments where each variable applies

## Deploying to AWS

### AWS Amplify

```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Initialize in your project
amplify init

# Add hosting
amplify add hosting
# Choose "Manual deployment" or "Continuous deployment (Git-based)"

# Deploy
amplify publish
```

### S3 + CloudFront (SPA Mode)

For static deployments, use S3 for hosting and CloudFront for the CDN:

```bash
# Build the application
npm run build

# Sync to S3
aws s3 sync dist/client s3://my-nova-app --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id E123456789 --paths "/*"
```

Create an S3 bucket policy for public read access and configure CloudFront with a custom error page that routes 404s to `index.html` for client-side routing.

### ECS / Fargate (SSR Mode)

For SSR deployments on AWS:

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3000
CMD ["node", "dist/server/entry.js"]
```

## Docker Deployment

### Building the Image

```bash
# Build the Docker image
docker build -t my-nova-app .

# Run locally to verify
docker run -p 3000:3000 my-nova-app
```

### Multi-Stage Dockerfile

Use a multi-stage build for minimal image size:

```dockerfile
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM base AS builder
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nova

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder --chown=nova:nodejs /app/dist ./dist
COPY --from=builder --chown=nova:nodejs /app/public ./public

USER nova

EXPOSE 3000

CMD ["node", "dist/server/entry.js"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - NOVA_AUTH_SECRET=${NOVA_AUTH_SECRET}
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'

  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - app
```

## CI/CD Pipelines

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy

test:
  image: node:20-alpine
  script:
    - npm ci
    - npm run lint
    - npm test

build:
  image: node:20-alpine
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/

deploy_staging:
  stage: deploy
  script:
    - npx vercel --token=$VERCEL_TOKEN --prod=false
  only:
    - develop

deploy_production:
  stage: deploy
  script:
    - npx vercel --token=$VERCEL_TOKEN --prod
  only:
    - main
```

## Health Checks

Add a health check endpoint for your deployment infrastructure:

```javascript
// src/server/health.js
export function healthCheck(req, res) {
  res.json({
    status: 'ok',
    version: process.env.npm_package_version,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  })
}
```

## Post-Deploy Verification

After deployment, run automated checks:

```bash
# Verify the deployment is responding
curl -f https://myapp.com/api/health || exit 1

# Check for console errors (using Lighthouse CI)
npx lhci autorun --collect.url=https://myapp.com

# Run a smoke test suite
npm run test:smoke
```

## Rollback Strategy

Nova.js supports instant rollbacks on platforms like Vercel. For self-hosted deployments:

1. Tag your Docker images with Git commit hashes
2. Keep the last 5 production images available
3. Use blue-green or canary deployment strategies

```bash
# Rollback to a specific version
docker run -p 3000:3000 my-nova-app:sha-abc1234
```