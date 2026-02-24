import { v2ToV3 } from "./v2-to-v3";
import { v3ToV4 } from "./v3-to-v4";

type MigrationFn = ({ state }: { state: unknown }) => unknown;

/**
 * key = version we're migrating from
 * value = migration function
 */
const migrations: Record<number, MigrationFn> = {
	2: v2ToV3,
	3: v3ToV4,
};

export const CURRENT_VERSION = 4;

export function runMigrations({
	state,
	fromVersion,
}: {
	state: unknown;
	fromVersion: number;
}): unknown {
	let current = state;
	for (let version = fromVersion; version < CURRENT_VERSION; version++) {
		const migrate = migrations[version];
		if (migrate) current = migrate({ state: current });
	}
	return current;
}
