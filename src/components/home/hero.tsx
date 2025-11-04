import Link from "next/link";

export function Hero() {
  return (
    <section className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 py-12 xs:py-14 md:py-20">
  <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl xs:text-5xl md:text-6xl font-bold text-white mb-5 md:mb-6">
            Where Fashion
            <span className="text-indigo-200"> Meets</span>
            <br />
            Creativity
          </h1>
          <p className="text-lg xs:text-xl text-indigo-100 mb-6 xs:mb-7 md:mb-8 max-w-3xl mx-auto">
            Discover unique fashion designs, illustrations, and sketches from talented designers worldwide. 
            Start your creative journey or find the perfect design for your next project.
          </p>
          {/* Quick search */}
          <form action="/designs" method="GET" className="max-w-2xl mx-auto mb-6 xs:mb-7 md:mb-8">
            <label htmlFor="hero-search" className="sr-only">Search designs</label>
            <div className="flex items-stretch gap-2 bg-white/95 rounded-lg p-1 shadow-lg">
              <input
                id="hero-search"
                name="search"
                type="search"
                placeholder="Search designs, tags, or categories"
                className="flex-1 px-4 py-3 rounded-md bg-transparent text-gray-900 placeholder-gray-500 focus:outline-none"
                aria-label="Search designs"
              />
              <button
                type="submit"
                className="px-5 py-3 bg-indigo-700 hover:bg-indigo-800 text-white font-semibold rounded-md transition-colors"
              >
                Search
              </button>
            </div>
          </form>
          <div className="flex flex-col sm:flex-row gap-3 xs:gap-4 justify-center">
            <Link 
              href="/designs" 
              className="bg-white text-indigo-700 font-semibold py-3 px-8 rounded-lg hover:bg-gray-100 transition-colors shadow-lg"
            >
              Browse Designs
            </Link>
            <Link 
              href="/upload" 
              className="bg-indigo-800 hover:bg-indigo-900 text-white font-semibold py-3 px-8 rounded-lg border border-indigo-500 transition-colors shadow-lg"
            >
              Start Selling
            </Link>
          </div>
          {/* Trust badges */}
          <div className="mt-6 xs:mt-7 md:mt-8 flex flex-wrap items-center justify-center gap-3 text-indigo-100/95 text-sm">
            <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-1.5 rounded-full border border-white/20">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M12 1.5a.75.75 0 01.38.1l8.25 4.5a.75.75 0 01.37.65v6.75a8.25 8.25 0 01-3.9 7.03l-4.5 2.7a.75.75 0 01-.78 0l-4.5-2.7A8.25 8.25 0 013 13.5V6.75a.75.75 0 01.37-.65l8.25-4.5A.75.75 0 0112 1.5zm-2.47 10.03a.75.75 0 10-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l4.5-4.5a.75.75 0 10-1.06-1.06L10.5 12.22l-1-1z" clipRule="evenodd"/></svg>
              Secure payments
            </span>
            <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-1.5 rounded-full border border-white/20">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M3.75 4.5A.75.75 0 013 3.75C3 3.336 3.336 3 3.75 3h16.5a.75.75 0 010 1.5H3.75zM3 8.25A.75.75 0 013.75 7.5h16.5a.75.75 0 010 1.5H3.75A.75.75 0 013 8.25zM3 12.75a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75zM3 17.25a.75.75 0 01.75-.75h8.25a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z"/></svg>
              Instant downloads
            </span>
            <span className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-1.5 rounded-full border border-white/20">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M12 2.25a.75.75 0 01.53.22l6.75 6.75a.75.75 0 01.22.53v9a2.25 2.25 0 01-2.25 2.25h-3.75a.75.75 0 01-.75-.75v-5.25H11.25v5.25a.75.75 0 01-.75.75H6.75A2.25 2.25 0 014.5 18.75v-9a.75.75 0 01.22-.53l6.75-6.75a.75.75 0 01.53-.22zm0 2.06L6 10.31v8.44c0 .414.336.75.75.75h2.25v-5.25a.75.75 0 01.75-.75h3.5a.75.75 0 01.75.75V19.5h2.25a.75.75 0 00.75-.75v-8.44L12 4.31z" clipRule="evenodd"/></svg>
              Ownership options
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}