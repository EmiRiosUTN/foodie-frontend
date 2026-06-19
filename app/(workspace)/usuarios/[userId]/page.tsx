import { RestaurantUserDetailPage } from "../../../../components/restaurant-user-detail-page";

export default async function Page({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  return <RestaurantUserDetailPage userId={userId} />;
}
