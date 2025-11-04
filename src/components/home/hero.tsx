import Link from "next/link";

export function Hero() {
  return (
    <section className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 py-14 xs:py-16 md:py-20">
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
        </div>
      </div>
    </section>
  );
}