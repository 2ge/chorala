// PM2 process definitions for the Chorala stack on this host.
// Secrets/config come from the repo-root .env (loaded by @heed/config at runtime);
// only NODE_ENV is set here. Start with: pm2 start ecosystem.config.cjs && pm2 save
const ROOT = '/home/claude/projects/idea'

const common = {
  cwd: ROOT,
  env: { NODE_ENV: 'production' },
  watch: false,
  max_restarts: 10,
  restart_delay: 3000,
}

module.exports = {
  apps: [
    {
      ...common,
      name: 'heed-api',
      script: 'npx',
      args: 'tsx apps/api/src/server.ts',
    },
    {
      ...common,
      name: 'heed-worker',
      script: 'npx',
      args: 'tsx apps/worker/src/index.ts',
      max_restarts: 5,
      restart_delay: 5000,
    },
    {
      ...common,
      name: 'heed-dashboard',
      cwd: `${ROOT}/apps/dashboard`,
      script: 'npx',
      args: 'next start -p 3015',
    },
  ],
}
