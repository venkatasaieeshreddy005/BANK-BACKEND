import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Register() {
    const navigate = useNavigate();
    const { register } = useAuth();

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: ""
    });

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

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
            await register(
                form.name,
                form.email,
                form.password
            );

            navigate("/dashboard");
        } catch (error) {
            setError(
                error.response?.data?.message ||
                "Registration failed. Please try again."
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
                        Banking designed around
                        <span className="text-blue-400">
                            {" "}trust.
                        </span>
                    </h1>

                    <p className="mt-6 max-w-lg text-lg leading-8 text-slate-400">
                        Manage your accounts, move money securely,
                        and understand your financial activity from
                        one intelligent platform.
                    </p>
                </div>

                <div className="w-full lg:max-w-md">
                    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">

                        <div className="mb-8">
                            <h2 className="text-3xl font-bold">
                                Create account
                            </h2>

                            <p className="mt-2 text-sm text-slate-400">
                                Start your secure banking journey.
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
                                    Full name
                                </label>

                                <input
                                    type="text"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    required
                                    minLength={2}
                                    maxLength={50}
                                    placeholder="Your name"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>

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
                                <label className="mb-2 block text-sm font-medium text-slate-300">
                                    Password
                                </label>

                                <input
                                    type="password"
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                    minLength={6}
                                    maxLength={20}
                                    placeholder="Create a password"
                                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />

                                <p className="mt-2 text-xs text-slate-500">
                                    6–20 characters
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-xl bg-blue-600 px-4 py-3.5 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading
                                    ? "Creating account..."
                                    : "Create account"}
                            </button>
                        </form>

                        <p className="mt-6 text-center text-sm text-slate-400">
                            Already have an account?{" "}
                            <Link
                                to="/login"
                                className="font-semibold text-blue-400 hover:text-blue-300"
                            >
                                Sign in
                            </Link>
                        </p>

                    </div>
                </div>

            </div>
        </main>
    );
}

export default Register;