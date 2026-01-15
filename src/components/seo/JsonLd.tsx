/**
 * JSON-LD Structured Data Components for SEO
 * Helps search engines understand and display rich results
 */

interface ProductJsonLdProps {
  name: string;
  description: string;
  image: string;
  price: number;
  currency?: string;
  url: string;
  brand?: string;
  seller?: {
    name: string;
    url?: string;
  };
  rating?: {
    value: number;
    count: number;
  };
  category?: string;
  sku?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder';
}

export function ProductJsonLd({
  name,
  description,
  image,
  price,
  currency = 'USD',
  url,
  brand,
  seller,
  rating,
  category,
  sku,
  availability = 'InStock',
}: ProductJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    image,
    url,
    sku: sku || url.split('/').pop(),
    category: category || 'Fashion Design',
    brand: brand ? {
      '@type': 'Brand',
      name: brand,
    } : undefined,
    offers: {
      '@type': 'Offer',
      price: price.toFixed(2),
      priceCurrency: currency,
      availability: `https://schema.org/${availability}`,
      seller: seller ? {
        '@type': 'Person',
        name: seller.name,
        url: seller.url,
      } : undefined,
    },
    aggregateRating: rating && rating.count > 0 ? {
      '@type': 'AggregateRating',
      ratingValue: rating.value.toFixed(1),
      reviewCount: rating.count,
      bestRating: '5',
      worstRating: '1',
    } : undefined,
  };

  // Remove undefined values
  const cleanJsonLd = JSON.parse(JSON.stringify(jsonLd));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanJsonLd) }}
    />
  );
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbJsonLdProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

interface OrganizationJsonLdProps {
  name: string;
  url: string;
  logo: string;
  description?: string;
  sameAs?: string[];
}

export function OrganizationJsonLd({
  name,
  url,
  logo,
  description,
  sameAs,
}: OrganizationJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
    logo,
    description,
    sameAs,
  };

  const cleanJsonLd = JSON.parse(JSON.stringify(jsonLd));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanJsonLd) }}
    />
  );
}

interface WebsiteJsonLdProps {
  name: string;
  url: string;
  searchUrl?: string;
}

export function WebsiteJsonLd({ name, url, searchUrl }: WebsiteJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
    potentialAction: searchUrl ? {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: searchUrl,
      },
      'query-input': 'required name=search_term_string',
    } : undefined,
  };

  const cleanJsonLd = JSON.parse(JSON.stringify(jsonLd));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanJsonLd) }}
    />
  );
}

interface CollectionPageJsonLdProps {
  name: string;
  description: string;
  url: string;
  numberOfItems?: number;
}

export function CollectionPageJsonLd({
  name,
  description,
  url,
  numberOfItems,
}: CollectionPageJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url,
    numberOfItems,
  };

  const cleanJsonLd = JSON.parse(JSON.stringify(jsonLd));

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanJsonLd) }}
    />
  );
}

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQJsonLdProps {
  items: FAQItem[];
}

export function FAQJsonLd({ items }: FAQJsonLdProps) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
