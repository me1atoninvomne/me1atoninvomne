import { legalRoute } from "@/components/legal/legal-route";
import { ACCESSIBILITY_VERSION, accessibilityDoc } from "@/legal/content/accessibility";

const route = legalRoute(accessibilityDoc, ACCESSIBILITY_VERSION);
export const generateMetadata = route.generateMetadata;
export default route.Page;
