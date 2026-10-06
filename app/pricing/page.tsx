import type { Metadata } from "next";
import Link from "next/link";
import { Check, ShieldCheck, Plus, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectCTA } from "@/components/connect-cta";
import { siteConfig } from "@/lib/config";

const CONTACT = "support@realrank.lol";

export const metadata: Metadata = {
  title: "Pricing — RealRank is free",
  description: `${siteConfig.name} is free. List your project for free, and get a verified, ranked spot for free by connecting Google Search Console. The only paid option is a clearly-marked sponsored placement — and it never changes the ranking.`,
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  return (
    <div className="container max-w-5xl py-14">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Pricing</h1>
        <p className="mx-auto mt-4 max-w-xl text-balance text-lg text-muted-foreground">
          {siteConfig.name} is free. Listing is free, and a verified ranked spot is free —
          you earn it with real traffic, not a credit card. The only paid thing is a
          sponsored placement, and it can never move the ranking.
        </p>
      </div>

      <div className="mt-12 grid gap-5 lg:grid-cols-3">
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
            "A followed link back to your site",
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
            "Eligible for Movers, Underdogs & Founding",
            "A public, verified profile page",
          ]}
          cta={<ConnectCTA label="Get ranked — free" source="pricing" className="w-full" />}
        />

        {/* Sponsor — paid */}
        <Tier
          icon={<Megaphone className="size-5" />}
          name="Sponsor"
          price="Custom"
          cadence="paid placement"
          blurb="A clearly-marked ad slot in the board. Never affects rankings."
          features={[
            "A fixed, labeled “Sponsored” slot",
            "Your pitch and a link to your site",
            "Excluded from scoring — ranks don't move",
            "Reach visitors who trust verified data",
          ]}
          cta={
            <Button asChild size="lg" variant="outline" className="w-full">
              <a href={`mailto:${CONTACT}?subject=Sponsoring%20${siteConfig.name}`}>Get in touch</a>
            </Button>
          }
        />
      </div>

      {/* The integrity line */}
      <div className="mt-12 flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-8 text-center">
        <ShieldCheck className="size-6 text-primary" />
        <h2 className="text-xl font-semibold tracking-tight">You can&apos;t buy a rank here</h2>
        <p className="max-w-xl text-sm text-muted-foreground">
          Every position on the board is decided by verified organic clicks. Sponsors get a
          labeled slot at a fixed spot — never a better rank. That&apos;s the whole point: the
          order is real, and it can&apos;t be paid for.
        </p>
      </div>

      {/* FAQ */}
      <section className="mt-12 grid gap-6 sm:grid-cols-2">
        <Faq q="Is it really free?">
          Yes. Listing is free, and a verified ranked spot is free — you only need to connect
          Google Search Console (read-only) so we can measure your real clicks. No subscription,
          no card.
        </Faq>
        <Faq q="Can I pay to rank higher?">
          No. The ranking is decided entirely by verified organic momentum. Money buys a clearly
          labeled sponsored slot, never a position on the board.
        </Faq>
        <Faq q="What does a listing cost?">
          Nothing — it&apos;s a reciprocal link. You add the {siteConfig.name} badge to your site,
          and in exchange you get a permanent, owner-verified listing.
        </Faq>
        <Faq q="How do sponsorships work?">
          A sponsored placement is a fixed, labeled slot in the leaderboard. It&apos;s excluded
          from scoring, so it never changes where any site ranks. Email{" "}
          <a href={`mailto:${CONTACT}`} className="text-primary hover:underline">{CONTACT}</a> to ask.
        </Faq>
      </section>
    </div>
  );
}

function Tier({
  icon,
  name,
  price,
  cadence,
  blurb,
  features,
  cta,
  highlighted = false,
}: {
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
      className={
        "flex flex-col rounded-2xl border bg-card p-6 " +
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
