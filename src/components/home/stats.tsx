export function Stats() {
  const stats = [
    { number: "10,000+", label: "Active Designers" },
    { number: "50,000+", label: "Designs Sold" },
    { number: "150+", label: "Countries" },
    { number: "$2M+", label: "Earned by Designers" },
  ];

  return (
    <section className="py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-12">Our Community</h2>
  <div className="grid grid-cols-2 xs:grid-cols-3 lg:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl xs:text-4xl font-bold text-primary-600 mb-1 xs:mb-2">{stat.number}</div>
              <div className="text-sm xs:text-base text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}