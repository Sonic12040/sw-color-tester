import type { ReactNode, SVGProps } from "react";

/**
 * Single source of truth for the line icons shared between the header nav and
 * the color-tile action bar (and anywhere else that needs them). Keeping the
 * path data here prevents the two from drifting — e.g. the Compare "scales"
 * glyph is defined once and rendered in both places.
 *
 * All icons are decorative by default (`aria-hidden`); callers label the
 * surrounding control. `filled`/`hidden` toggle the active (pressed) variant so
 * a toolbar button can show state without a second icon import.
 */
export interface IconProps extends SVGProps<SVGSVGElement> {
  /** Rendered width/height in px (icons are square on a 24×24 viewBox). */
  size?: number;
}

function IconBase({
  size = 24,
  children,
  ...rest
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Gallery grid (header "Browse"). No color-tile counterpart. */
export function BrowseIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </IconBase>
  );
}

/** Balance scales — "Compare". Pans fill when active. */
export function CompareIcon({
  filled = false,
  ...props
}: IconProps & { filled?: boolean }) {
  const pan = filled ? "currentColor" : "none";
  return (
    <IconBase {...props}>
      <path fill={pan} d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path fill={pan} d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </IconBase>
  );
}

/** Painter's palette — "Palette". Solid silhouette when active. */
export function PaletteIcon({
  filled = false,
  ...props
}: IconProps & { filled?: boolean }) {
  if (filled) {
    return (
      <IconBase stroke="none" {...props}>
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1-.3-.3-.4-.6-.4-1.1 0-.9.7-1.6 1.6-1.6H16c3 0 5.5-2.5 5.5-5.5C21.5 6 17.5 2 12 2zM6.5 13a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm2-5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5-1a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm4 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"
        />
      </IconBase>
    );
  }
  return (
    <IconBase {...props}>
      <circle cx="13.5" cy="6.5" r=".75" fill="currentColor" stroke="none" />
      <circle cx="17" cy="12" r=".75" fill="currentColor" stroke="none" />
      <circle cx="6.5" cy="12" r=".75" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="7.5" r=".75" fill="currentColor" stroke="none" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1-.3-.3-.4-.6-.4-1.1 0-.9.7-1.6 1.6-1.6H16c3 0 5.5-2.5 5.5-5.5C21.5 6 17.5 2 12 2z" />
    </IconBase>
  );
}

/** Heart — "Favorite". Solid when active. */
export function HeartIcon({
  filled = false,
  ...props
}: IconProps & { filled?: boolean }) {
  return (
    <IconBase fill={filled ? "currentColor" : "none"} {...props}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </IconBase>
  );
}

/**
 * Eye — "Hide". When `hidden`, shows a filled eye with a slash; the slash and
 * pupil are punched out in `--bar-bg`, so render this on a surface that defines
 * that variable (the tile action bar does).
 */
export function EyeIcon({
  hidden = false,
  ...props
}: IconProps & { hidden?: boolean }) {
  if (hidden) {
    return (
      <IconBase {...props}>
        <path
          fill="currentColor"
          stroke="none"
          d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
        />
        <circle cx="12" cy="12" r="3" fill="var(--bar-bg)" stroke="none" />
        <path stroke="var(--bar-bg)" strokeWidth="3" d="M3 3l18 18" />
      </IconBase>
    );
  }
  return (
    <IconBase {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </IconBase>
  );
}
