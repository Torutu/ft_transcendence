// frontend/src/pages/unauthorised/login.tsx
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import validator from "validator";
import api from "../../utils/api";
import { useAuth } from "../../contexts/AuthContext";
import { Alert } from "../../components/general";

declare global {
  interface Window {
    google?: any;
  }
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [formErrors, setFormErrors] = useState({
    username: "",
    password: "",
  });

  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const validateForm = () => {
    let isValid = true;
    const newErrors = { username: "", password: "" };

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
      isValid = false;
    } else if (!validator.isAlphanumeric(formData.username)) {
      newErrors.username = "Username must contain only letters and numbers";
      isValid = false;
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
      isValid = false;
    }

    setFormErrors(newErrors);
    setApiError("");
    return isValid;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const response = await api.post("/auth/login", {
        username: formData.username,
        password: formData.password,
      });

      if (response.data.requires2FA) {
        if (response.data.url) {
          sessionStorage.setItem("url", response.data.url);
        }

        navigate("/verify-2fa", {
          state: {
            userId: response.data.userId,
            url: response.data.url,
          },
        });
      } else {
        setApiError("Unexpected response from server");
      }
    } catch (error: any) {
      setApiError(
        error.response?.data?.message || "Login failed. Please try again."
      );
      setFormErrors({ username: "", password: "" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: "" }));
    }
    setApiError("");
    setSuccessMessage("");
  };

  const handleCredentialResponse = async (response: any) => {
    setIsLoading(true);
    try {
      const res = await api.post("/auth/signin-with-google", {
        credential: response.credential,
      });

      if (res.data.user) {
        login(res.data.user);
        navigate("/lobby");
      } else {
        setApiError("Google sign-in failed");
      }
    } catch (error: any) {
      setApiError("An unexpected error occurred. Please try again.");
      setFormErrors({ username: "", password: "" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (window.google && googleBtnRef.current) {
      const client_id = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!client_id) {
        console.error("VITE_GOOGLE_CLIENT_ID is not set");
        return;
      }

      window.google.accounts.id.initialize({
        client_id: client_id,
        callback: handleCredentialResponse,
      });

      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        width: "380",
        locale: "en",
      });
    }
  }, []);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-900 text-white">
      {/* Background Image with Overlay */}
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
        {/* Left Side Image */}
        <div className="hidden md:block md:w-1/2">
          <img
            src="/background/login.png"
            alt="Login Visual"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Form Side */}
        <div className="w-full md:w-1/2 p-8 flex flex-col justify-center">
          <h1 className="text-3xl font-extrabold text-center mb-2 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Welcome Back
          </h1>
          <p className="text-gray-300 text-center mb-3">
            Log in to your account
          </p>

          <Alert type="success" message={successMessage} />
          <Alert type="error" message={apiError} />

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                id="username"
                name="username"
                type="text"
                placeholder="Username"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 placeholder-gray-400 text-white bg-gray-900 transition ${
                  formErrors.username
                    ? "border-red-500 focus:ring-red-200"
                    : "border-gray-300 focus:ring-blue-200"
                }`}
                value={formData.username}
                onChange={handleChange}
                autoFocus
              />
              {formErrors.username && (
                <p className="mt-1 text-sm text-red-500">
                  {formErrors.username}
                </p>
              )}
            </div>

            <div>
              <input
                id="password"
                name="password"
                type="password"
                placeholder="Password"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 placeholder-gray-400 text-white bg-gray-900 transition ${
                  formErrors.password
                    ? "border-red-500 focus:ring-red-200"
                    : "border-gray-300 focus:ring-blue-200"
                }`}
                value={formData.password}
                onChange={handleChange}
              />
              {formErrors.password && (
                <p className="mt-1 text-sm text-red-500">
                  {formErrors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 transition-transform text-white py-2 px-4 rounded-lg flex justify-center items-center shadow-md"
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                "Log In"
              )}
            </button>

            <p className="text-center">
              <Link
                to="/reset-password"
                className="text-sm font-medium text-blue-400 hover:underline"
              >
                Forgot Password?
              </Link>
            </p>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="px-2 text-sm bg-gray-900 text-gray-400">
                  Or
                </span>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-center space-x-2">
                <div ref={googleBtnRef}></div>
              </div>
            </div>
          </div>

          {/* Register Link */}
          <div className="mt-6 text-center text-sm">
            <p className="text-center text-sm mt-6 text-gray-400">
              Don&apos;t have an account?{" "}
              <Link
                to="/register"
                className="text-base text-blue-400 hover:underline font-medium"
              >
                Create New Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
