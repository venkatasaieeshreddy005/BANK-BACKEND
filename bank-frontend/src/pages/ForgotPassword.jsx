import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

function ForgotPassword() {
    const navigate = useNavigate();

    const [step, setStep] = useState(1);

    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const sendOtp = async (event) => {
        event.preventDefault();

        setError("");
        setMessage("");
        setLoading(true);

        try {
            const response = await api.post(
                "/auth/send-otp",
                { email }
            );

            setMessage(
                response.data.message ||
                "OTP sent successfully."
            );

            setStep(2);
        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Unable to send OTP."
            );
        } finally {
            setLoading(false);
        }
    };

    const resetPassword = async (event) => {
        event.preventDefault();

        setError("");
        setMessage("");

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            const response = await api.post(
                "/auth/reset",
                {
                    otp,
                    password
                }
            );

            setMessage(
                response.data.message ||
                "Password reset successfully."
            );

            setTimeout(() => {
                navigate("/login");
            }, 1200);
        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Unable to reset password."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
            <div className="mx-auto flex min-h-[90vh] max-w-md items-center">

                <div className="w-full rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">

                    <div className="mb-8">
                        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-blue-400">
                            Account recovery
                        </p>

                        <h1 className="text-3xl font-bold">
                            {step === 1
                                ? "Reset your password"
                                : "Enter verification code"}
                        </h1>

                        <p className="mt-2 text-sm leading-6 text-slate-400">
                            {step === 1
                                ? "We'll send a one-time password to your registered email."
                                : "Enter the 6-digit OTP and choose a new password."}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                            {message}
                        </div>
                    )}

                    {step === 1 ? (
                        <form
                            onSubmit={sendOtp}
                            className="space-y-5"
                        >
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                    Email address
                                </label>

                                <input
                                    type="email"
                                    value={email}
                                    onChange={(event) =>
                                        setEmail(event.target.value)
                                    }
                                    required
                                    placeholder="you@example.com"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold transition hover:bg-blue-500 disabled:opacity-60"
                            >
                                {loading
                                    ? "Sending OTP..."
                                    : "Send OTP"}
                            </button>
                        </form>
                    ) : (
                        <form
                            onSubmit={resetPassword}
                            className="space-y-5"
                        >
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                    6-digit OTP
                                </label>

                                <input
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(event) =>
                                        setOtp(
                                            event.target.value.replace(
                                                /\D/g,
                                                ""
                                            )
                                        )
                                    }
                                    required
                                    placeholder="123456"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-center text-xl tracking-[0.5em] text-white outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                    New password
                                </label>

                                <input
                                    type="password"
                                    value={password}
                                    onChange={(event) =>
                                        setPassword(event.target.value)
                                    }
                                    required
                                    minLength={8}
                                    maxLength={100}
                                    placeholder="New password"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                    Confirm password
                                </label>

                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(event) =>
                                        setConfirmPassword(
                                            event.target.value
                                        )
                                    }
                                    required
                                    placeholder="Confirm password"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-blue-500"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold transition hover:bg-blue-500 disabled:opacity-60"
                            >
                                {loading
                                    ? "Resetting password..."
                                    : "Reset password"}
                            </button>
                        </form>
                    )}

                    <div className="mt-6 text-center">
                        <Link
                            to="/login"
                            className="text-sm font-medium text-blue-400 hover:text-blue-300"
                        >
                            Back to sign in
                        </Link>
                    </div>

                </div>
            </div>
        </main>
    );
}

export default ForgotPassword;