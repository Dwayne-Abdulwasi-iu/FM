export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4">Fashion Marketplace</h3>
            <p className="text-gray-400">
              The premier destination for fashion designers to showcase and sell their creative work.
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">For Designers</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="/upload" className="hover:text-white">Start Selling</a></li>
              <li><a href="/resources" className="hover:text-white">Resources</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">For Buyers</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="/designs" className="hover:text-white">Browse Designs</a></li>
              <li><a href="/categories" className="hover:text-white">Categories</a></li>
              <li><a href="/trending" className="hover:text-white">Trending</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider mb-4">Support</h4>
            <ul className="space-y-2 text-gray-400">
              <li><a href="/help" className="hover:text-white">Help Center</a></li>
              <li><a href="/contact" className="hover:text-white">Contact Us</a></li>
              <li><a href="/terms" className="hover:text-white">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2024 Fashion Marketplace. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}