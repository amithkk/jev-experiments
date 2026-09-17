import { useEffect, useRef, useState, type FormEvent } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { ArrowRight, ArrowUpRight, Bot, Check, CircleDot, Command, Database, Layers3, LoaderCircle, Plus, Route, Sparkles, X } from "lucide-react"

import { ResourceCard } from "@/components/ResourceCard"
import { ResourceEditor, type Draft, type Editor } from "@/components/ResourceEditor"
import { RoutePanel } from "@/components/RoutePanel"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { defaultResources, emptyDraft, exampleTask, exampleTasks } from "@/lib/defaults"
import { kindLabel } from "@/lib/resource-helpers"
import type { Resource, ResourceKind, RouteResponse } from "@/lib/router-types"

const storageKey = "jev-knowledge-router:resources:v2"
const legacyStorageKey = "jev-knowledge-router:resources:v1"
const maxResources = 24
const legacyDescriptions: Record<string, string> = {
  "kb-product": "Feature specifications, product behavior, release notes, and roadmap decisions.",
  "kb-incidents": "Outage playbooks, system maps, on-call procedures, and past incident reports.",
  "kb-voice": "Support themes, interviews, feedback, and customer communication guidance.",
  "agent-code": "Traces behavior through source code, tests hypotheses, and proposes a focused fix.",
  "agent-research": "Finds and compares evidence across documents, notes, and external sources.",
  "agent-support": "Drafts clear customer updates, support replies, and help-center language.",
}

function readResources(key: string): Resource[] | null {
  try {
    const value = localStorage.getItem(key)
    if (!value) return null
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed) || parsed.length > maxResources) return null
    if (!parsed.every((item) => item && typeof item === "object" &&
      typeof item.id === "string" &&
      (item.kind === "knowledge" || item.kind === "agent") &&
      ["name", "description", "activateWhen", "avoidWhen"].every((field) => typeof item[field] === "string"))) return null
    return parsed as Resource[]
  } catch {
    return null
  }
}

function loadResources(): Resource[] {
  const saved = readResources(storageKey)
  if (saved) return saved
  const old = readResources(legacyStorageKey)
  if (!old) return defaultResources
  // Keep edits and removals from the first demo while adding the new examples once.
  const updated = old.map((item) => {
    const replacement = defaultResources.find((resource) => resource.id === (item.id === "kb-voice" ? "kb-customers" : item.id))
    return replacement && legacyDescriptions[item.id] === item.description ? replacement : item
  })
  const present = new Set(updated.map((item) => item.id))
  return [...updated, ...defaultResources.filter((item) => !(item.id in legacyDescriptions) && !present.has(item.id))].slice(0, maxResources)
}

