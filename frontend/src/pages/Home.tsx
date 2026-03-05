import { useTheme } from '../context/ThemeContext';
import { api } from '../api/client';

export default function Home() {
  const { darkMode, toggleDarkMode } = useTheme();

  const handleLogout = async () => {
    await api.logout();
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">My App</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleDarkMode}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              {darkMode ? '☀️ Light' : '🌙 Dark'}
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Welcome</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Your app is running. Start building your pages here.
          </p>
        </div>
      </main>
    </div>
  );
}
