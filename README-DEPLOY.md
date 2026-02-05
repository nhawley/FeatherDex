# Deploying Pokemon Wiki to Vercel

This guide explains how to deploy your Pokemon Wiki to Vercel.

## Prerequisites

1. Install Vercel CLI globally:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

## Deployment Methods

### Method 1: Using the Deployment Script (Recommended)

The easiest way to deploy is using the provided script:

```bash
# Make the script executable (first time only)
chmod +x deploy-pokemon.sh

# Deploy to preview (test deployment)
./deploy-pokemon.sh

# Deploy to production
./deploy-pokemon.sh --prod
```

The script will:
1. Build the wiki from the pokemon folder
2. Create a clean deployment directory
3. Copy the built HTML file
4. Deploy to Vercel

### Method 2: Deploy from pokemon folder

You can also deploy directly from the pokemon folder:

```bash
cd pokemon
vercel
```

For production:
```bash
cd pokemon
vercel --prod
```

### Method 3: GitHub Integration

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Add New Project"
4. Import your GitHub repository
5. Set root directory to `pokemon`
6. Deploy

Vercel will automatically redeploy when you push changes to GitHub.

## Updating the Deployment

To update your deployed wiki:

1. Make changes to your pokemon markdown files
2. Run the deployment script:
   ```bash
   ./deploy-pokemon.sh --prod
   ```

Or if deploying from the pokemon folder:
```bash
npm run folder -- pokemon --build
cd pokemon
vercel --prod
```

## Configuration Files

- `deploy-pokemon.sh` - Deployment script
- `pokemon/vercel.json` - Vercel configuration for direct deployment
- `.vercelignore` - Files to ignore during deployment

## Troubleshooting

### "vercel: command not found"
Install the Vercel CLI:
```bash
npm install -g vercel
```

### Build errors
Make sure all dependencies are installed:
```bash
npm install
```

### Changes not showing up
Make sure to rebuild before deploying:
```bash
npm run folder -- pokemon --build
```

## Custom Domain

To add a custom domain:

1. Deploy your site
2. Go to your project on vercel.com
3. Go to Settings → Domains
4. Add your custom domain
5. Follow the DNS configuration instructions

## Environment Variables

If you need to add environment variables:

1. Go to your project on vercel.com
2. Go to Settings → Environment Variables
3. Add your variables
4. Redeploy for changes to take effect
