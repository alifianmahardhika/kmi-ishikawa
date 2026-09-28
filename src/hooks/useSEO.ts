import { useEffect } from "react";
import { CONTACT } from "../config/contact";

export function useSEO(title: string, description?: string) {
  useEffect(() => {
    document.title = `${title} - ${CONTACT.orgName}`;
    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.setAttribute("name", "description");
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", description);
    }
  }, [title, description]);
}
