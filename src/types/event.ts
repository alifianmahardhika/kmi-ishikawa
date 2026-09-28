export interface EventItem {
  id: number;
  slug: string;
  title: string;
  startsAt: string; // ISO datetime
  location: string;
  summary: string;
  body: string; // markdown
  image: string;
  isPublished: boolean;
  createdAt: string;
}

export type EventCreateInput = Omit<EventItem, "id" | "createdAt">;
