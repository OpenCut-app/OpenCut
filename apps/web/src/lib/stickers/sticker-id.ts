export function parseStickerId({ stickerId }: { stickerId: string }): {
	providerId: string;
	providerValue: string;
} {
	const normalizedStickerId = stickerId.trim();
	if (!normalizedStickerId) {
		throw new Error("Sticker ID must be a non-empty string");
	}

	const separatorIndex = normalizedStickerId.indexOf(":");
	if (
		separatorIndex <= 0 ||
		separatorIndex === normalizedStickerId.length - 1
	) {
		throw new Error(
			`Invalid sticker ID format: "${stickerId}". Expected "provider:value".`,
		);
	}

	const providerId = normalizedStickerId.slice(0, separatorIndex).trim();
	const providerValue = normalizedStickerId.slice(separatorIndex + 1).trim();

	return { providerId, providerValue };
}

export function buildStickerId({
	providerId,
	providerValue,
}: {
	providerId: string;
	providerValue: string;
}): string {
	return `${providerId}:${providerValue}`;
}
