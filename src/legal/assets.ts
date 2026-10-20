/**
 * Manifest of every visual asset shipped with the application and its licence.
 * tests/unit/licenses.test.ts fails if a file in public/ (or the app icon) is missing here,
 * so no image can be added without documenting where it comes from and under which licence.
 *
 * There are no stock photos, no photos of people and no customer or partner logos.
 */
import type { LocalizedText } from "@/domain/types";

export interface AssetEntry {
  /** Repository path of the file or component. */
  source: string;
  kind: LocalizedText;
  author: LocalizedText;
  licence: LocalizedText;
}

const OWN_WORK: LocalizedText = { de: "Eigene Erstellung im Projekt", en: "Created within this project" };
const OWN_LICENCE: LocalizedText = { de: "Rechte beim Betreiber (Eigenwerk)", en: "Owned by the operator (original work)" };

export const ASSETS: AssetEntry[] = [
  {
    source: "src/app/icon.svg",
    kind: { de: "Favicon (SVG, aus Code-Primitiven)", en: "Favicon (SVG, built from code primitives)" },
    author: OWN_WORK,
    licence: OWN_LICENCE,
  },
  {
    source: "src/components/app/logo.tsx",
    kind: { de: "Logo und Wortmarke „FlowPilot AI“ (Inline-SVG)", en: "Logo and “FlowPilot AI” wordmark (inline SVG)" },
    author: OWN_WORK,
    licence: OWN_LICENCE,
  },
  {
    source: "src/components/marketing/hero-visual.tsx",
    kind: { de: "Produktillustration der Startseite (HTML/CSS mit synthetischen Daten)", en: "Product illustration on the home page (HTML/CSS with synthetic data)" },
    author: OWN_WORK,
    licence: OWN_LICENCE,
  },
  {
    source: "src/components/app/charts.tsx",
    kind: { de: "Diagramme (SVG, zur Laufzeit aus Daten erzeugt)", en: "Charts (SVG, generated from data at runtime)" },
    author: OWN_WORK,
    licence: OWN_LICENCE,
  },
  {
    source: "src/server/documents/pdf-render.ts",
    kind: { de: "Synthetische Demo-PDFs (zur Laufzeit mit pdf-lib erzeugt)", en: "Synthetic demo PDFs (generated at runtime with pdf-lib)" },
    author: OWN_WORK,
    licence: OWN_LICENCE,
  },
  {
    source: "lucide-react",
    kind: { de: "Symbole (Icons)", en: "Icons" },
    author: { de: "Lucide Contributors", en: "Lucide contributors" },
    licence: { de: "ISC-Lizenz", en: "ISC licence" },
  },
  {
    source: "@fontsource-variable/inter",
    kind: { de: "Schriftart Inter (lokal ausgeliefert)", en: "Inter typeface (served locally)" },
    author: { de: "The Inter Project Authors", en: "The Inter Project Authors" },
    licence: { de: "SIL Open Font License 1.1", en: "SIL Open Font License 1.1" },
  },
];

/** Files in public/ that are not images and therefore need no entry (documentation only). */
export const NON_ASSET_PUBLIC_FILES = ["robots.txt", "licenses/"];
