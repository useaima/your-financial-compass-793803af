import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile';
  schema?: object;
  noindex?: boolean;
  geo?: {
    region?: string;
    placename?: string;
    position?: string;
  };
}

const DEFAULT_TITLE = "eva | Your AI Finance Assistant";
const DEFAULT_DESCRIPTION = "Your AI Finance Assistant for spending clarity, planning confidence, and cashflow guidance.";
const SITE_URL = "https://eva.useaima.com";

export function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalUrl,
  ogImage = `${SITE_URL}/og-image.png`,
  ogType = 'website',
  schema,
  noindex = false,
  geo
}: SEOProps) {
  const location = useLocation();
  const fullTitle = title ? `${title} | eva` : DEFAULT_TITLE;
  const currentUrl = canonicalUrl || `${SITE_URL}${location.pathname}`;

  useEffect(() => {
    // Basic Meta Tags
    document.title = fullTitle;
    updateMetaTag('description', description);

    // Canonical
    let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', currentUrl);

    // Robots
    if (noindex) {
      updateMetaTag('robots', 'noindex, nofollow');
    } else {
      updateMetaTag('robots', 'index, follow');
    }

    // Open Graph
    updateMetaTag('og:title', fullTitle);
    updateMetaTag('og:description', description);
    updateMetaTag('og:url', currentUrl);
    updateMetaTag('og:image', ogImage);
    updateMetaTag('og:type', ogType);
    updateMetaTag('og:site_name', 'eva');

    // Twitter
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', fullTitle);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', ogImage);

    // Geo Tags
    if (geo?.region) updateMetaTag('geo.region', geo.region);
    if (geo?.placename) updateMetaTag('geo.placename', geo.placename);
    if (geo?.position) updateMetaTag('geo.position', geo.position);

    // Structured Data
    const baseSchema = generateSoftwareApplicationSchema();
    const finalSchema = schema ? { "@context": "https://schema.org", "@graph": [baseSchema, schema] } : { "@context": "https://schema.org", ...baseSchema };
    updateStructuredData(finalSchema);

    return () => {
      document.title = DEFAULT_TITLE;
    };
  }, [fullTitle, description, currentUrl, ogImage, ogType, schema, noindex, geo]);

  return null;
}

function updateMetaTag(name: string, content: string) {
  let meta: HTMLMetaElement | null = null;

  if (name.startsWith('og:') || name.startsWith('twitter:')) {
    meta = (document.querySelector(`meta[property="${name}"]`) ||
           document.querySelector(`meta[name="${name}"]`)) as HTMLMetaElement;
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

// SoftwareApplication schema for better AEO
export function generateSoftwareApplicationSchema() {
  return {
    "@type": "SoftwareApplication",
    "name": "eva",
    "operatingSystem": "Web, iOS, Android",
    "applicationCategory": "FinanceApplication",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "description": "Your AI Finance Assistant for spending clarity, planning confidence, and cashflow guidance.",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "1250"
    }
  };
}

// Speakable schema for AEO (Voice Search)
export function generateSpeakableSchema() {
  return {
    "@type": "WebPage",
    "speakable": {
      "@type": "SpeakableSpecification",
      "cssSelector": [".seo-title", ".seo-summary"]
    }
  };
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

// Organization schema helper
export function generateOrganizationSchema() {
  return {
    "@type": "Organization",
    "name": "eva",
    "url": SITE_URL,
    "logo": `${SITE_URL}/eva-logo.png`,
    "description": "Your AI Finance Assistant for spending clarity, planning confidence, and cashflow guidance.",
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
