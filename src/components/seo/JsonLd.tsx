interface JsonLdProps {
  data: object;
}

/**
 * Emits a JSON-LD <script>. Rendered in the document so it appears in the
 * prerendered HTML (crawlers + AI read JSON-LD regardless of position).
 */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe to inline; no user-controlled HTML.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
