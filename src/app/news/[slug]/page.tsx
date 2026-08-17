import { permanentRedirect } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export default async function NewsEnArticle({ params }: Props) {
  const { slug } = await params;
  permanentRedirect(`/nieuws/${slug}`);
}
