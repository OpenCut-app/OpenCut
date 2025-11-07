import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@opencut/auth/client";

export function useLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleLogin = useCallback(async () => {
    setError(null);
    setIsEmailLoading(true);

    const { error } = await signIn.email({
      email,
      password,
    });

    if (error) {
      setError(error.message || "An unexpected error occurred.");
      setIsEmailLoading(false);
      return;
    }

    router.push("/projects");
  }, [router, email, password]);

  const handleGoogleLogin = async () => {
    setError(null);
    setIsGoogleLoading(true);

    try {
      await signIn.social({
        provider: "google",
        callbackURL: "/projects",
      });
    } catch (error) {
      setError("Failed to sign in with Google. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  const isAnyLoading = isEmailLoading || isGoogleLoading;

  return {
    email,
    setEmail,
    password,
    setPassword,
    error,
    isEmailLoading,
    isGoogleLoading,
    isAnyLoading,
    handleLogin,
    handleGoogleLogin,
  };
}
