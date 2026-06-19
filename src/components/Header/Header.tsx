import { Link, NavLink } from "react-router";
import { useFavorites } from "../../context/FavoritesContext.js";
import { usePalette } from "../../context/PaletteContext.js";
import { useCompare } from "../../context/CompareContext.js";
import styles from "./Header.module.css";

const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;

/** Global top bar: brand + primary navigation. Facets/search live in the Atlas toolbar. */
export function Header() {
  const { favorites } = useFavorites();
  const { palette } = usePalette();
  const { compare } = useCompare();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true" />
          <span className={styles.brandText}>
            Sherwin-Williams <strong>Color Atlas</strong>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Primary">
          <NavLink to="/" end className={navClass}>
            Browse
          </NavLink>
          <NavLink to="/compare" className={navClass}>
            Compare{compare.length > 0 ? ` (${compare.length})` : ""}
          </NavLink>
          <NavLink to="/palette" className={navClass}>
            Palette{palette.length > 0 ? ` (${palette.length})` : ""}
          </NavLink>
          <span
            className={styles.favCount}
            aria-label={`${favorites.size} favorites`}
          >
            ♥ {favorites.size}
          </span>
        </nav>
      </div>
    </header>
  );
}
