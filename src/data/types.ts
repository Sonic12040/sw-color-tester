export interface Color {
  id: string;
  name: string;
  colorNumber: string;
  brandKey: string;
  hex: string;
  red: number;
  green: number;
  blue: number;
  hue: number;
  saturation: number;
  lightness: number;
  lrv: number;
  isDark: boolean;
  isInterior: boolean;
  isExterior: boolean;
  colorFamilyNames: string[];
  brandedCollectionNames: string[];
  similarColors: string[];
  description: string[];
  storeStripLocator?: string;
  coordinatingColors?: {
    coord1ColorId?: string;
    coord2ColorId?: string;
    whiteColorId?: string;
  };
  archived?: boolean;
  ignore?: boolean;
  lab?: { L: number; A: number; B: number };
}
