import { useMemo } from "react";
import { useAppContext } from "../context/AppContext.js";
import { useFavorites } from "../context/FavoritesContext.js";
import { useHidden } from "../context/HiddenContext.js";
import { useFilters } from "../context/FiltersContext.js";
import { useDocumentMeta } from "../hooks/useDocumentMeta.js";
import { AtlasLayout } from "../components/Atlas/AtlasLayout.js";
import { JsonLd } from "../components/seo/JsonLd.js";
import { buildGalleryJsonLd } from "../utils/seo.js";

export function GalleryPage() {
  const { colorModel } = useAppContext();
  const { favorites } = useFavorites();
  const { hidden } = useHidden();
  const { criteria } = useFilters();

  const total = colorModel.getActiveColors().length;
  const colors = useMemo(
    () => colorModel.getFilteredColors(criteria, favorites, hidden),
    [colorModel, criteria, favorites, hidden],
  );

  useDocumentMeta(
    `Sherwin-Williams Color Atlas — browse ${total} paint colors`,
    `Search, filter, and compare ${total} Sherwin-Williams paint colors by color family, undertone, lightness (LRV), and collection.`,
  );

  return (
    <>
      <h1 className="sr-only">
        Sherwin-Williams Color Atlas — browse {total} paint colors
      </h1>
      <JsonLd data={buildGalleryJsonLd(total)} />
      <AtlasLayout colors={colors} totalCount={total} />
    </>
  );
}
