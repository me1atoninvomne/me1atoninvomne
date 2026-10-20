import { legalRoute } from "@/components/legal/legal-route";
import { refundDoc } from "@/legal/content/refund";
import { LEGAL_VERSIONS } from "@/legal/versions";

const route = legalRoute(refundDoc, LEGAL_VERSIONS.refund);
export const generateMetadata = route.generateMetadata;
export default route.Page;
