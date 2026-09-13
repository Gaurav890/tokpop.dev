import { defineRailway, github, postgres, preserve, project, service } from 'railway/iac';

export default defineRailway(() => {
  const database = postgres('database');

  const api = service('api', {
    source: github('Gaurav890/ai-native-profile'),
    build: 'pnpm build',
    start: 'pnpm db:migrate && pnpm start',
    healthcheck: '/api/health',
    env: {
      NODE_ENV: 'production',
      DATABASE_URL: database.env.DATABASE_URL,
      DATABASE_SSL: 'disable',
      PUBLIC_APP_URL: preserve(),
      SESSION_SECRET: preserve(),
      GITHUB_CLIENT_ID: preserve(),
      GITHUB_CLIENT_SECRET: preserve(),
    },
  });

  return project('ai-native-profile', { resources: [database, api] });
});
