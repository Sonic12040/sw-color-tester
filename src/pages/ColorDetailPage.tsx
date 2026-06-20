import { useParams } from "react-router";
import { useAppContext } from "../context/AppContext.js";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { ColorDetail } from "../components/ColorDetailView/ColorDetail.js";
import { JsonLd } from "../components/seo/JsonLd.js";
import { NotFoundPage } from "./NotFoundPage.js";
import { buildColorJsonLd, colorDescription } from "../utils/seo.js";

export function ColorDetailPage() {
  const { slug } = useParams();
  const { colorModel } = useAppContext();
  const color = slug ? colorModel.getColorBySlug(slug) : undefined;

  useDocumentMeta(
    color
      ? `${color.name} — SW ${color.colorNumber} | Sherwin-Williams Color Atlas`
      : "Not found | Sherwin-Williams Color Atlas",
    color ? colorDescription(color) : undefined,
  );

  if (!color) return <NotFoundPage />;

  return (
    <>
      <JsonLd data={buildColorJsonLd(color)} />
      <ColorDetail color={color} />
    </>
  );
}
