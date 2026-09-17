import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { ArrowRight, Bot, Database, Route } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { kindLabel } from "@/lib/resource-helpers"
import type { Resource, RouteResponse } from "@/lib/router-types"

function Orbit({ active = false }: { active?: boolean }) {
  return (
    <div className={`route-orbit${active ? " route-orbit-active" : ""}`} aria-hidden="true">
      <span className="orbit-center"><Route /></span>
      <span className="orbit-node node-one" />
      <span className="orbit-node node-two" />
      <span className="orbit-node node-three" />
    </div>
  )
}

export function RoutePanel({ result, resources, threshold, onThresholdChange, loading }: {
  result: RouteResponse | null
  resources: Resource[]
  threshold: number
  onThresholdChange: (threshold: number) => void
  loading: boolean
}) {
  const reducedMotion = useReducedMotion()
  const scoreMap = new Map(result?.scores.map((item) => [item.id, item.probability]) ?? [])
  const ranked = resources
    .filter((resource) => scoreMap.has(resource.id))
    .sort((a, b) => (scoreMap.get(b.id) ?? 0) - (scoreMap.get(a.id) ?? 0))
  const selected = ranked.filter((resource) => (scoreMap.get(resource.id) ?? 0) >= threshold)
  const skipped = ranked.filter((resource) => (scoreMap.get(resource.id) ?? 0) < threshold)

  return (
    <Card className="route-panel">
      <CardHeader>
        <div className="panel-eyebrow"><span className="live-dot" /> ROUTE RESULTS</div>
        <CardTitle>{result ? "Suggested resources" : "See what fits the task"}</CardTitle>
        <CardDescription>{result ? "Jev scored every resource against this task." : "Run a task to see a score for each resource."}</CardDescription>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loading" className="routing-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Orbit active />
              <p className="routing-state-title">Checking the resources</p>
              <p className="routing-state-copy">Jev is comparing the task with each resource's rules.</p>
            </motion.div>
          ) : result ? (
            <motion.div key="result" className="result-content" initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.4 }}>
              <div className="result-summary"><div><span className="summary-number">{selected.length}</span><span className="summary-label">activated</span></div><span className="model-label">{result.model}</span></div>
              <div className="threshold-control">
                <div className="threshold-label"><label htmlFor="route-threshold">Minimum fit</label><span>{Math.round(threshold * 100)}%</span></div>
                <Slider id="route-threshold" aria-label="Minimum fit percentage" value={[Math.round(threshold * 100)]} min={20} max={90} step={5} onValueChange={(value) => onThresholdChange((Array.isArray(value) ? value[0] : value) / 100)} />
                <p>Move the cutoff to include more possibilities. Jev scores stay the same.</p>
              </div>
              {selected.length ? (
                <div className="selected-list">
                  {selected.map((resource, index) => {
                    const probability = scoreMap.get(resource.id) ?? 0
                    const Icon = resource.kind === "knowledge" ? Database : Bot
                    return (
                      <motion.div key={resource.id} className="selected-row" initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: reducedMotion ? 0 : index * 0.07, type: "spring", bounce: 0, duration: 0.35 }}>
                        <div className="selected-row-top"><span className="selected-icon"><Icon /></span><div><strong>{resource.name}</strong><span>{kindLabel(resource.kind)}</span></div><b>{Math.round(probability * 100)}%</b></div>
                        <Progress value={Math.round(probability * 100)} aria-label={`${resource.name} relevance`} />
                      </motion.div>
                    )
                  })}
                </div>
              ) : <p className="no-match">No resource meets this cutoff. Lower it to inspect weaker matches.</p>}
              {skipped.length ? <details className="skipped-list"><summary>{skipped.length} below cutoff <ArrowRight aria-hidden="true" /></summary><div>{skipped.map((resource) => <p key={resource.id}><span>{resource.name}</span><span>{Math.round((scoreMap.get(resource.id) ?? 0) * 100)}%</span></p>)}</div></details> : null}
              <p className="result-footnote">Scores show Jev&apos;s estimate that each resource should be activated. Review the resource rules before acting.</p>
            </motion.div>
          ) : (
            <motion.div key="empty" className="routing-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Orbit />
              <p className="routing-state-title">No route yet</p>
              <p className="routing-state-copy">Enter a task and select Route task to get scores.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
