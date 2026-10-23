import { publicAppOrigin } from './public-origin';

export const CONNECTOR_VERSION = '0.2.3';
export const COLLECTOR_PREVIEW_COMMAND = `npm exec --yes --package=ai-native-profile@${CONNECTOR_VERSION} -- ai-native-profile preview`;

export function collectorConnectCommand(userCode: string, apiOrigin: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(userCode)) throw new Error('Invalid pairing code.');
  const origin = publicAppOrigin(apiOrigin).replaceAll("'", "'\\''");
  return `npm exec --yes --package=ai-native-profile@${CONNECTOR_VERSION} -- ai-native-profile connect --code ${userCode} --api-url '${origin}'`;
}
