import { StorageMigration } from "./base";
import type { ProjectRecord } from "./transformers/types";
import { transformProjectV4ToV5 } from "./transformers/v4-to-v5";

export class V4toV5Migration extends StorageMigration {
	from = 4;
	to = 5;

	async transform(project: ProjectRecord): Promise<{
		project: ProjectRecord;
		skipped: boolean;
		reason?: string;
	}> {
		return transformProjectV4ToV5({ project });
	}
}
