import { Link, NavLink, useNavigate } from "react-router";
import { useFavorites } from "../../context/FavoritesContext.js";
import { usePalette } from "../../context/PaletteContext.js";
import { useCompare } from "../../context/CompareContext.js";
import { useFilters } from "../../context/FiltersContext.js";
import {
  BrowseIcon,
  CompareIcon,
  PaletteIcon,
  HeartIcon,
} from "../icons/Icons.js";
import styles from "./Header.module.css";

const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink;

// Nav icons reuse the color-tile glyphs (one source of truth in icons/Icons),
// so Compare's scales and the palette read the same in both places. They label
// the link text, so they stay decorative (the components are aria-hidden).
const NAV_ICON = 16;

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
            <BrowseIcon size={NAV_ICON} className={styles.navIcon} />
            <span>Browse</span>
          </NavLink>
          <NavLink to="/compare" className={navClass}>
            <CompareIcon size={NAV_ICON} className={styles.navIcon} />
            <span>
              Compare{compare.length > 0 ? ` (${compare.length})` : ""}
            </span>
          </NavLink>
          <NavLink to="/palette" className={navClass}>
            <PaletteIcon size={NAV_ICON} className={styles.navIcon} />
            <span>
              Palette{palette.length > 0 ? ` (${palette.length})` : ""}
            </span>
          </NavLink>
          <button
            type="button"
            className={styles.favBtn}
            onClick={showFavorites}
            aria-label={`Show ${favorites.size} favorite colors`}
          >
            <HeartIcon size={NAV_ICON} filled className={styles.navIcon} />
            {favorites.size}
          </button>
        </nav>
      </div>
    </header>
  );
}
