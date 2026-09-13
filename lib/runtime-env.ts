import { getDatabase } from '@/db/client';

export const runtimeEnv = {
  get DB() {
    return getDatabase();
  },
  get GITHUB_CLIENT_ID() {
    return process.env.GITHUB_CLIENT_ID;
  },
  get GITHUB_CLIENT_SECRET() {
    return process.env.GITHUB_CLIENT_SECRET;
  },
  get SESSION_SECRET() {
    return process.env.SESSION_SECRET;
  },
  get PUBLIC_APP_URL() {
    return process.env.PUBLIC_APP_URL;
  },
};
