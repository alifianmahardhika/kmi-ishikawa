import { getDb } from "../lib/db";
import { createSessionCookie, clearSessionCookie, isAuthenticated, verifyPassword } from "../lib/auth";
import {
  badRequest,
  json,
  methodNotAllowed,
  notFound,
  serverError,
  unauthorized,
} from "../lib/respond";
import { optionalString, requireBoolean, requireInt, requireString } from "../lib/validate";
import type { Campaign, Donation, DonationStatus } from "../../src/types/donation";
import type { EventItem } from "../../src/types/event";
import type { Expense } from "../../src/types/expense";
import { DEFAULT_CAMPAIGN_ID } from "../../src/config/campaign";

// Every /api/admin/* request lands here (Netlify routes any path under
// /.netlify/functions/admin/* to this one function) — we parse the remainder of the
// path ourselves rather than splitting admin concerns into several functions, since
// Netlify's redirect rule can't express nested dynamic segments on its own.
export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean);
  const adminIndex = segments.indexOf("admin");
  const rest = segments.slice(adminIndex + 1); // e.g. ["donasi", "5"]
  const [resource, id] = rest;

  try {
    if (resource === "login") return await handleLogin(req);
    if (resource === "logout") return handleLogout(req);
    if (resource === "me") return handleMe(req);

    // Everything below requires a valid session.
    if (!isAuthenticated(req)) return unauthorized();

    if (resource === "donasi") return await handleDonasi(req, id);
    if (resource === "kegiatan") return await handleKegiatan(req, id);
    if (resource === "laporan") return await handleLaporan(req, id);
    if (resource === "campaign") return await handleCampaign(req);

    return notFound();
  } catch (err) {
    return serverError(err instanceof Error ? err.message : undefined);
  }
}

async function handleLogin(req: Request): Promise<Response> {
  if (req.method !== "POST") return methodNotAllowed();
  const body = await req.json().catch(() => ({}));
  const password = typeof body.password === "string" ? body.password : "";
  if (!password || !(await verifyPassword(password))) return unauthorized();
  return json({ ok: true }, { headers: { "set-cookie": createSessionCookie() } });
}

function handleLogout(req: Request): Response {
  if (req.method !== "POST") return methodNotAllowed();
  return json({ ok: true }, { headers: { "set-cookie": clearSessionCookie() } });
}

function handleMe(req: Request): Response {
  if (req.method !== "GET") return methodNotAllowed();
  if (!isAuthenticated(req)) return unauthorized();
  return json({ ok: true });
}

function toDonation(row: Record<string, unknown>): Donation {
  return {
    id: Number(row.id),
    code: String(row.code),
    campaignId: String(row.campaign_id),
    donorName: String(row.donor_name),
    isAnonymous: Boolean(row.is_anonymous),
    amount: Number(row.amount),
    message: String(row.message ?? ""),
    contact: String(row.contact ?? ""),
    status: row.status as DonationStatus,
    verifiedAt: row.verified_at ? String(row.verified_at) : null,
    verifiedBy: row.verified_by ? String(row.verified_by) : null,
    adminNote: String(row.admin_note ?? ""),
    createdAt: String(row.created_at),
  };
}

async function handleDonasi(req: Request, id?: string): Promise<Response> {
  const db = getDb();

  if (!id) {
    if (req.method !== "GET") return methodNotAllowed();
    const result = await db.execute("SELECT * FROM donations ORDER BY created_at DESC");
    return json(result.rows.map((r) => toDonation(r as Record<string, unknown>)));
  }

  if (req.method !== "PATCH") return methodNotAllowed();
  const body = await req.json().catch(() => ({}));
  let status: DonationStatus;
  try {
    status = requireString(body.status, "status") as DonationStatus;
  } catch (err) {
    return badRequest(err instanceof Error ? err.message : "status_invalid");
  }
  if (status !== "verified" && status !== "rejected" && status !== "pending") {
    return badRequest("status_invalid");
  }
  const adminNote = optionalString(body.adminNote, "adminNote", 500);

  const result = await db.execute({
    sql: `UPDATE donations SET status = ?, verified_at = ?, verified_by = ?, admin_note = ?
          WHERE id = ?`,
    args: [
      status,
      status === "verified" ? new Date().toISOString() : null,
      status === "verified" ? "admin" : null,
      adminNote,
      Number(id),
    ],
  });
  if (result.rowsAffected === 0) return notFound("donation_not_found");
  return json({ ok: true });
}

function toEventItem(row: Record<string, unknown>): EventItem {
  return {
    id: Number(row.id),
    slug: String(row.slug),
    title: String(row.title),
    startsAt: String(row.starts_at),
    location: String(row.location ?? ""),
    summary: String(row.summary ?? ""),
    body: String(row.body ?? ""),
    image: String(row.image ?? ""),
    isPublished: Boolean(row.is_published),
    createdAt: String(row.created_at),
  };
}

