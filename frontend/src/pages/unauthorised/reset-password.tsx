// frontend/src/pages/reset-password.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import validator from "validator";
import api from "../../utils/api";
import { Alert } from "../../components/general";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [unverifiedUserId, setUnverifiedUserId] = useState("");
  const [isResending, setIsResending] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setError("");
    setSuccessMessage("");
    setUnverifiedUserId("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validator.isEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post("/auth/reset-password", { email });
      setError("");
      setUnverifiedUserId("");
      setSuccessMessage(response.data.message);
    } catch (error: any) {
      setSuccessMessage("");

      if (error.response?.data?.error === "GOOGLE_OAUTH_USER") {
        setError(
          "Google OAuth users cannot reset password. Please use Google Sign-In."
        );
      } else if (error.response?.data?.error === "EMAIL_NOT_VERIFIED") {
        setError("Please verify your email first before resetting password.");
        // Store userId for resend functionality
        setUnverifiedUserId(error.response.data.userId);
      } else if (error.response?.status >= 500) {
        setError("Unable to reset password. Please try again later.");
      } else if (
        error.code === "NETWORK_ERROR" ||
        error.message === "Network Error"
      ) {
        setError(
          "Network connection failed. Please check your internet connection."
        );
      } else {
        setError(
          error.response?.data?.message ||
            "An unexpected error occurred. Please try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedUserId) return;

    setIsResending(true);
    try {
      const response = await api.post("/auth/resend-verification", {
        userId: unverifiedUserId,
      });

      // ⭐⭐ SIMPLE FIX: Redirect to existing verify-email page ⭐⭐
      navigate("/verify-email", {
        state: {
          email: email,
          userId: unverifiedUserId,
        },
      });
    } catch (error: any) {
      setError("Failed to resend verification email. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

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

      {/* Content Card */}
      <div className="relative flex flex-col md:flex-row bg-gray-800 rounded-2xl shadow-2xl overflow-hidden w-full max-w-4xl mx-4">
        {/* Optional Left-side Image */}
        <div className="hidden md:block md:w-1/2">
          <img
            src="/background/forget-password.png"
            alt="Reset Password Visual"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Form Side */}
        <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
          <h1 className="text-3xl font-extrabold text-center mb-2 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Forgot Password?
          </h1>
          <p className="text-gray-300 text-center mb-6">
            Enter your email to receive a reset link.
          </p>

          {/* Alert Messages */}
          <Alert
            type={error ? "error" : "success"}
            message={error || successMessage}
          />

          {/* Resend Verification Button (only show for unverified email error) */}
          {error ===
            "Please verify your email first before resetting password." && (
            <div className="mt-3 text-center">
              <button
                onClick={handleResendVerification}
                disabled={isResending}
                className="text-blue-400 hover:text-blue-300 underline font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {isResending ? "Sending..." : "Resend verification email"}
              </button>
            </div>
          )}

          {!successMessage && (
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={handleChange}
                autoFocus
                required
                className="w-full px-3 py-2 border rounded-md bg-gray-900 text-white placeholder-gray-400 focus:outline-none focus:ring-2 border-gray-600 focus:ring-blue-200"
              />

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed active:scale-95 transition-transform text-white py-2 px-4 rounded-lg flex justify-center items-center shadow-md"
              >
                {isLoading ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  "Send Reset Link"
                )}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm">
            <p className="text-gray-400">
              Remember your password?{" "}
              <Link
                to="/login"
                className="text-base text-blue-400 hover:underline font-medium"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
