export const FUNCTION_NAME: string;
export const outputConfig: () => {
  version: number;
  routes: { src: string; dest: string }[];
  crons: { path: string; schedule: string }[];
};
export const functionConfig: () => {
  runtime: string;
  handler: string;
  launcherType: string;
  shouldAddHelpers: boolean;
  maxDuration: number;
};