export function App() {
  const reducedMotion = useReducedMotion()
  const [resources, setResources] = useState<Resource[]>(loadResources)
  const [task, setTask] = useState(exampleTask)
  const [threshold, setThreshold] = useState(0.6)
  const [result, setResult] = useState<RouteResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [removed, setRemoved] = useState<{ resource: Resource; index: number } | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(resources)) } catch { /* storage may be disabled */ }
  }, [resources])
  useEffect(() => {
    if (!removed) return
    const timer = window.setTimeout(() => setRemoved(null), 6500)
    return () => window.clearTimeout(timer)
  }, [removed])
  useEffect(() => () => controllerRef.current?.abort(), [])

  const knowledge = resources.filter((resource) => resource.kind === "knowledge")
  const agents = resources.filter((resource) => resource.kind === "agent")
  const scoreMap = new Map(result?.scores.map((item) => [item.id, item.probability]) ?? [])

  function invalidateRoute() {
    controllerRef.current?.abort()
    controllerRef.current = null
    setLoading(false)
    setResult(null)
    setError(null)
  }
  function updateTask(value: string) { setTask(value); invalidateRoute() }
  function openCreate(kind: ResourceKind) {
    if (resources.length >= maxResources) { setError(`This demo supports up to ${maxResources} resources.`); return }
    setDraft(emptyDraft)
    setEditor({ kind })
  }
  function openEdit(resource: Resource) {
    setDraft({ name: resource.name, description: resource.description, activateWhen: resource.activateWhen, avoidWhen: resource.avoidWhen })
    setEditor({ kind: resource.kind, id: resource.id })
  }
  function saveResource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editor) return
    const clean = Object.fromEntries(Object.entries(draft).map(([key, value]) => [key, value.trim()])) as Draft
    if (Object.values(clean).some((value) => !value)) return
    const id = editor.id ?? crypto.randomUUID()
    const resource: Resource = { id, kind: editor.kind, ...clean }
    setResources((current) => editor.id ? current.map((item) => item.id === id ? resource : item) : [...current, resource])
    setEditor(null)
    setRemoved(null)
    invalidateRoute()
  }
  function removeResource(resource: Resource) {
    const index = resources.findIndex((item) => item.id === resource.id)
    setResources((current) => current.filter((item) => item.id !== resource.id))
    setRemoved({ resource, index })
    invalidateRoute()
  }
  function undoRemove() {
    if (!removed) return
    const { resource, index } = removed
    setResources((current) => {
      if (current.some((item) => item.id === resource.id)) return current
      const copy = [...current]
      copy.splice(index, 0, resource)
      return copy
    })
    setRemoved(null)
    invalidateRoute()
  }
  async function route(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    if (!task.trim() || resources.length === 0 || loading) return
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const response = await fetch("/api/route", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, resources }), signal: controller.signal,
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Routing failed. Please try again.")
      if (controllerRef.current === controller) setResult(data as RouteResponse)
    } catch (cause) {
      if (controller.signal.aborted) return
      setError(cause instanceof Error ? cause.message : "Routing failed. Please try again.")
    } finally {
      if (controllerRef.current === controller) { controllerRef.current = null; setLoading(false) }
    }
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#top">Skip to content</a>
      <aside className="sidebar">
        <a className="brand" href="#top" aria-label="Amith's Jev Routing Lab home"><span className="brand-mark"><Layers3 /></span><span><strong>jev<span className="brand-dot">.</span></strong><small>AMITH'S ROUTING LAB</small></span></a>
        <div className="sidebar-group"><span className="sidebar-caption">WORKSPACE</span><nav aria-label="Primary navigation"><a className="side-link side-link-active" href="#top"><Route /> <span>Overview</span><span className="side-link-indicator" /></a><a className="side-link" href="#knowledge"><Database /> <span>Knowledge bases</span><small>{knowledge.length}</small></a><a className="side-link" href="#agents"><Bot /> <span>Agents</span><small>{agents.length}</small></a></nav></div>
        <div className="sidebar-bottom"><div className="sidebar-model"><span className="model-glyph"><Sparkles /></span><div><strong>System One</strong><small>Jev model</small></div><CircleDot className="model-status" /></div><p>Scores are estimates. Check the resource rules before you use a route.</p></div>
      </aside>
      <main className="main-content" id="top">
        <div className="topbar"><div className="breadcrumbs">Workspace <span>/</span> <strong>Amith&apos;s Jev Routing Lab</strong></div><div className="topbar-right"><span className="topbar-badge"><span /> LIVE DEMO</span><span className="topbar-avatar" aria-hidden="true">A</span></div></div>
        <div className="page-content">
          <motion.header className="hero" initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", bounce: 0, duration: 0.55 }}>
            <div className="eyebrow"><span className="eyebrow-line" /> KNOWLEDGE &amp; AGENT ROUTER</div>
            <h1>Amith&apos;s <em>Jev Routing Lab</em></h1>
            <p>Enter a task. Jev scores the knowledge bases and agents below using their descriptions and routing rules.</p>
          </motion.header>
          <div className="workspace-grid">
            <motion.div initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, type: "spring", bounce: 0, duration: 0.5 }}>
              <Card className="composer-card">
                <CardHeader><div className="composer-title-row"><span className="composer-icon"><Command /></span><span className="composer-kicker">THE TASK</span></div><CardTitle>What needs to get done?</CardTitle><CardDescription>Include enough detail to tell similar resources apart.</CardDescription></CardHeader>
                <CardContent><form onSubmit={route}><FieldGroup><Field><FieldLabel htmlFor="task-input" className="sr-only">Task to route</FieldLabel><Textarea id="task-input" name="task" autoComplete="off" className="task-input" value={task} maxLength={4000} onChange={(event) => updateTask(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") { event.preventDefault(); void route() } }} placeholder="e.g. Investigate a production issue and draft an update…" rows={5} /></Field></FieldGroup><div className="composer-actions"><span className="composer-hint"><kbd>⌘</kbd> + <kbd>↵</kbd> to route</span><Button type="submit" className="route-button" size="lg" disabled={!task.trim() || resources.length === 0 || loading}>{loading ? <LoaderCircle className="spin-icon" data-icon="inline-start" /> : <Sparkles data-icon="inline-start" />}{loading ? "Routing…" : "Route task"}<ArrowRight data-icon="inline-end" /></Button></div></form><div className="example-tasks"><span>TRY AN EXAMPLE</span><div>{exampleTasks.map((example, index) => <Button key={example} variant="outline" size="sm" onClick={() => updateTask(example)}>{index === 0 ? "Incident response" : index === 1 ? "Customer insights" : "API migration"}<ArrowUpRight data-icon="inline-end" /></Button>)}</div></div></CardContent>
              </Card>
              {error ? <Alert variant="destructive" className="error-alert" role="alert"><X /><AlertTitle>Could not route this task</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
            </motion.div>
            <motion.div initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14, type: "spring", bounce: 0, duration: 0.5 }}><RoutePanel result={result} resources={resources} threshold={threshold} onThresholdChange={setThreshold} loading={loading} /></motion.div>
          </div>
          <div className="library-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> ROUTING LIBRARY</div><h2>Resources and their rules</h2><p>Edit a resource to say when it helps and when to leave it out.</p></div><Badge variant="outline" className="library-count">{resources.length} RESOURCES</Badge></div>
          <div className="catalog-grid">
            {(["knowledge", "agent"] as const).map((kind) => {
              const collection = kind === "knowledge" ? knowledge : agents
              const Icon = kind === "knowledge" ? Database : Bot
              return <section key={kind} id={kind === "knowledge" ? "knowledge" : "agents"} className="catalog-section"><div className="section-heading"><span className="section-heading-icon"><Icon /></span><div><h3>{kind === "knowledge" ? "Knowledge bases" : "Agents"}</h3><p>{kind === "knowledge" ? "Reference material for a task" : "Workers that can take on a task"}</p></div><Button variant="outline" size="icon" onClick={() => openCreate(kind)} aria-label={`Add ${kindLabel(kind).toLowerCase()}`} title={`Add ${kindLabel(kind).toLowerCase()}`} disabled={resources.length >= maxResources}><Plus /></Button></div><div className="resource-list">{collection.length ? collection.map((resource, index) => <motion.div key={resource.id} layout initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: reducedMotion ? 0 : index * 0.04, type: "spring", bounce: 0, duration: 0.35 }}><ResourceCard resource={resource} score={scoreMap.get(resource.id)} threshold={threshold} onEdit={() => openEdit(resource)} onRemove={() => removeResource(resource)} /></motion.div>) : <div className="empty-collection"><Icon /><strong>No {kind === "knowledge" ? "knowledge bases" : "agents"} yet</strong><p>Add one to make it available for routing.</p></div>}<Button variant="outline" className="add-resource" onClick={() => openCreate(kind)} disabled={resources.length >= maxResources}><Plus data-icon="inline-start" /> Add {kind === "knowledge" ? "knowledge base" : "agent"}</Button></div></section>
            })}
          </div>
          <footer className="page-footer"><span><Layers3 /> AMITH&apos;S JEV ROUTING LAB</span><span>Jev scores the route. You decide what to use.</span></footer>
        </div>
      </main>
      <ResourceEditor editor={editor} draft={draft} onDraftChange={setDraft} onClose={() => setEditor(null)} onSave={saveResource} />
      <AnimatePresence>{removed ? <motion.div className="undo-toast" initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} role="status"><Check /><span>Removed {removed.resource.name}</span><Button variant="ghost" size="sm" onClick={undoRemove}>Undo</Button></motion.div> : null}</AnimatePresence>
    </div>
  )
}

export default App
