import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Login() {
    const navigate = useNavigate();
    const location = useLocation();

    const { login } = useAuth();

    const [form, setForm] = useState({
        email: "",
        password: ""
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const from = location.state?.from?.pathname || "/dashboard";

    const handleChange = (event) => {
        setForm({
            ...form,
            [event.target.name]: event.target.value
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        setError("");
        setLoading(true);

        try {
            await login(
                form.email,
                form.password
            );

            navigate(from, { replace: true });
        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Unable to sign in. Please check your credentials."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
            <div className="mx-auto flex min-h-[90vh] max-w-6xl items-center">

                <div className="hidden flex-1 lg:block">
                    <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-blue-400">
                        Digital Banking
                    </p>

                    <h1 className="max-w-xl text-5xl font-bold leading-tight">
                        Welcome back.
                        <br />
                        <span className="text-slate-400">
                            Your finances are waiting.
                        </span>
                    </h1>

                    <p className="mt-6 max-w-lg text-lg leading-8 text-slate-400">
                        Secure access to your accounts,
                        transactions and financial insights.
                    </p>
                </div>

                <div className="w-full lg:max-w-md">
                    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">

                        <div className="mb-8">
                            <h2 className="text-3xl font-bold">
                                Sign in
                            </h2>

                            <p className="mt-2 text-sm text-slate-400">
                                Access your banking dashboard.
                            </p>
                        </div>

                        {error && (
                            <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                                {error}
                            </div>
                        )}

                        <form
                            onSubmit={handleSubmit}
                            className="space-y-5"
                        >
                            <div>
                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                    Email address
                                </label>

                                <input
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                    placeholder="you@example.com"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>

                            <div>
                                <div className="mb-2 flex items-center justify-between">
                                    <label className="block text-sm font-medium text-slate-300">
                                        Password
                                    </label>

                                    <Link
                                        to="/forgot-password"
                                        className="text-sm text-blue-400 hover:text-blue-300"
                                    >
                                        Forgot password?
                                    </Link>
                                </div>

                                <input
                                    type="password"
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                    placeholder="Your password"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading
                                    ? "Signing in..."
                                    : "Sign in"}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-sm text-slate-400">
                            Don't have an account?{" "}
                            <Link
                                to="/register"
                                className="font-semibold text-blue-400 hover:text-blue-300"
                            >
                                Create one
                            </Link>
                        </p>

                    </div>
                </div>

            </div>
        </main>
    );
}

export default Login;