// Type declaration for the platform-resolved migrate module.
// Metro picks `migrate.native.ts` on iOS/Android and `migrate.web.ts` on web;
// this .d.ts lets TypeScript resolve `from './migrate'` without a runtime file.
export function maybeImportLocalData(): Promise<void>;
