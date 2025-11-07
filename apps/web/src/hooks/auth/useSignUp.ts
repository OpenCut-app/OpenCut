import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signUp, signIn } from "@opencut/auth/client";

export function useSignUp() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleSignUp = useCallback(async () => {
    setError(null);
    setIsEmailLoading(true);

    const { error } = await signUp.email({
      name,
      email,
      password,
    });

    if (error) {
      setError(error.message || "An unexpected error occurred.");
      setIsEmailLoading(false);
      return;
    }

    router.push("/login");
  }, [name, email, password, router]);

  const handleGoogleSignUp = useCallback(async () => {
    setError(null);
    setIsGoogleLoading(true);

    try {
      await signIn.social({
        provider: "google",
      });

      router.push("/editor");
    } catch (error) {
      setError("Failed to sign up with Google. Please try again.");
      setIsGoogleLoading(false);
    }
  }, [router]);

  const isAnyLoading = isEmailLoading || isGoogleLoading;

  return {
    name,
    setName,
    email,
    setEmail,
    password,
    setPassword,
    error,
    isEmailLoading,
    isGoogleLoading,
    isAnyLoading,
    handleSignUp,
    handleGoogleSignUp,
  };
}
