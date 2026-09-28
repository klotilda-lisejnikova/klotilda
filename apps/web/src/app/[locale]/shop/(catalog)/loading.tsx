export default function ShopLoading() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-2 h-9 w-28 animate-pulse rounded bg-stone-200" />
      <div className="mb-8 h-4 w-56 animate-pulse rounded bg-stone-100" />

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-8 w-20 animate-pulse rounded-full bg-stone-200" />
        ))}
      </div>

      <div className="mt-10 grid grid-cols-2 gap-6 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i}>
            <div className="aspect-square animate-pulse rounded bg-stone-200" />
            <div className="mt-3 flex items-start justify-between gap-2">
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-3/4 animate-pulse rounded bg-stone-200" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-stone-100" />
              </div>
              <div className="h-4 w-14 animate-pulse rounded bg-stone-200" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
