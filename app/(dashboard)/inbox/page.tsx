export default function InboxPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage conversations across all channels
        </p>
      </div>

      {/* Main inbox content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
        {/* Conversation list */}
        <div className="lg:col-span-1 bg-white rounded-lg shadow border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Conversations</h2>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                12 active
              </span>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200 overflow-y-auto h-full">
            {/* Placeholder conversation items */}
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="p-4 hover:bg-gray-50 cursor-pointer">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {String.fromCharCode(65 + i)}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        Contact {i}
                      </p>
                      <div className="flex items-center space-x-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          SMS
                        </span>
                        <span className="text-xs text-gray-500">2m</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      Last message preview goes here...
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Message thread */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow border border-gray-200 flex flex-col">
          {/* Thread header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700">A</span>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Contact 1</h3>
                  <p className="text-sm text-gray-500">+1 (555) 123-4567</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  SMS
                </span>
              </div>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="space-y-4">
              {/* Sample messages */}
              <div className="flex justify-start">
                <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-100">
                  <p className="text-sm text-gray-900">
                    Hello! I'm interested in your services.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">10:30 AM</p>
                </div>
              </div>
              
              <div className="flex justify-end">
                <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-blue-600 text-white">
                  <p className="text-sm">
                    Hi there! Thanks for reaching out. How can I help you today?
                  </p>
                  <p className="text-xs text-blue-100 mt-1">10:32 AM</p>
                </div>
              </div>

              <div className="flex justify-start">
                <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-100">
                  <p className="text-sm text-gray-900">
                    I'd like to know more about your pricing plans.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">10:35 AM</p>
                </div>
              </div>
            </div>
          </div>

          {/* Message composer */}
          <div className="border-t border-gray-200 p-4">
            <div className="text-sm text-gray-500 mb-2">
              💡 Try the full message composer in the <a href="/test-composer" className="text-blue-600 hover:underline">Test Composer</a> page
            </div>
            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <textarea
                  rows={3}
                  className="block w-full border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500 sm:text-sm resize-none"
                  placeholder="Type your message... (Use Test Composer for full functionality)"
                  disabled
                />
              </div>
              <div className="flex-shrink-0 flex flex-col space-y-2">
                <select className="block w-full border border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500" disabled>
                  <option>SMS</option>
                  <option>WhatsApp</option>
                  <option>Email</option>
                </select>
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-gray-400 cursor-not-allowed"
                  disabled
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}