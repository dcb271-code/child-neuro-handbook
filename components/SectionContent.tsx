'use client';

export default function SectionContent({ html }: { html: string }) {
  return (
    <div
      className="doc-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
