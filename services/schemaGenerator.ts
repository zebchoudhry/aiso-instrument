// services/schemaGenerator.ts
// Generates actual Schema.org markup based on audit findings

export interface GeneratedSchema {
  type: string;
  code: string;
  description: string;
  impact: string;
}

export class SchemaGenerator {
  
  static generateOrganizationSchema(
    name: string,
    url: string,
    description?: string,
    socialProfiles?: string[]
  ): GeneratedSchema {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": name,
      "url": url,
      ...(description && { "description": description }),
      ...(socialProfiles && socialProfiles.length > 0 && { 
        "sameAs": socialProfiles 
      })
    };
    
    return {
      type: 'Organization',
      code: JSON.stringify(schema, null, 2),
      description: 'Core organization identity schema',
      impact: 'Establishes entity clarity for AI engines. Critical for brand recognition.'
    };
  }
  
  static generateFAQSchema(questions: Array<{question: string, answer: string}>): GeneratedSchema {
    const schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": questions.map(q => ({
        "@type": "Question",
        "name": q.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": q.answer
        }
      }))
    };
    
    return {
      type: 'FAQPage',
      code: JSON.stringify(schema, null, 2),
      description: 'FAQ markup for common queries',
      impact: 'Increases likelihood of AI citation by providing direct answers to common questions.'
    };
  }
  
  static generateLocalBusinessSchema(
    name: string,
    address: {
      street: string,
      city: string,
      state: string,
      postalCode: string,
      country: string
    },
    phone?: string,
    hours?: string
  ): GeneratedSchema {
    const schema = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": name,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": address.street,
        "addressLocality": address.city,
        "addressRegion": address.state,
        "postalCode": address.postalCode,
        "addressCountry": address.country
      },
      ...(phone && { "telephone": phone }),
      ...(hours && { "openingHours": hours })
    };
    
    return {
      type: 'LocalBusiness',
      code: JSON.stringify(schema, null, 2),
      description: 'Local business information',
      impact: 'Critical for location-based AI queries. Improves geographic discovery.'
    };
  }
  
  static generateProductSchema(
    name: string,
    description: string,
    price?: number,
    currency?: string
  ): GeneratedSchema {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": name,
      "description": description,
      ...(price && currency && {
        "offers": {
          "@type": "Offer",
          "price": price,
          "priceCurrency": currency
        }
      })
    };
    
    return {
      type: 'Product',
      code: JSON.stringify(schema, null, 2),
      description: 'Product information schema',
      impact: 'Enables AI to recommend product with accurate details. Improves e-commerce visibility.'
    };
  }
  
  static generateServiceSchema(
    name: string,
    description: string,
    provider: string,
    areaServed?: string
  ): GeneratedSchema {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Service",
      "name": name,
      "description": description,
      "provider": {
        "@type": "Organization",
        "name": provider
      },
      ...(areaServed && { "areaServed": areaServed })
    };
    
    return {
      type: 'Service',
      code: JSON.stringify(schema, null, 2),
      description: 'Service offering schema',
      impact: 'Clarifies service offerings for AI. Improves service discovery.'
    };
  }
  
  static generateBreadcrumbSchema(items: Array<{name: string, url: string}>): GeneratedSchema {
    const schema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": items.map((item, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "name": item.name,
        "item": item.url
      }))
    };
    
    return {
      type: 'BreadcrumbList',
      code: JSON.stringify(schema, null, 2),
      description: 'Site navigation breadcrumb',
      impact: 'Helps AI understand site hierarchy and context.'
    };
  }
  
  static generateArticleSchema(
    headline: string,
    author: string,
    datePublished: string,
    dateModified: string,
    description: string,
    imageUrl?: string
  ): GeneratedSchema {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": headline,
      "author": {
        "@type": "Person",
        "name": author
      },
      "datePublished": datePublished,
      "dateModified": dateModified,
      "description": description,
      ...(imageUrl && { "image": imageUrl })
    };
    
    return {
      type: 'Article',
      code: JSON.stringify(schema, null, 2),
      description: 'Content article markup',
      impact: 'Improves content attribution and citation likelihood in AI responses.'
    };
  }
  
  static generateHowToSchema(
    name: string,
    steps: Array<{name: string, text: string}>
  ): GeneratedSchema {
    const schema = {
      "@context": "https://schema.org",
      "@type": "HowTo",
      "name": name,
      "step": steps.map((step, index) => ({
        "@type": "HowToStep",
        "position": index + 1,
        "name": step.name,
        "text": step.text
      }))
    };
    
    return {
      type: 'HowTo',
      code: JSON.stringify(schema, null, 2),
      description: 'Step-by-step guide markup',
      impact: 'High-value for instructional queries. AI engines prioritize structured How-To content.'
    };
  }
  
  static generateImplementationInstructions(schemas: GeneratedSchema[]): string {
    return `
# Schema.org Implementation Instructions

## 📋 Overview
This document contains ${schemas.length} Schema.org markup snippets to improve your AI visibility.

## 🔧 How to Implement

### Option 1: Direct HTML Implementation
Add each schema block to your HTML \`<head>\` section:

\`\`\`html
<script type="application/ld+json">
${schemas[0].code}
</script>
\`\`\`

### Option 2: Google Tag Manager
1. Create new Custom HTML tag
2. Paste schema code wrapped in \`<script type="application/ld+json">\` tags
3. Set trigger to "All Pages" or specific page type
4. Publish

### Option 3: WordPress Plugin
If using WordPress, install "Schema Pro" or "Rank Math" plugin and paste schemas in custom schema section.

## 📊 Generated Schemas

${schemas.map((s, i) => `
### ${i + 1}. ${s.type}

**Description:** ${s.description}

**Impact:** ${s.impact}

**Code:**
\`\`\`json
${s.code}
\`\`\`

---
`).join('\n')}

## ✅ Verification

After implementation:
1. Test with Google Rich Results Test: https://search.google.com/test/rich-results
2. Validate with Schema.org validator: https://validator.schema.org/
3. Re-run AISO Instrument audit to measure improvement

## ⚠️ Important Notes

- All schemas should use valid, factual data only
- Avoid keyword stuffing or false claims
- Update schemas when business information changes
- Monitor for Google Search Console warnings
`;
  }
}
