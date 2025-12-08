export const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  success: (msg: string) => console.log(`[SUCCESS] ${msg}`),
  error: (msg: string, err?: any) => console.error(`[ERROR] ${msg}`, err || ''),
  warn: (msg: string) => console.log(`[WARN] ${msg}`),
};