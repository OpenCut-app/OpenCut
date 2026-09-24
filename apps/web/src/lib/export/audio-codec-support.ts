const CANDIDATE_CONFIGS: AudioEncoderConfig[] = [
	{
		codec: "mp4a.40.2",
		sampleRate: 44100,
		numberOfChannels: 2,
		bitrate: 192000,
	},
	{
		codec: "mp4a.40.2",
		sampleRate: 44100,
		numberOfChannels: 2,
		bitrate: 128000,
	},
	{
		codec: "mp4a.40.2",
		sampleRate: 44100,
		numberOfChannels: 1,
		bitrate: 128000,
	},
	{
		codec: "mp4a.40.2",
		sampleRate: 48000,
		numberOfChannels: 2,
		bitrate: 128000,
	},
];

export async function resolveSupportedMp4AudioConfig(): Promise<AudioEncoderConfig | null> {
	if (typeof AudioEncoder === "undefined") {
		return null;
	}

	for (const config of CANDIDATE_CONFIGS) {
		try {
			const support = await AudioEncoder.isConfigSupported(config);
			if (support.supported) {
				return config;
			}
		} catch {
			continue;
		}
	}

	return null;
}
