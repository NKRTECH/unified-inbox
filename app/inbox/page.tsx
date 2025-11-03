export default function InboxPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Welcome to Unified Inbox
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Your multi-channel communication platform
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="text-gray-700">
            🎉 Authentication successful! The inbox interface will be built in upcoming tasks.
          </p>
        </div>
      </div>
    </div>
  );
}