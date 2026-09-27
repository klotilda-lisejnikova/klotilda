export default function ProductDetailLoading() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-10 h-4 w-20 animate-pulse rounded bg-stone-200" />

      <div className="grid gap-12 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="aspect-square animate-pulse rounded bg-stone-200" />
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 w-20 animate-pulse rounded bg-stone-200" />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="space-y-2">
            <div className="h-8 w-3/4 animate-pulse rounded bg-stone-200" />
            <div className="h-4 w-1/3 animate-pulse rounded bg-stone-100" />
          </div>
          <div className="h-8 w-1/3 animate-pulse rounded bg-stone-200" />
          <div className="space-y-2">
            <div className="h-4 w-full animate-pulse rounded bg-stone-100" />
            <div className="h-4 w-full animate-pulse rounded bg-stone-100" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-stone-100" />
          </div>
          <div className="h-12 w-full animate-pulse rounded bg-stone-200" />
        </div>
      </div>
    </section>
  );
}
