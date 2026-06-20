import { Link, NavLink, useNavigate } from "react-router";
import { useFavorites } from "../../context/FavoritesContext.js";
import { usePalette } from "../../context/PaletteContext.js";
import { useCompare } from "../../context/CompareContext.js";
import { useFilters } from "../../context/FiltersContext.js";
import styles from "./Header.module.css";

const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;

/** Global sticky top bar: brand + primary navigation. */
export function Header() {
  const { favorites } = useFavorites();
  const { palette } = usePalette();
  const { compare } = useCompare();
  const { setView } = useFilters();
  const navigate = useNavigate();

  // The favorites count is a control: jump to the gallery's Favorites view.
  const showFavorites = () => {
    setView("favorites");
    navigate("/");
  };

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
          <button
            type="button"
            className={styles.favBtn}
            onClick={showFavorites}
            aria-label={`Show ${favorites.size} favorite colors`}
          >
            <span aria-hidden="true">♥</span> {favorites.size}
          </button>
        </nav>
      </div>
    </header>
  );
}
