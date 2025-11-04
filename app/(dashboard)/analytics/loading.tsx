/**
 * Analytics Loading State
 */

export default function AnalyticsLoading() {
  return (
    <div className="p-8 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-start justify-between">
        <div>
          <div className="h-9 w-64 bg-gray-200 rounded animate-pulse" />
          <div className="h-5 w-96 bg-gray-200 rounded animate-pulse mt-2" />
        </div>
        <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Date range picker skeleton */}
      <div className="h-32 bg-gray-200 rounded animate-pulse" />

      {/* Metric cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="h-80 bg-gray-200 rounded animate-pulse" />
      <div className="h-96 bg-gray-200 rounded animate-pulse" />
    </div>
  );
}
