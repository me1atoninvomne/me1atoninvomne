import { legalRoute } from "@/components/legal/legal-route";
import { IMPRINT_VERSION, imprintDoc } from "@/legal/content/imprint";

const route = legalRoute(imprintDoc, IMPRINT_VERSION);
export const generateMetadata = route.generateMetadata;
export default route.Page;
