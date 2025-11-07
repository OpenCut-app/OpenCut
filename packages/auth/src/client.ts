import { createAuthClient } from "better-auth/react";
import { keys } from "./keys";

const { NEXT_PUBLIC_BETTER_AUTH_URL } = keys();

export const { signIn, signUp, useSession } = createAuthClient({
  baseURL: NEXT_PUBLIC_BETTER_AUTH_URL,
});
