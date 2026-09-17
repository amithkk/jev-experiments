import assert from "node:assert/strict"
import test from "node:test"

import { defaultResources } from "../src/lib/defaults.ts"
import { InputError, routeTask, validateInput } from "../api/router.ts"

test("routes every candidate independently and preserves IDs", async () => {
  const resources = ["kb-incidents", "agent-code", "agent-support"].map((id) => defaultResources.find((item) => item.id === id)!)
  const result = await routeTask(
    { task: "Investigate checkout failures after deploy", resources },
    async () => ({ model: "test", probabilities: [0.94, 0.87, 0.08] }),
  )
  assert.deepEqual(result.scores, [
    { id: "kb-incidents", probability: 0.94 },
    { id: "agent-code", probability: 0.87 },
    { id: "agent-support", probability: 0.08 },
  ])
})

test("rejects missing activation rules and duplicate IDs", () => {
  const resource = defaultResources[0]
  assert.throws(
    () => validateInput({ task: "Test", resources: [{ ...resource, activateWhen: "" }] }),
    InputError,
  )
  assert.throws(
    () => validateInput({ task: "Test", resources: [resource, resource] }),
    /unique/,
  )
})

test("rejects incomplete or out-of-range Jev scores", async () => {
  await assert.rejects(
    () => routeTask({ task: "Test", resources: [defaultResources[0]] }, async () => ({ model: "test", probabilities: [1.2] })),
    /invalid route scores/,
  )
})
