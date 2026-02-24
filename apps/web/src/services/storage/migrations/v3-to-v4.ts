import { StorageMigration } from "./base";
import type { ProjectRecord } from "./transformers/types";
import { transformProjectV3ToV4 } from "./transformers/v3-to-v4";

export class V3toV4Migration extends StorageMigration {
	from = 3;
	to = 4;

	async transform(project: ProjectRecord): Promise<{
		project: ProjectRecord;
		skipped: boolean;
		reason?: string;
	}> {
		return transformProjectV3ToV4({ project });
	}
}
