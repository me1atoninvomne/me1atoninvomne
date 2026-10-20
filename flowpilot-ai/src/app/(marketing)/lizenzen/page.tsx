import { legalRoute } from "@/components/legal/legal-route";
import { LICENSES_VERSION, licensesDoc } from "@/legal/content/licenses";

const route = legalRoute(licensesDoc, LICENSES_VERSION);
export const generateMetadata = route.generateMetadata;
export default route.Page;
