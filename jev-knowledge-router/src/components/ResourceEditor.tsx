import type { FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { kindLabel } from "@/lib/resource-helpers"
import type { Resource, ResourceKind } from "@/lib/router-types"

export type Draft = Pick<Resource, "name" | "description" | "activateWhen" | "avoidWhen">
export type Editor = { kind: ResourceKind; id?: string }

export function ResourceEditor({ editor, draft, onDraftChange, onClose, onSave }: {
  editor: Editor | null
  draft: Draft
  onDraftChange: (draft: Draft) => void
  onClose: () => void
  onSave: (event: FormEvent<HTMLFormElement>) => void
}) {
  const editing = Boolean(editor?.id)
  const label = editor ? kindLabel(editor.kind).toLowerCase() : "resource"
  return (
    <Dialog open={editor !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="editor-dialog sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${label}` : `Add ${label}`}</DialogTitle>
          <DialogDescription>Describe what this resource does, when to use it, and when to leave it out.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSave} className="editor-form">
          <FieldGroup>
            <Field><FieldLabel htmlFor="resource-name">Name</FieldLabel><Input id="resource-name" name="name" autoComplete="off" required maxLength={100} value={draft.name} placeholder={editor?.kind === "agent" ? "e.g. Data analyst…" : "e.g. API reference…"} onChange={(event) => onDraftChange({ ...draft, name: event.target.value })} /></Field>
            <Field><FieldLabel htmlFor="resource-description">Description</FieldLabel><Textarea id="resource-description" name="description" autoComplete="off" required maxLength={600} rows={2} value={draft.description} placeholder="What does it know or do?…" onChange={(event) => onDraftChange({ ...draft, description: event.target.value })} /></Field>
            <Field><FieldLabel htmlFor="resource-activate">Activate when</FieldLabel><Textarea id="resource-activate" name="activateWhen" autoComplete="off" required maxLength={600} rows={2} value={draft.activateWhen} placeholder="The tasks where it adds real value…" onChange={(event) => onDraftChange({ ...draft, activateWhen: event.target.value })} /></Field>
            <Field><FieldLabel htmlFor="resource-avoid">Do not activate when</FieldLabel><Textarea id="resource-avoid" name="avoidWhen" autoComplete="off" required maxLength={600} rows={2} value={draft.avoidWhen} placeholder="Similar tasks outside its scope…" onChange={(event) => onDraftChange({ ...draft, avoidWhen: event.target.value })} /></Field>
          </FieldGroup>
          <DialogFooter className="editor-footer"><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit">{editing ? "Save changes" : "Add resource"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
