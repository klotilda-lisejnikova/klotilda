/** The shop's layout while its data arrives: heading, chips, 3:4 cards. */
export default function ShopLoading() {
  return (
    <section className="bg-paper">
      <div className="mx-auto max-w-6xl px-4 pt-16 pb-24 md:px-8 md:pt-24 md:pb-32">
        <div className="mb-4 h-10 w-40 animate-pulse bg-stone-200/70" />
        <div className="mb-10 h-3 w-56 animate-pulse bg-stone-200/50 md:mb-14" />

        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-8 w-24 animate-pulse bg-stone-200/70" />
          ))}
        </div>

        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-6 md:gap-x-5 md:gap-y-8 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-md">
              <div className="aspect-[3/4] animate-pulse bg-stone-200" />
              <div className="space-y-2 border border-t-0 border-stone-200 bg-[#fafaf8] px-4 py-3">
                <div className="h-3.5 w-3/4 animate-pulse bg-stone-200" />
                <div className="h-2.5 w-1/3 animate-pulse bg-stone-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
