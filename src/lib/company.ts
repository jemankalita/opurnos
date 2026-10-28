import { env } from "./env";

// Details shown on the legal and contact pages. Razorpay and Indian consumer rules expect them.
export const company = {
  name: env.COMPANY_NAME,
  email: env.SUPPORT_EMAIL,
  address: env.COMPANY_ADDRESS ?? null,
  grievanceOfficer: env.GRIEVANCE_OFFICER ?? null,
  site: env.APP_URL,
};

export const POLICY_UPDATED = "29 October 2026";