async function handleKegiatan(req: Request, id?: string): Promise<Response> {
  const db = getDb();

  if (!id) {
    if (req.method === "GET") {
      const result = await db.execute("SELECT * FROM events ORDER BY starts_at DESC");
      return json(result.rows.map((r) => toEventItem(r as Record<string, unknown>)));
    }
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      try {
        const slug = requireString(body.slug, "slug", { max: 200 });
        const title = requireString(body.title, "title", { max: 200 });
        const startsAt = requireString(body.startsAt, "startsAt");
        const location = optionalString(body.location, "location", 200);
        const summary = optionalString(body.summary, "summary", 500);
        const eventBody = optionalString(body.body, "body", 20000);
        const image = optionalString(body.image, "image", 500);
        const isPublished = requireBoolean(body.isPublished, "isPublished");

        await db.execute({
          sql: `INSERT INTO events (slug, title, starts_at, location, summary, body, image, is_published, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            slug,
            title,
            startsAt,
            location,
            summary,
            eventBody,
            image,
            isPublished ? 1 : 0,
            new Date().toISOString(),
          ],
        });
        return json({ ok: true });
      } catch (err) {
        return badRequest(err instanceof Error ? err.message : "invalid_input");
      }
    }
    return methodNotAllowed();
  }

  if (req.method === "PATCH") {
    const body = await req.json().catch(() => ({}));
    try {
      const slug = requireString(body.slug, "slug", { max: 200 });
      const title = requireString(body.title, "title", { max: 200 });
      const startsAt = requireString(body.startsAt, "startsAt");
      const location = optionalString(body.location, "location", 200);
      const summary = optionalString(body.summary, "summary", 500);
      const eventBody = optionalString(body.body, "body", 20000);
      const image = optionalString(body.image, "image", 500);
      const isPublished = requireBoolean(body.isPublished, "isPublished");

      const result = await db.execute({
        sql: `UPDATE events SET slug = ?, title = ?, starts_at = ?, location = ?, summary = ?,
              body = ?, image = ?, is_published = ? WHERE id = ?`,
        args: [slug, title, startsAt, location, summary, eventBody, image, isPublished ? 1 : 0, Number(id)],
      });
      if (result.rowsAffected === 0) return notFound("event_not_found");
      return json({ ok: true });
    } catch (err) {
      return badRequest(err instanceof Error ? err.message : "invalid_input");
    }
  }

  if (req.method === "DELETE") {
    const result = await db.execute({ sql: "DELETE FROM events WHERE id = ?", args: [Number(id)] });
    if (result.rowsAffected === 0) return notFound("event_not_found");
    return json({ ok: true });
  }

  return methodNotAllowed();
}

function toExpense(row: Record<string, unknown>): Expense {
  return {
    id: Number(row.id),
    campaignId: String(row.campaign_id),
    title: String(row.title),
    category: String(row.category),
    amount: Number(row.amount),
    spentOn: String(row.spent_on),
    note: String(row.note ?? ""),
    createdAt: String(row.created_at),
  };
}

async function handleLaporan(req: Request, id?: string): Promise<Response> {
  const db = getDb();

  if (!id) {
    if (req.method === "GET") {
      const url = new URL(req.url);
      const campaignId = url.searchParams.get("campaign");
      const result = campaignId
        ? await db.execute({
            sql: "SELECT * FROM expenses WHERE campaign_id = ? ORDER BY spent_on DESC, id DESC",
            args: [campaignId],
          })
        : await db.execute("SELECT * FROM expenses ORDER BY spent_on DESC, id DESC");
      return json(result.rows.map((r) => toExpense(r as Record<string, unknown>)));
    }
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      try {
        const campaignId = requireString(body.campaignId, "campaignId", { max: 100 });
        const title = requireString(body.title, "title", { max: 200 });
        const category = optionalString(body.category, "category", 100) || "lainnya";
        const amount = requireInt(body.amount, "amount", { min: 1, max: 50_000_000 });
        const spentOn = requireString(body.spentOn, "spentOn");
        const note = optionalString(body.note, "note", 500);

        await db.execute({
          sql: `INSERT INTO expenses (campaign_id, title, category, amount, spent_on, note, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [campaignId, title, category, amount, spentOn, note, new Date().toISOString()],
        });
        return json({ ok: true });
      } catch (err) {
        return badRequest(err instanceof Error ? err.message : "invalid_input");
      }
    }
    return methodNotAllowed();
  }

  if (req.method === "DELETE") {
    const result = await db.execute({ sql: "DELETE FROM expenses WHERE id = ?", args: [Number(id)] });
    if (result.rowsAffected === 0) return notFound("expense_not_found");
    return json({ ok: true });
  }

  return methodNotAllowed();
}

function toCampaign(row: Record<string, unknown>): Campaign {
  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description ?? ""),
    targetAmount: Number(row.target_amount),
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
  };
}

// Single-resource: no :id in the URL — a query param picks which campaign, defaulting
// to the one the public site shows (src/config/campaign.ts's DEFAULT_CAMPAIGN_ID).
async function handleCampaign(req: Request): Promise<Response> {
  const db = getDb();
  const url = new URL(req.url);
  const campaignId = url.searchParams.get("campaign") ?? DEFAULT_CAMPAIGN_ID;

  if (req.method === "GET") {
    const result = await db.execute({ sql: "SELECT * FROM campaigns WHERE id = ?", args: [campaignId] });
    const row = result.rows[0];
    if (!row) return notFound("campaign_not_found");
    return json(toCampaign(row as Record<string, unknown>));
  }

  if (req.method === "PATCH") {
    const body = await req.json().catch(() => ({}));
    try {
      const targetAmount = requireInt(body.targetAmount, "targetAmount", { min: 1, max: 100_000_000 });
      const title = optionalString(body.title, "title", 200);
      const description = optionalString(body.description, "description", 1000);

      const sets = ["target_amount = ?"];
      const args: (string | number)[] = [targetAmount];
      if (title) {
        sets.push("title = ?");
        args.push(title);
      }
      if (description) {
        sets.push("description = ?");
        args.push(description);
      }
      args.push(campaignId);

      const result = await db.execute({
        sql: `UPDATE campaigns SET ${sets.join(", ")} WHERE id = ?`,
        args,
      });
      if (result.rowsAffected === 0) return notFound("campaign_not_found");
      return json({ ok: true });
    } catch (err) {
      return badRequest(err instanceof Error ? err.message : "invalid_input");
    }
  }

  return methodNotAllowed();
}
