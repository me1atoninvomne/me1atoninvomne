import { legalRoute } from "@/components/legal/legal-route";
import { privacyDoc } from "@/legal/content/privacy";
import { LEGAL_VERSIONS } from "@/legal/versions";

const route = legalRoute(privacyDoc, LEGAL_VERSIONS.privacy);
export const generateMetadata = route.generateMetadata;
export default route.Page;
