import { createMockAdapter } from "./mock.mjs";
import { createCdpAdapter } from "./cdp.mjs";
import { createOsAdapter } from "./os.mjs";

const mock = createMockAdapter();
const cdp = createCdpAdapter();
const os = createOsAdapter();

export function adapterFor(agent) {
  switch (agent.adapter) {
    case "cdp":
    case "browser":
      return cdp;
    case "os":
    case "window":
      return os;
    case "mock":
    case "demo":
    default:
      return mock;
  }
}

export { mock, cdp, os };
