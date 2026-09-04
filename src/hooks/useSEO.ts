import { useEffect } from 'react';

export interface SEOProps {
  title: string;
  description?: string;
  keywords?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'product';
  robots?: string;
  schema?: Record<string, any>;
}

export const useSEO = ({
  title,
  description = "A premium real estate marketplace connecting landlords and tenants with real M-Pesa payment-activated listings across Nairobi, Mombasa, Kisumu, and all 47 counties in Kenya.",
  keywords,
  canonicalUrl,
  ogImage = "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&h=630&q=80",
  ogType = 'website',
  robots = 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
  schema
}: SEOProps) => {
  useEffect(() => {
    // 1. Document Title
    const formattedTitle = title.includes('HomeHaven') ? title : `${title} | HomeHaven Kenya`;
    document.title = formattedTitle;

    // Helper to set or create meta tag
    const setMetaTag = (attrName: 'name' | 'property', attrValue: string, content: string) => {
      let element = document.querySelector(`meta[${attrName}="${attrValue}"]`) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attrName, attrValue);
        document.head.appendChild(element);
      }
      element.content = content;
    };

    // 2. Primary Meta Tags
    setMetaTag('name', 'description', description);
    setMetaTag('name', 'title', formattedTitle);
    setMetaTag('name', 'robots', robots);
    if (keywords) {
      setMetaTag('name', 'keywords', keywords);
    }

    // 3. Open Graph Tags
    setMetaTag('property', 'og:title', formattedTitle);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:image', ogImage);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:url', canonicalUrl || window.location.href);

    // 4. Twitter Tags
    setMetaTag('name', 'twitter:title', formattedTitle);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', ogImage);

    // 5. Canonical Link
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonicalUrl || window.location.href;

    // 6. Dynamic JSON-LD Schema
    const schemaScriptId = 'dynamic-seo-schema';
    let scriptTag = document.getElementById(schemaScriptId) as HTMLScriptElement | null;
    
    if (schema) {
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = schemaScriptId;
        scriptTag.type = 'application/ld+json';
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(schema, null, 2);
    } else if (scriptTag) {
      scriptTag.remove();
    }

    // Cleanup on unmount
    return () => {
      // Keep defaults from index.html if unmounted
    };
  }, [title, description, keywords, canonicalUrl, ogImage, ogType, robots, schema]);
};
