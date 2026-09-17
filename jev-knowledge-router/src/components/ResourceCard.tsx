import { BookOpenText, Bot, Pencil, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { kindLabel } from "@/lib/resource-helpers"
import type { Resource } from "@/lib/router-types"

export function ResourceCard({ resource, score, threshold, onEdit, onRemove }: {
  resource: Resource
  score?: number
  threshold: number
  onEdit: () => void
  onRemove: () => void
}) {
  const Icon = resource.kind === "knowledge" ? BookOpenText : Bot
  const selected = score !== undefined && score >= threshold
  return (
    <Card className="resource-card" data-kind={resource.kind} data-selected={selected || undefined}>
      <CardHeader>
        <div className="resource-heading">
          <span className="resource-icon"><Icon aria-hidden="true" /></span>
          <Badge variant="secondary" className="kind-badge">{kindLabel(resource.kind)}</Badge>
        </div>
        <CardAction>{score !== undefined ? <span className="fit-label" aria-label={`${Math.round(score * 100)} percent relevance`}>{Math.round(score * 100)}% fit</span> : null}</CardAction>
        <CardTitle>{resource.name}</CardTitle>
        <CardDescription>{resource.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="resource-rules">
          <div className="rule-row"><span className="rule-dot rule-dot-on" /> <div><strong>Activate when</strong><p>{resource.activateWhen}</p></div></div>
          <div className="rule-row"><span className="rule-dot rule-dot-off" /> <div><strong>Skip when</strong><p>{resource.avoidWhen}</p></div></div>
        </div>
      </CardContent>
      <CardFooter className="resource-footer">
        <Button variant="ghost" size="sm" onClick={onEdit} aria-label={`Edit ${resource.name}`}><Pencil data-icon="inline-start" /> Edit</Button>
        <Button variant="ghost" size="icon-sm" onClick={onRemove} aria-label={`Remove ${resource.name}`} title={`Remove ${resource.name}`}><Trash2 /></Button>
      </CardFooter>
    </Card>
  )
}
