import type { Metadata } from "next";
import Link from "next/link";
import { Check, ShieldCheck, Plus, Megaphone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectCTA } from "@/components/connect-cta";
import { TrackedLink } from "@/components/tracked-link";
import { siteConfig } from "@/lib/config";
import { SPOTLIGHT } from "@/lib/spotlight";

const SPONSOR_CONTACT = siteConfig.email.sponsors;
const SPONSOR_PRICE = "$49";

/** Sponsor subscription checkout (e.g. a Dodo link); unset → email us instead. */
function sponsorCheckoutUrl(): string | null {
  const raw = process.env.SPONSOR_CHECKOUT_URL?.trim();
  return raw && /^https:\/\//.test(raw) ? raw : null;
}

export const metadata: Metadata = {
  title: "Pricing — listing and ranking are free",
  description: `${siteConfig.name} is free to list on and free to rank on — rank is earned with verified Google Search Console clicks. Money only buys clearly labelled visibility (Spotlight, ${SPOTLIGHT.price}; sponsor slot, ${SPONSOR_PRICE}/month), never a rank, a verified mark or a followed link.`,
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  const sponsorCheckout = sponsorCheckoutUrl();
  return (
    <div className="container max-w-6xl py-14">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Pricing</h1>
        <p className="mx-auto mt-4 max-w-2xl text-balance text-lg text-muted-foreground">
          Listing is free and ranking is free — you earn a rank with verified traffic, not a credit card.
          Money only buys clearly labelled visibility. It can never buy a rank, a verified mark, or a
          followed link.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* List — free */}
        <Tier
          icon={<Plus className="size-5" />}
          name="List"
          price="$0"
          cadence="free forever"
          blurb="Get on the open directory. No account, no card."
          features={[
            "A permanent link to your listing",
            "A spot on the public directory",
            "Owner-verified check (add our badge)",
            "A followed link once you add the badge",
          ]}
          cta={
            <Button asChild size="lg" variant="outline" className="w-full">
              <Link href="/submit">
                <Plus className="size-4" /> List your project
              </Link>
            </Button>
          }
        />

        {/* Rank — free, highlighted */}
        <Tier
          highlighted
          icon={<ShieldCheck className="size-5" />}
          name="Rank"
          price="$0"
          cadence="free forever"
          blurb="Connect Search Console and let verified momentum rank you."
          features={[
            "A verified spot on the momentum board",
            "Ranked by real Google Search Console clicks",
            "Eligible for Mover of the week — a free Spotlight",
            "A public, verified profile page",
          ]}
          cta={<ConnectCTA label="Get ranked — free" source="pricing" className="w-full" />}
        />

        {/* Spotlight — paid visibility, owner-verified listings */}
        <Tier
          id="spotlight"
          icon={<Sparkles className="size-5" />}
          name="Spotlight"
          price={SPOTLIGHT.price}
          cadence={`once · ${SPOTLIGHT.days} days`}
          blurb="Top of the directory, its category page and the homepage."
          features={[
            "For owner-verified listings",
            "Labelled “Sponsored” — never affects rank",
            `Only ${SPOTLIGHT.slots} slots at a time`,
            "See the clicks it sent you afterwards",
          ]}
          cta={
            <Button asChild size="lg" variant="outline" className="w-full">
              <Link href="/listed">Book from your listing</Link>
            </Button>
          }
        />

        {/* Sponsor — paid, labelled slot in the board */}
        <Tier
          icon={<Megaphone className="size-5" />}
          name="Sponsor"
          price={SPONSOR_PRICE}
          cadence="per month"
          blurb="A labelled slot in the leaderboard. Never affects rankings."
          features={[
            "A fixed, labelled “Sponsored” slot",
            "Your pitch and a link to your site",
            "Excluded from scoring — ranks don't move",
            "Reach visitors who trust verified data",
          ]}
          cta={
            <Button asChild size="lg" variant="outline" className="w-full">
              {sponsorCheckout ? (
                <TrackedLink event="sponsor_checkout_click" label="pricing_tier" href={sponsorCheckout}>
                  Sponsor for {SPONSOR_PRICE}/mo
                </TrackedLink>
              ) : (
                <TrackedLink event="sponsor_contact_click" label="pricing_tier" href={`mailto:${SPONSOR_CONTACT}?subject=Sponsoring%20${siteConfig.name}`}>
                  Get in touch
                </TrackedLink>
              )}
            </Button>
          }
        />
      </div>

      {/* Coming soon: Archive (validation) — an optional add-on; ranking stays free. */}
      <Link
        href="/archive"
        className="mt-6 flex flex-col gap-1 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5 text-center transition-colors hover:border-primary/50 sm:flex-row sm:items-center sm:justify-between sm:text-left"
      >
        <span>
          <span className="text-sm font-semibold">Coming soon: RealRank Archive</span>
          <span className="block text-sm text-muted-foreground">
            Keep your Search Console history forever, export it anywhere, get alerted when traffic moves.
            An optional add-on — ranking stays free.
          </span>
        </span>
        <span className="shrink-0 text-sm font-medium text-primary">Founding access →</span>
      </Link>

      {/* The integrity line */}
      <div className="mt-12 flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-8 text-center">
        <ShieldCheck className="size-6 text-primary" />
        <h2 className="text-xl font-semibold tracking-tight">You can&apos;t buy a rank here</h2>
        <p className="max-w-xl text-sm text-muted-foreground">
          Every position on the board is decided by verified organic clicks. Money buys labelled
          visibility — a Spotlight or a sponsor slot — and nothing else: never a better rank, never a
          verified mark, never a followed link. The fastest-growing verified site gets a Spotlight free
          every week, because it grew.
        </p>
      </div>

      {/* FAQ */}
      <section className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Faq q="Is it really free?">
          Yes. Listing is free, and a verified ranked spot is free — you only need to connect
          Google Search Console (read-only) so we can measure your real clicks. No subscription,
          no card.
        </Faq>
        <Faq q="Can I pay to rank higher?">
          No. The ranking is decided entirely by verified organic momentum. Money buys clearly
          labelled visibility, never a position on the board.
        </Faq>
        <Faq q="What is Spotlight?">
          {SPOTLIGHT.days} days at the top of the directory, your category page and the homepage for{" "}
          {SPOTLIGHT.price}, labelled &ldquo;Sponsored&rdquo;. It&apos;s for owner-verified listings only, there are
          only {SPOTLIGHT.slots} slots at a time, and afterwards you can see exactly how many clicks it sent you.
          Book it from your listing&apos;s page.
        </Faq>
        <Faq q="How do sponsorships work?">
          A sponsor slot is a fixed, labelled spot in the leaderboard for {SPONSOR_PRICE}/month. It&apos;s
          excluded from scoring, so it never changes where any site ranks. Questions? Email{" "}
          <TrackedLink event="sponsor_contact_click" label="pricing_faq" href={`mailto:${SPONSOR_CONTACT}`} className="text-primary hover:underline">
            {SPONSOR_CONTACT}
          </TrackedLink>
          .
        </Faq>
      </section>
    </div>
  );
}

function Tier({
  id,
  icon,
  name,
  price,
  cadence,
  blurb,
  features,
  cta,
  highlighted = false,
}: {
  id?: string;
  icon: React.ReactNode;
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  features: string[];
  cta: React.ReactNode;
  highlighted?: boolean;
}) {
  return (
    <div
      id={id}
      className={
        "flex scroll-mt-24 flex-col rounded-2xl border bg-card p-6 " +
        (highlighted ? "border-primary/50 ring-1 ring-primary/30" : "border-border")
      }
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <h2 className="mt-3 text-lg font-semibold tracking-tight">{name}</h2>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-3xl font-bold tracking-tight">{price}</span>
        <span className="text-sm text-muted-foreground">{cadence}</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{blurb}</p>
      <ul className="mt-5 flex flex-1 flex-col gap-2.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">{cta}</div>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold">{q}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}
