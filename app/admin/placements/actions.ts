"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { activateSpotlight, normalizeHost } from "@/lib/listed";
import { createManualSponsorSlot, endSpotlightNow, updateSponsorSlot, type SlotPatch } from "@/lib/placements";
import { SPONSOR, cleanSponsorDetails } from "@/lib/sponsor";
import { markAllNotificationsRead } from "@/lib/admin-log";

// Every action re-checks the admin gate: server actions are reachable on their
// own, not only through the page that renders their forms.

const done = () => revalidatePath("/admin/placements");
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

export async function endSpotlightAction(fd: FormData) {
  await requireAdmin();
  const host = normalizeHost(str(fd, "host"));
  if (host) await endSpotlightNow(host);
  done();
}

/** Start or extend a Spotlight by hand (comped, or a payment that didn't come through). */
export async function grantSpotlightAction(fd: FormData) {
  await requireAdmin();
  const host = normalizeHost(str(fd, "host"));
  const days = Math.min(90, Math.max(1, Number(str(fd, "days")) || 7));
  if (host) await activateSpotlight(host, `admin-${Date.now()}`, days, { customerEmail: str(fd, "email") || null });
  done();
}

export async function setSlotStateAction(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const to = str(fd, "to");
  const patch: SlotPatch =
    to === "pause"
      ? { is_active: false, status: "paused" }
      : to === "resume"
        ? { is_active: true, status: "active" }
        : to === "end"
          ? { is_active: false, status: "ended", ends_at: new Date().toISOString() }
          : {};
  if (id && Object.keys(patch).length) await updateSponsorSlot(id, patch);
  done();
}

/** Edit a slot's ad and timing; also how a "needs details" / "waitlist" slot goes live. */
export async function saveSlotAction(fd: FormData) {
  await requireAdmin();
  const id = str(fd, "id");
  const details = cleanSponsorDetails({ url: str(fd, "url"), name: str(fd, "name"), pitch: str(fd, "pitch") });
  const position = Number(str(fd, "position"));
  const endsAt = str(fd, "ends_at");
  if (!id || !details) return;
  const patch: SlotPatch = {
    display_name: details.name,
    site_url: details.url,
    description: details.pitch,
    position_after_rank: SPONSOR.positions.includes(position) ? position : SPONSOR.positions[0],
  };
  if (endsAt && Number.isFinite(Date.parse(endsAt))) patch.ends_at = new Date(endsAt).toISOString();
  if (fd.get("go_live") === "on") Object.assign(patch, { is_active: true, status: "active" });
  await updateSponsorSlot(id, patch);
  done();
}

export async function createSlotAction(fd: FormData) {
  await requireAdmin();
  const details = cleanSponsorDetails({ url: str(fd, "url"), name: str(fd, "name"), pitch: str(fd, "pitch") });
  const position = Number(str(fd, "position"));
  const endsAt = Date.parse(str(fd, "ends_at"));
  if (!details || !Number.isFinite(endsAt)) return;
  await createManualSponsorSlot({
    display_name: details.name,
    site_url: details.url,
    description: details.pitch,
    position_after_rank: SPONSOR.positions.includes(position) ? position : SPONSOR.positions[0],
    ends_at: new Date(endsAt).toISOString(),
  });
  done();
}

export async function markNotificationsReadAction() {
  await requireAdmin();
  await markAllNotificationsRead();
  revalidatePath("/admin/placements");
  revalidatePath("/dashboard");
}
