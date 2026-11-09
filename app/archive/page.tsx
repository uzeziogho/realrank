import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  Archive,
  History,
  Database,
  FileDown,
  Mail,
  BellRing,
  Lock,
  Check,
  Sparkles,
} from "lucide-react";
import { ArchiveCta } from "@/components/archive-cta";
import { ArchiveThanks } from "@/components/archive-thanks";
import { WaitlistForm } from "@/components/waitlist-form";
import { siteConfig } from "@/lib/config";

/**
 * RealRank Archive — VALIDATION page. The product isn't built yet: this page
 * exists to measure willingness to pay before building it. Interest is measured
 * three ways: waitlist sign-ups (waitlist.source = "archive"), CTA clicks
 * (archive_checkout_click / archive_reserve_click events), and founding
 * purchases through the payment link. The copy says plainly that it's pre-launch.
 *
 * Offer terms live in the constants below — edit them here, not in the layout.
 */
const PRODUCT = "RealRank Archive";
const FOUNDER_MONTHLY = "£9";
const FOUNDING_PRICE = "£99";
const FOUNDING_CAP = 50;
const FOUNDING_SITES = 3;
/** Pre-launch refund promise shown next to the founding offer. Confirm before launch. */
const REFUND_LINE = "Changed your mind before launch? Email us for a full refund.";

/**
 * Payment link for the founding offer (e.g. a Dodo Payments checkout URL), set
 * in the environment. Unset → every buy button falls back to the waitlist, so
 * the page is safe to publish before checkout exists.
 */
function checkoutUrl(): string | null {
  const raw = process.env.ARCHIVE_FOUNDING_CHECKOUT_URL?.trim();
  return raw && /^https:\/\//.test(raw) ? raw : null;
}

export const metadata: Metadata = {
  title: `${PRODUCT} — Never lose your Search Console data`,
  description:
    "Google Search Console deletes everything older than 16 months. RealRank Archive backfills your full history when you connect, keeps every day after that forever, exports anywhere, and alerts you when traffic moves. Founding access open.",
  alternates: { canonical: "/archive" },
  openGraph: {
    title: `${PRODUCT} — Never lose your Search Console data`,
    description:
      "Backfill 16 months on connect, keep every day forever, export anywhere, get alerted when traffic moves.",
    url: `${siteConfig.url}/archive`,
  },
};

const FEATURES = [
  {
    icon: History,
    title: "16 months, instantly",
    body: "Connect once and we backfill everything Search Console still has — your full 16 months — on day one.",
  },
  {
    icon: Database,
    title: "Every day after, forever",
    body: "A daily sync stores clicks, impressions, CTR and position. Nothing ages out after 16 months again.",
  },
  {
    icon: Archive,
    title: "Page & query history",
    body: "See exactly which pages and searches moved, across your whole history — not just the last 16 months.",
  },
  {
    icon: FileDown,
    title: "Export anytime",
    body: "One-click CSV of your full history. It's your data — take it to a spreadsheet, a deck, or anywhere else.",
  },
  {
    icon: Mail,
    title: "Weekly digest",
    body: "A short email each week: what grew, what dropped, and the pages and queries behind it.",
  },
  {
    icon: BellRing,
    title: "Traffic-drop alerts",
    body: "Know the day a page or query falls off — before it shows up in your revenue.",
  },
] as const;

const FAQ = [
  {
    q: "Why not just use Search Console?",
    a: "Search Console only keeps 16 months. Every day, your oldest day is deleted for good — year-over-year comparisons and long-term trends disappear with it. Archive keeps it all, and adds exports, a weekly digest and alerts on top.",
  },
  {
    q: "Is it read-only?",
    a: "Yes. It uses the same read-only Search Console access RealRank already uses. We can never change anything in your account.",
  },
  {
    q: "Do you publish my queries or pages?",
    a: "Never. Archive is a separate, opt-in feature. Your page- and query-level history is stored privately for you alone and never appears on the public leaderboard. You can export or delete it anytime.",
  },
  {
    q: "When does it launch?",
    a: "It's in development now. Founding members and the waitlist get access first, and we'll email you the moment your archive is ready.",
  },
  {
    q: "What does founding access include?",
    a: `Everything in the Founder plan, for life, for up to ${FOUNDING_SITES} sites — one payment of ${FOUNDING_PRICE}, no subscription. Limited to the first ${FOUNDING_CAP} people.`,
  },
] as const;

