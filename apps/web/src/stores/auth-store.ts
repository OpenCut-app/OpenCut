"use client";

import { create } from "zustand";
import { backendAuthApi, type TBackendUser } from "@/lib/auth/api-client";
import { authSession } from "@/lib/auth/session";
import { storageService } from "@/services/storage/service";

type AuthStatus = "idle" | "loading" | "authenticated" | "unauthenticated";

type AuthState = {
	user: TBackendUser | null;
	status: AuthStatus;
	isInitialized: boolean;
	error: string | null;
	initialize: () => Promise<void>;
	login: ({
		username,
		password,
	}: {
		username: string;
		password: string;
	}) => Promise<void>;
	register: ({
		email,
		firstname,
		lastname,
		password,
		organisationName,
	}: {
		email: string;
		firstname: string;
		lastname: string;
		password: string;
		organisationName?: string;
	}) => Promise<void>;
	logout: () => Promise<void>;
	clearError: () => void;
};

const setAuthenticatedState = ({
	token,
	user,
	set,
}: {
	token: string;
	user: TBackendUser;
	set: (partial: Partial<AuthState>) => void;
}) => {
	authSession.setToken({ token });
	set({
		user,
		status: "authenticated",
		isInitialized: true,
		error: null,
	});
};

const clearAuthState = ({ set }: { set: (partial: Partial<AuthState>) => void }) => {
	authSession.clear();
	set({
		user: null,
		status: "unauthenticated",
		isInitialized: true,
		error: null,
	});
};

export const useAuthStore = create<AuthState>()((set, get) => ({
	user: null,
	status: "idle",
	isInitialized: false,
	error: null,
	initialize: async () => {
		if (get().isInitialized || get().status === "loading") {
			return;
		}

		set({ status: "loading", error: null });
		try {
			const response = await backendAuthApi.refresh();
			setAuthenticatedState({ token: response.token, user: response.user, set });
		} catch {
			clearAuthState({ set });
		}
	},
	login: async ({ username, password }) => {
		set({ status: "loading", error: null });
		try {
			const response = await backendAuthApi.login({ username, password });
			setAuthenticatedState({ token: response.token, user: response.user, set });
		} catch (error) {
			const message = error instanceof Error ? error.message : "Login failed";
			clearAuthState({ set });
			set({ error: message });
			throw error;
		}
	},
	register: async ({
		email,
		firstname,
		lastname,
		password,
		organisationName,
	}) => {
		set({ status: "loading", error: null });
		try {
			const response = await backendAuthApi.register({
				email,
				firstname,
				lastname,
				password,
				organisation_name: organisationName,
			});
			setAuthenticatedState({ token: response.token, user: response.user, set });
		} catch (error) {
			const message = error instanceof Error ? error.message : "Registration failed";
			clearAuthState({ set });
			set({ error: message });
			throw error;
		}
	},
	logout: async () => {
		set({ status: "loading", error: null });
		try {
			await backendAuthApi.logout();
		} catch {
			// Clear local state even if backend logout is unavailable/misconfigured.
		} finally {
			try {
				await storageService.clearAllData();
			} catch (error) {
				console.error("Failed to clear local data during logout:", error);
			}
			clearAuthState({ set });
		}
	},
	clearError: () => set({ error: null }),
}));
