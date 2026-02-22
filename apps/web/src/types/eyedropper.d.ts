interface EyeDropperResult {
	sRGBHex: string;
}

interface EyeDropper {
	open(options?: { signal?: AbortSignal }): Promise<EyeDropperResult>;
}

declare const EyeDropper:
	| {
			new (): EyeDropper;
	  }
	| undefined;
