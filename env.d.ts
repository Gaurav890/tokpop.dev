declare namespace Cloudflare {
  interface Env {
    FILES: R2Bucket;
    GITHUB_CLIENT_ID?: string;
    GITHUB_CLIENT_SECRET?: string;
    SESSION_SECRET?: string;
    PUBLIC_APP_URL?: string;
    MCP_BEARER_SECRET?: string;
  }
}
