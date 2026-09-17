export type ResourceKind = "knowledge" | "agent"

export type Resource = {
  id: string
  kind: ResourceKind
  name: string
  description: string
  activateWhen: string
  avoidWhen: string
}

export type RouteScore = {
  id: string
  probability: number
}

export type RouteResponse = {
  model: string
  scores: RouteScore[]
}
