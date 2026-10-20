import { legalRoute } from "@/components/legal/legal-route";
import { termsDoc } from "@/legal/content/terms";
import { LEGAL_VERSIONS } from "@/legal/versions";

const route = legalRoute(termsDoc, LEGAL_VERSIONS.terms);
export const generateMetadata = route.generateMetadata;
export default route.Page;
