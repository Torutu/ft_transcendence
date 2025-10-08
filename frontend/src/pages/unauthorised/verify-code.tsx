// frontend/src/pages/unauthorised/verify-code.tsx
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../../utils/api";
import { Alert } from "../../components/general";
import { useAuth } from "../../contexts/AuthContext";

// Types
type VerificationType = "email-verification" | "login-2fa";

interface VerificationConfig {
  title: string;
  description: string;
  endpoint: string;
  resendContext: string;
  sessionKeys: {
    userId: string;
    email: string;
  };
  fallbackRoute: string;
  onSuccess: (response: any, navigate: any, login: any, setError: any) => void;
}

// Utility function to mask email
const maskEmail = (email: string): string => {
  if (!email || !email.includes("@")) return email;

  const [username, domain] = email.split("@");
  if (username.length <= 2) return email;

  const firstChar = username[0];
  const masked = "*".repeat(Math.max(username.length - 1, 7));
  return `${firstChar}${masked}@${domain}`;
};

export default function VerifyCodePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  // Determine verification type based on current route
  const verificationType: VerificationType =
    location.pathname === "/verify-email" ? "email-verification" : "login-2fa";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  // Configuration based on verification type
  const getConfig = (): VerificationConfig => {
    if (verificationType === "email-verification") {
      return {
        title: "Verify Your Email",
        description: "We've sent a 6-digit verification code to",
        endpoint: "/auth/verify-email",
        resendContext: "email-verification",
        sessionKeys: { userId: "pendingUserId", email: "pendingEmail" },
        fallbackRoute: "/register",
        onSuccess: (response, navigate, login, setError) => {
          sessionStorage.removeItem("pendingUserId");
          sessionStorage.removeItem("pendingEmail");
          navigate("/login", {
            state: {
              message: "Email verified successfully! Please login to continue.",
              email: email || sessionStorage.getItem("pendingEmail"),
            },
          });
        },
      };
    } else {
      return {
        title: "2FA Verification",
        description:
          "We've sent a 6-digit verification code to your email address. Please check your inbox and enter the code below.",
        endpoint: "/auth/verify-2fa",
        resendContext: "login-2fa",
        sessionKeys: { userId: "userId", email: "userEmail" },
        fallbackRoute: "/login",
        onSuccess: (response, navigate, login, setError) => {
          sessionStorage.removeItem("userId");
          sessionStorage.removeItem("url");
          if (response.data.user) {
            login(response.data.user);
            navigate("/lobby", { replace: true });
          } else {
            setError("Authentication failed. Please try again.");
          }
        },
      };
    }
  };

  const config = getConfig();

  // Get data from navigation state or sessionStorage
  const stateData = location.state || {};
  const userId =
    stateData.userId || sessionStorage.getItem(config.sessionKeys.userId);
  const email =
    stateData.email || sessionStorage.getItem(config.sessionKeys.email);

  // Session storage management
  useEffect(() => {
    if (stateData.userId && stateData.email) {
      sessionStorage.setItem(config.sessionKeys.userId, stateData.userId);
      sessionStorage.setItem(config.sessionKeys.email, stateData.email);
    } else if (!userId) {
      navigate(config.fallbackRoute);
    }
  }, [stateData, userId, navigate, config.fallbackRoute, config.sessionKeys]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError("Please enter the verification code");
      return;
    }

    if (!userId) {
      setError("Invalid session. Please try again.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await api.post(config.endpoint, {
        userId: parseInt(userId),
        code,
      });

      config.onSuccess(response, navigate, login, setError);
    } catch (error: any) {
      setError(
        error.response?.data?.message ||
          "Verification failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!userId) return;

    setIsResending(true);
    setError("");
    setSuccess("");

    try {
      await api.post("/auth/resend-verification-code", {
        userId: parseInt(userId),
        context: config.resendContext,
      });

      setSuccess("A new verification code has been sent to your email");
      setTimeout(() => setSuccess(""), 5000);
    } catch (error: any) {
      setError(
        error.response?.data?.message ||
          "Failed to resend code. Please try again."
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setCode(value);
    setError("");
    setSuccess("");
  };

  // Display masked email
  const displayEmail = email ? maskEmail(email) : "";

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white">Invalid session. Please try again.</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-900 text-white">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="/background/default-gray.jpg"
          alt="background"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gray-900 bg-opacity-60"></div>
      </div>

      {/* Content */}
      <div className="relative flex flex-col md:flex-row bg-gray-800 rounded-2xl shadow-2xl overflow-hidden w-full max-w-4xl mx-4">
        {/* Form Side */}
        <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
          <h1 className="text-3xl font-extrabold text-center mb-2 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            {config.title}
          </h1>

          <p className="text-gray-300 text-center mb-6">
            {verificationType === "email-verification"
              ? `${config.description} ${displayEmail}`
              : config.description}
          </p>

          <Alert type="error" message={error} />
          <Alert type="success" message={success} />

          <form onSubmit={handleVerify} className="space-y-4">
            <input
              type="text"
              placeholder="Enter 6-digit code"
              value={code}
              onChange={handleChange}
              autoFocus
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 placeholder-gray-400 text-white bg-gray-900 transition text-center text-xl tracking-widest"
            />

            <button
              type="submit"
              disabled={isLoading || code.length !== 6}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed active:scale-95 transition-transform text-white py-2 px-4 rounded-lg flex justify-center items-center shadow-md"
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : verificationType === "email-verification" ? (
                "Verify Email"
              ) : (
                "Verify & Login"
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm space-y-3">
            <p className="text-gray-400">
              Didn't receive the code?{" "}
              <button
                onClick={handleResendCode}
                disabled={isResending}
                className="text-blue-400 hover:text-blue-300 underline"
              >
                {isResending ? "Sending..." : "Request new code"}
              </button>
            </p>

            <button
              onClick={() => navigate(config.fallbackRoute)}
              className="text-blue-400 hover:text-blue-300 underline text-sm"
            >
              {verificationType === "email-verification"
                ? "Back to Register"
                : "Back to Login"}
            </button>
          </div>
        </div>

        {/* Right Side Image */}
        <div className="hidden md:block md:w-1/2">
          <img
            src={
              verificationType === "email-verification"
                ? "/background/verifyEmail.png"
                : "/background/verify2FA.png"
            }
            alt={`${config.title} Visual`}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}
