export { StorageMigration } from "./base";
import { V0toV1Migration } from "./v0-to-v1";
import { V1toV2Migration } from "./v1-to-v2";
import { V2toV3Migration } from "./v2-to-v3";
import { V3toV4Migration } from "./v3-to-v4";
import { V4toV5Migration } from "./v4-to-v5";
import { V5toV6Migration } from "./v5-to-v6";
export { runStorageMigrations } from "./runner";
export type { MigrationProgress } from "./runner";

export const CURRENT_PROJECT_VERSION = 6;

export const migrations = [
	new V0toV1Migration(),
	new V1toV2Migration(),
	new V2toV3Migration(),
	new V3toV4Migration(),
	new V4toV5Migration(),
	new V5toV6Migration(),
];
