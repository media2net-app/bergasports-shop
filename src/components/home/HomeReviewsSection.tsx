import GoogleReviewsView from "@/components/site/GoogleReviewsView";
import { getGoogleReviewsPublic } from "@/lib/google-reviews";

export default async function HomeReviewsSection() {
  const data = await getGoogleReviewsPublic();
  return <GoogleReviewsView data={data} variant="home" />;
}
