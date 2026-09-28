import { useMemo } from "react";
import { marked } from "marked";

export function MarkdownContent({ markdown }: { markdown: string }) {
  const html = useMemo(() => marked.parse(markdown, { async: false }) as string, [markdown]);
  // eslint-disable-next-line react/no-danger -- content is authored by admins via /admin/kegiatan, not public input
  return <div className="markdown-content" dangerouslySetInnerHTML={{ __html: html }} />;
}
