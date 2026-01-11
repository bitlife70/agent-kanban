interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-gray-300 dark:bg-gray-600 rounded ${className}`}
    />
  );
}

export function AgentCardSkeleton() {
  return (
    <div className="p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="w-6 h-6 rounded-full" />
          <Skeleton className="w-24 h-4" />
        </div>
        <Skeleton className="w-16 h-4" />
      </div>
      <Skeleton className="w-full h-8 mb-2" />
      <div className="space-y-1">
        <Skeleton className="w-20 h-3" />
        <Skeleton className="w-32 h-3" />
      </div>
    </div>
  );
}

export function KanbanColumnSkeleton() {
  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-800 rounded-lg min-w-[300px] max-w-[350px] flex-1 h-full">
      <div className="bg-gray-400 dark:bg-gray-600 px-4 py-3 rounded-t-lg">
        <Skeleton className="w-20 h-5" />
      </div>
      <div className="flex-1 p-3 space-y-3">
        <AgentCardSkeleton />
        <AgentCardSkeleton />
      </div>
    </div>
  );
}
