import type { ResourceKind } from "./router-types"

export function kindLabel(kind: ResourceKind) {
  return kind === "knowledge" ? "Knowledge base" : "Agent"
}
