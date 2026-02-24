import { getBackendApiBaseUrl } from "@/lib/backend-api";

export type TBackendAuthError = {
	status?: string;
	message?: string;
	statusCode?: number;
};

export type TBackendUser = {
	id: string;
	username?: string;
	email: string;
	firstname?: string;
	lastname?: string;
	role?: number;
	created_at?: string;
	updated_at?: string;
};

export type TWorkspace = {
	id: string;
	organisation_id: string;
	name: string;
	created_at: string;
	updated_at: string;
};

export type TOrganisation = {
	id: string;
	name: string;
	created_at: string;
	updated_at: string;
};

type TAuthSuccessPayload<T> = T | { data: T };

export class BackendAuthError extends Error {
	public readonly statusCode: number;

	constructor({ message, statusCode = 500 }: { message: string; statusCode?: number }) {
		super(message);
		this.name = "BackendAuthError";
		this.statusCode = statusCode;
	}
}

const isWrappedErrorPayload = (
	payload: unknown,
): payload is { status: "error"; message?: string; statusCode?: number } => {
	if (!payload || typeof payload !== "object") {
		return false;
	}

	const candidate = payload as { status?: unknown };
	return candidate.status === "error";
};

const unwrapSuccessPayload = <T,>(payload: TAuthSuccessPayload<T>): T => {
	if (payload && typeof payload === "object" && "data" in payload) {
		return payload.data;
	}
	return payload as T;
};

const extractError = ({
	payload,
	defaultMessage,
	defaultStatusCode,
}: {
	payload: unknown;
	defaultMessage: string;
	defaultStatusCode: number;
}) => {
	if (payload && typeof payload === "object") {
		const errorPayload = payload as TBackendAuthError;
		return {
			message: errorPayload.message ?? defaultMessage,
			statusCode: errorPayload.statusCode ?? defaultStatusCode,
		};
	}

	return { message: defaultMessage, statusCode: defaultStatusCode };
};

async function request<T>({
	path,
	method = "GET",
	body,
	token,
}: {
	path: string;
	method?: "GET" | "POST";
	body?: unknown;
	token?: string | null;
}): Promise<T> {
	const url = `${getBackendApiBaseUrl()}${path}`;
	const response = await fetch(url, {
		method,
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		body: body ? JSON.stringify(body) : undefined,
	});

	let payload: unknown = null;
	try {
		payload = await response.json();
	} catch {
		payload = null;
	}

	if (isWrappedErrorPayload(payload)) {
		const { message, statusCode } = extractError({
			payload,
			defaultMessage: "Request failed",
			defaultStatusCode: response.status,
		});
		throw new BackendAuthError({ message, statusCode });
	}

	if (!response.ok) {
		const { message, statusCode } = extractError({
			payload,
			defaultMessage: `Request failed with status ${response.status}`,
			defaultStatusCode: response.status,
		});
		throw new BackendAuthError({ message, statusCode });
	}

	return unwrapSuccessPayload(payload as TAuthSuccessPayload<T>);
}

export const backendAuthApi = {
	getUserInit: () => request<boolean>({ path: "/auth/user/init" }),
	login: ({
		username,
		password,
	}: {
		username: string;
		password: string;
	}) =>
		request<{ token: string; user: TBackendUser }>({
			path: "/auth/user/login",
			method: "POST",
			body: { username, password },
		}),
	register: ({
		username,
		email,
		firstname,
		lastname,
		password,
		role = 1,
		organisation_name,
	}: {
		username: string;
		email: string;
		firstname: string;
		lastname: string;
		password: string;
		role?: number;
		organisation_name?: string;
	}) =>
		request<{ message: string; token: string; user: TBackendUser }>({
			path: "/auth/user/register",
			method: "POST",
			body: { username, email, firstname, lastname, password, role, organisation_name },
		}),
	refresh: () =>
		request<{ token: string; user: TBackendUser }>({
			path: "/auth/user/refresh",
			method: "POST",
		}),
	logout: () =>
		request<{ message?: string }>({
			path: "/auth/user/logout",
			method: "POST",
		}),
	getOrganisation: ({ token }: { token: string }) =>
		request<TOrganisation>({
			path: "/auth/user/organisation",
			method: "GET",
			token,
		}),
	getWorkspaces: ({ token }: { token: string }) =>
		request<TWorkspace[]>({
			path: "/auth/user/workspaces",
			method: "GET",
			token,
		}),
};
