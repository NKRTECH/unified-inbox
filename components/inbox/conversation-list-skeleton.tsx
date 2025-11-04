/**
 * ConversationListSkeleton displays a loading state for the conversation list
 */
export function ConversationListSkeleton() {
  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow border border-gray-200">
      {/* Header Skeleton */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-5 w-20 bg-gray-200 rounded-full animate-pulse" />
        </div>
        
        {/* Filters Skeleton */}
        <div className="flex items-center space-x-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
          ))}
        </div>
      </div>

      {/* List Skeleton */}
      <div className="flex-1 overflow-hidden divide-y divide-gray-200">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="p-4">
            <div className="flex items-start space-x-3">
              {/* Avatar Skeleton */}
              <div className="flex-shrink-0">
                <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
              </div>

              {/* Content Skeleton */}
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
                  <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-full bg-gray-200 rounded animate-pulse" />
                <div className="flex items-center justify-between">
                  <div className="h-5 w-16 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 w-12 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}