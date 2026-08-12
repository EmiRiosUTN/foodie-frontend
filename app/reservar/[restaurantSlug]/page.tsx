import { PublicBookingPage } from "../../../components/public-booking-page";

export default async function PublicBookingRoute({ params }: { params: Promise<{ restaurantSlug: string }> }) {
  const { restaurantSlug } = await params;
  return <PublicBookingPage restaurantSlug={restaurantSlug} />;
}
