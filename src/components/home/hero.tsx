import Link from "next/link";

export function Hero() {
  return (
    <section className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 py-6 sm:py-8 lg:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-2 sm:mb-3 lg:mb-4">
            Where Fashion
            <span className="text-indigo-200"> Meets</span>
            <br />
            Creativity
          </h1>
          <p className="text-[10px] sm:text-xs md:text-sm text-indigo-100 mb-3 sm:mb-4 lg:mb-6 max-w-3xl mx-auto leading-snug">
            Discover unique fashion designs, illustrations, and sketches from talented designers worldwide. 
            Start your creative journey or find the perfect design for your next project.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Link 
              href="/designs" 
              className="bg-white text-indigo-700 font-semibold py-1.5 sm:py-2 px-4 sm:px-6 rounded-lg hover:bg-gray-100 transition-colors shadow-lg text-[9px] sm:text-xs"
            >
              Browse Designs
            </Link>
            <Link 
              href="/upload" 
              className="bg-indigo-800 hover:bg-indigo-900 text-white font-semibold py-1.5 sm:py-2 px-4 sm:px-6 rounded-lg border border-indigo-500 transition-colors shadow-lg text-[9px] sm:text-xs"
            >
              Start Selling
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}