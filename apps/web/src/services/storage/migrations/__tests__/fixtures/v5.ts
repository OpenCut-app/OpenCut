export const v5Project = {
	id: "project-v5-456",
	version: 5,
	metadata: {
		id: "project-v5-456",
		name: "My V5 Project",
		thumbnail: "data:image/png;base64,abc123",
		duration: 30,
		createdAt: "2024-06-01T10:00:00.000Z",
		updatedAt: "2024-06-01T14:00:00.000Z",
	},
	settings: {
		fps: 30,
		canvasSize: { width: 1920, height: 1080 },
		background: { type: "color", color: "#000000" },
	},
	currentSceneId: "scene-main",
	scenes: [
		{
			id: "scene-main",
			name: "Main scene",
			isMain: true,
			tracks: [
				{
					id: "track-1",
					type: "video",
					name: "Video Track",
					isMain: true,
					elements: [],
				},
			],
			bookmarks: [2.0, 5.5, 12.0],
			createdAt: "2024-06-01T10:00:00.000Z",
			updatedAt: "2024-06-01T14:00:00.000Z",
		},
		{
			id: "scene-intro",
			name: "Intro",
			isMain: false,
			tracks: [
				{
					id: "track-2",
					type: "video",
					name: "Video Track",
					isMain: true,
					elements: [],
				},
			],
			bookmarks: [],
			createdAt: "2024-06-01T10:00:00.000Z",
			updatedAt: "2024-06-01T14:00:00.000Z",
		},
	],
};
