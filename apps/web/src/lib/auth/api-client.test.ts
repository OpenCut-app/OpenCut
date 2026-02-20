import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { BackendAuthError, backendAuthApi } from "./api-client";

const originalFetch = globalThis.fetch;
const originalBaseUrl = process.env.NEXT_PUBLIC_API_URL;

describe("backend auth api client", () => {
	beforeEach(() => {
		process.env.NEXT_PUBLIC_API_URL = "http://localhost:3001/api";
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		if (typeof originalBaseUrl === "string") {
			process.env.NEXT_PUBLIC_API_URL = originalBaseUrl;
		} else {
			delete process.env.NEXT_PUBLIC_API_URL;
		}
	});

	test("refresh uses POST /auth/user/refresh and unwraps data payload", async () => {
		let requestUrl = "";
		let requestMethod = "";
		let requestCredentials = "";

		globalThis.fetch = (async (input, init) => {
			requestUrl = String(input);
			requestMethod = init?.method ?? "GET";
			requestCredentials = String(init?.credentials ?? "");

			return new Response(
				JSON.stringify({
					status: "success",
					data: {
						token: "jwt-access-token",
						user: {
							id: "1",
							email: "user@example.com",
						},
					},
				}),
				{
					status: 201,
					headers: { "Content-Type": "application/json" },
				},
			);
		}) as typeof fetch;

		const response = await backendAuthApi.refresh();

		expect(requestUrl).toBe("http://localhost:3001/api/auth/user/refresh");
		expect(requestMethod).toBe("POST");
		expect(requestCredentials).toBe("include");
		expect(response.token).toBe("jwt-access-token");
		expect(response.user.email).toBe("user@example.com");
	});

	test("throws BackendAuthError when backend returns wrapped error in 2xx", async () => {
		globalThis.fetch = (async () =>
			new Response(
				JSON.stringify({
					status: "error",
					message: "Invalid refresh token",
					statusCode: 401,
				}),
				{
					status: 201,
					headers: { "Content-Type": "application/json" },
				},
			)) as typeof fetch;

		const refreshPromise = backendAuthApi.refresh();

		await expect(refreshPromise).rejects.toBeInstanceOf(BackendAuthError);
		await expect(refreshPromise).rejects.toMatchObject({
			message: "Invalid refresh token",
			statusCode: 401,
		});
	});
});
