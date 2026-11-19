import type { Metadata } from "next";
import Link from "next/link";
import { AudienceProof } from "@/components/audience-proof";
import { Megaphone, CheckCircle2, ShieldCheck, CalendarClock, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Leaderboard } from "@/components/leaderboard";
import { TrackedLink } from "@/components/tracked-link";
import { SPONSOR, cleanSponsorDetails, sponsorCheckoutUrl } from "@/lib/sponsor";
import { freeSponsorPositions } from "@/lib/placements";
import { siteConfig } from "@/lib/config";

type SearchParams = Promise<{ url?: string; name?: string; pitch?: string; status?: string }>;

export const metadata: Metadata = {
  title: "Sponsor the leaderboard",
  description: `A fixed, labelled "Sponsored" row on the ${siteConfig.name} leaderboard for ${SPONSOR.price}/${SPONSOR.cadence}. Seen by people who care about real traffic. Never affects anyone's rank.`,
  alternates: { canonical: "/sponsor" },
};

/**
 * Book a sponsor slot: fill in the ad, see exactly how it will look, pay. The
 * details ride along with the Dodo subscription (as metadata), so the slot
 * goes live from the payment webhook without anyone re-typing them.
 * Server-rendered from the query string — works without client JS.
 */
export default async function SponsorPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const submitted = Boolean(sp.url || sp.name);
  const details = submitted ? cleanSponsorDetails(sp) : null;
  let free: number[] = [...SPONSOR.positions];
  try {
    free = await freeSponsorPositions();
  } catch {
    /* can't read availability — let them try; the webhook still enforces it */
  }
  const soldOut = free.length === 0;
  const checkout = details && !soldOut ? sponsorCheckoutUrl(details) : null;
  const contact = `mailto:${siteConfig.email.sponsors}?subject=${encodeURIComponent(`Sponsoring ${siteConfig.name}`)}`;

  return (
    <div className="container max-w-2xl py-14">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
          <Megaphone className="size-3.5 text-primary" /> Sponsor · {SPONSOR.price}/{SPONSOR.cadence}
        </span>
        <h1 className="mt-4 text-balance text-3xl font-bold tracking-tight sm:text-4xl">Sponsor the leaderboard</h1>
        <p className="mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">
          One labelled &ldquo;Sponsored&rdquo; row on the {siteConfig.name} leaderboard, in front of founders and
          marketers who care about real organic traffic. It sits between ranked sites and never changes anyone&apos;s
          rank.
        </p>
        <p className="mt-3 text-sm">
          {soldOut ? (
            <span className="text-muted-foreground">
              Both sponsor slots are taken.{" "}
              <a href={contact} className="font-medium text-primary hover:underline">
                Get on the waitlist
              </a>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 font-medium text-success">
              <span className="size-2 rounded-full bg-success" />
              {free.length} of {SPONSOR.positions.length} slots open
            </span>
          )}
        </p>
      </div>

      {sp.status === "success" && (
        <div role="status" className="mt-8 flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4 text-sm">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
          <p>
            <span className="font-semibold">Thank you — you&apos;re a sponsor.</span> Your row goes live on the
            leaderboard within a minute or two of the payment clearing. To change the text or link later, email{" "}
            <a className="underline" href={`mailto:${siteConfig.email.support}`}>
              {siteConfig.email.support}
            </a>
            .
          </p>
        </div>
      )}

      <AudienceProof />

      {!soldOut && sp.status !== "success" && (
        <form action="/sponsor" method="get" className="mt-8 flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <p className="font-semibold">Your ad</p>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Website</span>
            <input
              name="url"
              required
              defaultValue={sp.url ?? ""}
              placeholder="yourproduct.com"
              inputMode="url"
              autoCapitalize="none"
              spellCheck={false}
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              Name <span className="font-normal text-muted-foreground">up to {SPONSOR.nameMax} characters</span>
            </span>
            <input name="name" required maxLength={SPONSOR.nameMax} defaultValue={sp.name ?? ""} placeholder="Your product" className={inputClass} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">
              One-line pitch <span className="font-normal text-muted-foreground">up to {SPONSOR.pitchMax} characters</span>
            </span>
            <input
              name="pitch"
              maxLength={SPONSOR.pitchMax}
              defaultValue={sp.pitch ?? ""}
              placeholder="What it does, for whom"
              className={inputClass}
            />
          </label>
          {submitted && !details && (
            <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              Add a valid website and a name of at least 2 characters.
            </p>
          )}
          <Button type="submit" variant={details ? "outline" : "default"} className="sm:self-start">
            {details ? "Update preview" : "Preview my ad"}
          </Button>
        </form>
      )}

      {details && !soldOut && sp.status !== "success" && (
        <section className="mt-6" aria-label="Preview">
          <p className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium">
            <Eye className="size-4 text-primary" /> How it will look on the leaderboard
          </p>
          <Leaderboard
            view="momentum"
            rows={[
              {
                kind: "sponsored",
                id: "preview",
                displayName: details.name,
                siteUrl: details.url,
                description: details.pitch,
                ctaLabel: "Visit",
                afterRank: free[0] ?? SPONSOR.positions[0],
              },
            ]}
          />
          <div className="mt-5 flex flex-col items-start gap-2">
            {checkout ? (
              <Button asChild size="lg">
                <TrackedLink event="sponsor_checkout_click" label="sponsor_page" href={checkout}>
                  Subscribe — {SPONSOR.price}/{SPONSOR.cadence}
                </TrackedLink>
              </Button>
            ) : (
              <Button asChild size="lg" variant="outline">
                <TrackedLink event="sponsor_contact_click" label="sponsor_page" href={contact}>
                  Get in touch to sponsor
                </TrackedLink>
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Shown right after rank #{free[0] ?? SPONSOR.positions[0]}. Cancel any time — the row stays up until the
              end of the month you&apos;ve paid for.
            </p>
          </div>
        </section>
      )}

      <ul className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          { icon: <ShieldCheck className="size-4" />, t: "Labelled, always", b: "Marked “Sponsored” with a rel=\"sponsored\" link. Never mistaken for a ranking." },
          { icon: <CalendarClock className="size-4" />, t: "Monthly, cancel any time", b: `${SPONSOR.price}/${SPONSOR.cadence}. Cancel and it runs to the end of the paid month.` },
          { icon: <Megaphone className="size-4" />, t: `Only ${SPONSOR.positions.length} slots`, b: `After rank #${SPONSOR.positions.join(" and #")}, so a sponsor actually stands out.` },
        ].map((f) => (
          <li key={f.t} className="rounded-xl border border-border bg-card p-4">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">{f.icon}</span>
            <p className="mt-3 font-medium">{f.t}</p>
            <p className="mt-1 text-sm text-muted-foreground">{f.b}</p>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Money buys labelled visibility on {siteConfig.name} — never a rank, a verified mark, or a followed link.{" "}
        <Link href="/pricing" className="text-primary hover:underline">
          Pricing &amp; FAQ
        </Link>{" "}
        · Want a spot in the directory instead?{" "}
        <Link href="/spotlight" className="text-primary hover:underline">
          Spotlight
        </Link>
      </p>
    </div>
  );
}

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-card px-3 text-sm outline-none transition-colors focus:border-primary/50";
