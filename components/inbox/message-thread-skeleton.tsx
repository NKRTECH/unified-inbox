/**
 * MessageThreadSkeleton displays a loading state for the message thread
 */
export function MessageThreadSkeleton() {
  return (
    <div className="flex flex-col h-full p-4 space-y-4">
      {/* Date divider skeleton */}
      <div className="flex items-center justify-center">
        <div className="flex-1 border-t border-gray-200" />
        <div className="px-3 h-4 w-24 bg-gray-200 rounded animate-pulse" />
        <div className="flex-1 border-t border-gray-200" />
      </div>

      {/* Inbound message skeleton */}
      <div className="flex justify-start">
        <div className="max-w-xs lg:max-w-md space-y-2">
          <div className="px-4 py-3 rounded-lg bg-gray-100 space-y-2">
            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-40 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Outbound message skeleton */}
      <div className="flex justify-end">
        <div className="max-w-xs lg:max-w-md space-y-2">
          <div className="px-4 py-3 rounded-lg bg-blue-100 space-y-2">
            <div className="h-4 w-56 bg-blue-200 rounded animate-pulse" />
            <div className="h-4 w-44 bg-blue-200 rounded animate-pulse" />
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 bg-blue-200 rounded animate-pulse" />
              <div className="h-3 w-12 bg-blue-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Inbound message skeleton */}
      <div className="flex justify-start">
        <div className="max-w-xs lg:max-w-md space-y-2">
          <div className="px-4 py-3 rounded-lg bg-gray-100 space-y-2">
            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-52 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Outbound message skeleton */}
      <div className="flex justify-end">
        <div className="max-w-xs lg:max-w-md space-y-2">
          <div className="px-4 py-3 rounded-lg bg-blue-100 space-y-2">
            <div className="h-4 w-40 bg-blue-200 rounded animate-pulse" />
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 bg-blue-200 rounded animate-pulse" />
              <div className="h-3 w-12 bg-blue-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Inbound message skeleton */}
      <div className="flex justify-start">
        <div className="max-w-xs lg:max-w-md space-y-2">
          <div className="px-4 py-3 rounded-lg bg-gray-100 space-y-2">
            <div className="h-3 w-16 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-44 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-36 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}