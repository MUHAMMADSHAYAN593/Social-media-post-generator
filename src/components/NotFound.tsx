import { Link } from '@tanstack/react-router'

export function NotFound() {
    return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-red-400 bg-clip-text text-transparent">
                404 - Page Not Found
            </h1>
            <p className="text-gray-400 mb-8 text-lg">
                The page you are looking for does not exist.
            </p>
            <Link
                to="/"
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-full font-medium transition-colors"
            >
                Go Home
            </Link>
        </div>
    )
}
