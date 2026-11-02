import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ClaimEdit } from "@/components/claim-edit";
import { getListingByHost, getListingClaimInfo, normalizeHost } from "@/lib/listed";
import { getOptionalUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Claim & edit listing",
  robots: { index: false, follow: false },
};

type Params = Promise<{ host: string }>;

export default async function ClaimEditPage({ params }: { params: Params }) {
  const { host: raw } = await params;
  const host = normalizeHost(raw) ?? raw.toLowerCase();
  const listing = await getListingByHost(host);
  if (!listing) notFound();

  const user = await getOptionalUser();
  if (!user) redirect(`/login?next=/listed/${host}/edit`);

  const claim = await getListingClaimInfo(host);
  const isOwner = claim?.claimedBy === user.id;

  return (
    <div className="container max-w-2xl py-12">
      <Breadcrumbs
        items={[
          { name: "Home", href: "/" },
          { name: "Directory", href: "/listed" },
          { name: listing.displayName, href: `/listed/${host}` },
          { name: isOwner ? "Edit" : "Claim" },
        ]}
      />
      <h1 className="mt-6 text-2xl font-bold tracking-tight">
        {isOwner ? "Edit your listing" : "Claim this listing"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">{host}</p>

      <div className="mt-6">
        <ClaimEdit listing={listing} isOwner={isOwner} />
      </div>
    </div>
  );
}
