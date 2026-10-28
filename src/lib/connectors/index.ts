import { ashby, greenhouse, lever } from "./ats";
import { devpost, hackclub, unstop } from "./hackathons";
import { simplify } from "./simplify";
import type { Connector } from "./types";

// Seed companies: AI labs, quant firms and high-growth tech with public ATS boards.
// Each was verified to return listings on 2026-10-27.
const GREENHOUSE: Array<[string, string]> = [
  ["anthropic", "Anthropic"],
  ["stripe", "Stripe"],
  ["databricks", "Databricks"],
  ["figma", "Figma"],
  ["wehrtyou", "Hudson River Trading"],
  ["imc", "IMC Trading"],
  ["jumptrading", "Jump Trading"],
  ["scaleai", "Scale AI"],
  ["discord", "Discord"],
];
const LEVER: Array<[string, string]> = [["palantir", "Palantir"]];
const ASHBY: Array<[string, string]> = [
  ["openai", "OpenAI"],
  ["ramp", "Ramp"],
  ["linear", "Linear"],
  ["cursor", "Cursor"],
];

export function allConnectors(): Connector[] {
  return [
    devpost,
    hackclub,
    unstop("hackathons"),
    unstop("internships"),
    unstop("scholarships"),
    unstop("competitions"),
    simplify("internships"),
    simplify("newgrad"),
    ...GREENHOUSE.map(([t, n]) => greenhouse(t, n)),
    ...LEVER.map(([s, n]) => lever(s, n)),
    ...ASHBY.map(([s, n]) => ashby(s, n)),
  ];
}

export type { Connector, RawOpportunity } from "./types";
