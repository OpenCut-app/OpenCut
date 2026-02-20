export const getBackendApiBaseUrl = () => {
	const configuredBase = process.env.NEXT_PUBLIC_API_URL;
	return (configuredBase && configuredBase.length > 0 ? configuredBase : "/api").replace(
		/\/$/,
		"",
	);
};

const WORKSPACE_STORAGE_KEY = "vibecut_workspace_id";

export const getSelectedWorkspaceId = (): string | null => {
	if (typeof window === "undefined") return null;

	const fromStorage = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
	return fromStorage || null;
};

export const setSelectedWorkspaceId = ({ workspaceId }: { workspaceId: string }) => {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(WORKSPACE_STORAGE_KEY, workspaceId);
};