export default function ArchivePage() {
  const checkout = checkoutUrl();

  return (
    <>
      {/* Post-checkout thank-you (?founding=success from the payment link). */}
      <Suspense fallback={null}>
        <ArchiveThanks supportEmail={siteConfig.email.support} />
      </Suspense>

      {/* Hero */}
      <section className="hero-glow border-b border-border/60">
        <div className="container max-w-4xl py-14 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="size-3.5" /> Coming soon · founding access open
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Never lose a day of Search Console data.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-lg text-muted-foreground">
            Google deletes everything older than 16 months. {PRODUCT} backfills your full history the
            moment you connect, keeps every day after that forever, and tells you when your traffic moves.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ArchiveCta href={checkout} plan="founding">
              Get founding access — {FOUNDING_PRICE} once
            </ArchiveCta>
            <ArchiveCta href={null} plan="waitlist" variant="outline">
              Join the waitlist
            </ArchiveCta>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            First {FOUNDING_CAP} founding members only · {REFUND_LINE}
          </p>
        </div>
      </section>

      <div className="container max-w-5xl py-12">
        {/* The problem */}
        <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">The problem</p>
          <p className="mt-2 text-pretty text-lg">
            Your Search Console history has an expiry date. Last year&apos;s launch spike, the update that
            tanked you, the page that quietly took off — after 16 months, it&apos;s gone.
          </p>
        </div>

        {/* Features */}
        <h2 className="mt-14 text-center text-2xl font-semibold tracking-tight">What you get</h2>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-5">
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="size-5" />
              </span>
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <h2 id="pricing" className="mt-16 text-center text-2xl font-semibold tracking-tight">
          Simple pricing
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">Planned pricing at launch.</p>
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Plan
            name="Free"
            price="£0"
            cadence="forever"
            features={[
              "1 site",
              "Your full 16-month backfill",
              "Dashboard & date comparison",
              "Your verified RealRank profile",
            ]}
            cta={
              <ArchiveCta href={null} plan="free" variant="outline" className="w-full">
                Join the waitlist
              </ArchiveCta>
            }
          />
          <Plan
            name="Founder"
            price={FOUNDER_MONTHLY}
            cadence="per month"
            features={[
              `${FOUNDING_SITES} sites`,
              "Unlimited history — kept forever",
              "Page & query history",
              "Unlimited CSV exports",
              "Weekly digest + drop alerts",
            ]}
            cta={
              <ArchiveCta href={null} plan="founder-monthly" variant="outline" className="w-full">
                Join the waitlist
              </ArchiveCta>
            }
          />
          <Plan
            highlighted
            name="Founding member"
            price={FOUNDING_PRICE}
            cadence="once, for life"
            badge={`First ${FOUNDING_CAP} only`}
            features={[
              "Everything in Founder, for life",
              `Up to ${FOUNDING_SITES} sites`,
              "First access before public launch",
              "No subscription, ever",
            ]}
            cta={
              <ArchiveCta href={checkout} plan="founding" className="w-full">
                Get founding access
              </ArchiveCta>
            }
            note={REFUND_LINE}
          />
        </div>

        {/* Privacy */}
        <div className="mx-auto mt-16 flex max-w-3xl flex-col gap-3 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-start">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Lock className="size-5" />
          </span>
          <div>
            <h2 className="font-semibold">Your data stays yours</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Archive is opt-in and separate from the public leaderboard. It uses read-only Search Console
              access, stores your page- and query-level history privately for you alone, and never publishes
              it. Export it or delete it whenever you like.
            </p>
          </div>
        </div>

        {/* FAQ */}
        <h2 className="mt-16 text-center text-2xl font-semibold tracking-tight">Questions</h2>
        <div className="mx-auto mt-6 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2">
          {FAQ.map((f) => (
            <div key={f.q} className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold">{f.q}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
            </div>
          ))}
        </div>

        {/* Waitlist */}
        <div
          id="waitlist"
          className="mx-auto mt-16 flex max-w-2xl scroll-mt-24 flex-col items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center"
        >
          <h2 className="text-xl font-semibold tracking-tight">Get early access</h2>
          <p className="text-sm text-muted-foreground">
            Join the waitlist and we&apos;ll email you when {PRODUCT} is ready. No spam — one email at launch.
          </p>
          <WaitlistForm source="archive" cta="Join waitlist" />
          <p className="text-xs text-muted-foreground">
            Already on RealRank?{" "}
            <Link href="/dashboard" className="text-primary hover:underline">
              Your dashboard
            </Link>{" "}
            is where Archive will live.
          </p>
        </div>
      </div>
    </>
  );
}

function Plan({
  name,
  price,
  cadence,
  features,
  cta,
  badge,
  note,
  highlighted = false,
}: {
  name: string;
  price: string;
  cadence: string;
  features: string[];
  cta: React.ReactNode;
  badge?: string;
  note?: string;
  highlighted?: boolean;
}) {
  return (
    <div
      className={
        "flex flex-col rounded-2xl border bg-card p-6 " +
        (highlighted ? "border-primary/50 ring-1 ring-primary/30" : "border-border")
      }
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold tracking-tight">{name}</h3>
        {badge && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{badge}</span>
        )}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-3xl font-bold tracking-tight">{price}</span>
        <span className="text-sm text-muted-foreground">{cadence}</span>
      </div>
      <ul className="mt-5 flex flex-1 flex-col gap-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">{cta}</div>
      {note && <p className="mt-2 text-center text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}
