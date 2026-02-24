import { StorageMigration } from "./base";
import type { ProjectRecord } from "./transformers/types";
import { transformProjectV5ToV6 } from "./transformers/v5-to-v6";

export class V5toV6Migration extends StorageMigration {
	from = 5;
	to = 6;

	async transform(project: ProjectRecord): Promise<{
		project: ProjectRecord;
		skipped: boolean;
		reason?: string;
	}> {
		return transformProjectV5ToV6({ project });
	}
}
