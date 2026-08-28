import { DefinitionRegistry } from "@/lib/registry";
import type { TransformDefinition } from "@/lib/transforms/types";

export class TransformsRegistry extends DefinitionRegistry<
	string,
	TransformDefinition
> {
	constructor() {
		super("transform");
	}
}

export const transformsRegistry = new TransformsRegistry();
