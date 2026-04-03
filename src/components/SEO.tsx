import { useEffect } from 'react';

export interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  schema?: object;
  noindex?: boolean;
  geo?: {
    region?: string;
    placename?: string;
  };
}

const DEFAULT_TITLE = 'eva — AI-Powered Financial Advisor | Understand · Plan · Grow';
const DEFAULT_DESCRIPTION = 'eva is an AI-powered financial advisor that analyzes your spending, predicts future balances, and provides personalized money advice. Free to start.';
const DEFAULT_OG_IMAGE = 'https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/deeeb9c0-e0e7-4edd-832e-53d3707dae6e/id-preview-5ca1457d--52f18138-cd68-4bcc-9c09-692af4d6193d.lovable.app-1774486361105.png';
const BASE_URL = 'https://financeai.useaima.com';

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = 'website',
  schema,
  noindex = false,
  geo,
}: SEOProps) {
  const fullTitle = title ? `${title} | eva` : DEFAULT_TITLE;
  const canonicalUrl = canonical ? `${BASE_URL}${canonical}` : BASE_URL;

  useEffect(() => {
    document.title = fullTitle;

    updateMetaTag('description', description);
    updateMetaTag('robots', noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1');
    updateMetaTag('author', 'eva');

    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);

    updateMetaTag('og:title', fullTitle);
    updateMetaTag('og:description', description);
    updateMetaTag('og:image', ogImage);
    updateMetaTag('og:url', canonicalUrl);
    updateMetaTag('og:type', ogType);
    updateMetaTag('og:site_name', 'eva');

    updateMetaTag('twitter:title', fullTitle);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', ogImage);

    if (geo) {
      if (geo.region) updateMetaTag('geo.region', geo.region);
      if (geo.placename) updateMetaTag('geo.placename', geo.placename);
    }

    updateStructuredData(schema);

    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [fullTitle, description, canonicalUrl, ogImage, ogType, schema, noindex, geo]);

  return null;
}

function updateMetaTag(name: string, content: string) {
  let meta: HTMLMetaElement | null = null;

  if (name.startsWith('og:') || name.startsWith('twitter:')) {
    meta = document.querySelector(`meta[property="${name}"]`) ||
           document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
  } else {
    meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
  }

  if (!meta) {
    meta = document.createElement('meta');
    if (name.startsWith('og:')) {
      meta.setAttribute('property', name);
    } else {
      meta.setAttribute('name', name);
    }
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

function updateStructuredData(schema: object | undefined) {
  const existingScripts = document.querySelectorAll('script[type="application/ld+json"][data-seo]');
  existingScripts.forEach(script => script.remove());

  if (!schema) return;

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.setAttribute('data-seo', 'true');
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}

// Helper to generate breadcrumb structured data
export function generateBreadcrumb(items: { name: string; url: string }[]) {
  return {
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  };
}

// FAQPage schema helper
export function generateFAQSchema(faqs: { question: string; answer: string }[]) {
  return {
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}

// HowTo schema helper
export function generateHowToSchema(steps: { name: string; text: string }[]) {
  return {
    "@type": "HowTo",
    "step": steps.map((step, index) => ({
      "@type": "HowToStep",
      "position": index + 1,
      "name": step.name,
      "text": step.text
    }))
  };
}

// Organization schema helper
export function generateOrganizationSchema() {
  return {
    "@type": "Organization",
    "name": "eva",
    "url": "https://financeai.useaima.com/",
    "logo": "https://financeai.useaima.com/eva-logo.png",
    "description": "AI-powered financial intelligence platform — Understand · Plan · Grow",
    "sameAs": [
      "https://twitter.com/eva_finance",
      "https://linkedin.com/company/eva-finance"
    ],
    "contactPoint": {
      "@type": "ContactPoint",
      "email": "support@useaima.com",
      "contactType": "Customer Support"
    }
  };
}
