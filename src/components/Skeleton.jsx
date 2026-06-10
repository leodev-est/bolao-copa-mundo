function Box({ className = '' }) {
  return <div className={`bg-gray-800 animate-pulse rounded-xl ${className}`} />
}

export function MatchCardSkeleton() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
      <div className="flex justify-between items-center">
        <Box className="h-3 w-20 rounded-full" />
        <Box className="h-3 w-14 rounded-full" />
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1 flex flex-col items-center gap-2">
          <Box className="w-10 h-10 rounded-full" />
          <Box className="h-3 w-16 rounded-full" />
        </div>
        <Box className="w-14 h-8 rounded-lg" />
        <div className="flex-1 flex flex-col items-center gap-2">
          <Box className="w-10 h-10 rounded-full" />
          <Box className="h-3 w-16 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function RoundHeaderSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 bg-gray-900 border border-gray-800 rounded-2xl">
      <Box className="w-6 h-6 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Box className="h-4 w-40 rounded-full" />
        <Box className="h-2.5 w-24 rounded-full" />
      </div>
      <Box className="w-5 h-5 rounded-full" />
    </div>
  )
}

export function LeaderboardSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-gray-900 rounded-xl border border-gray-800">
          <Box className="w-6 h-6 rounded-full shrink-0" />
          <Box className="w-9 h-9 rounded-full shrink-0" />
          <Box className="flex-1 h-4 rounded-full" />
          <Box className="w-14 h-5 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export function CartolaFieldSkeleton() {
  const rows = [[3], [3], [4], [1]]
  return (
    <div className="bg-emerald-950/30 rounded-2xl p-6 border border-emerald-900/20 space-y-5">
      {rows.map(([n], row) => (
        <div key={row} className="flex justify-center gap-4">
          {Array.from({ length: n }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <Box className="w-14 h-14 rounded-full" />
              <Box className="w-14 h-2.5 rounded-full" />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

export function StatCardSkeleton() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center space-y-1.5">
      <Box className="h-7 w-12 mx-auto rounded-lg" />
      <Box className="h-2.5 w-16 mx-auto rounded-full" />
    </div>
  )
}
