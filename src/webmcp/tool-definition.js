const MAX_DEFINITION_BYTES = 32 * 1024
const MAX_DESCRIPTION_LENGTH = 500
const MAX_INPUTS = 20
const MAX_SELECTOR_LENGTH = 500
const MAX_STEPS = 50
const MAX_TIMEOUT_MS = 10_000

const TOOL_NAME = /^[a-z][a-z0-9_]{0,63}$/
const RESULT_NAME = /^[a-z][a-z0-9_]{0,63}$/
const INPUT_TYPES = new Set(['boolean', 'integer', 'number', 'string'])
const STEP_OPERATIONS = new Set(['click', 'read', 'type', 'wait'])

function fail(message) {
  throw new Error(`Invalid WebMCP tool definition: ${message}`)
}

function boundedString(value, label, maxLength) {
  if (typeof value !== 'string' || !value.trim()) fail(`${label} must be a non-empty string.`)
  if (value.length > maxLength) fail(`${label} is too long.`)
  return value
}

function parseInputSchema(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.type !== 'object') {
    fail('inputSchema.type must be "object".')
  }

  const sourceProperties = value.properties || {}
  if (typeof sourceProperties !== 'object' || Array.isArray(sourceProperties)) {
    fail('inputSchema.properties must be an object.')
  }
  const entries = Object.entries(sourceProperties)
  if (entries.length > MAX_INPUTS)
    fail(`inputSchema cannot contain more than ${MAX_INPUTS} inputs.`)

  const properties = {}
  for (const [name, schema] of entries) {
    if (!RESULT_NAME.test(name)) fail(`input name "${name}" is not supported.`)
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
      fail(`input "${name}" must have a schema.`)
    }
    if (!INPUT_TYPES.has(schema.type)) fail(`input "${name}" has an unsupported type.`)

    properties[name] = { type: schema.type }
    if (schema.description !== undefined) {
      properties[name].description = boundedString(
        schema.description,
        `input "${name}" description`,
        MAX_DESCRIPTION_LENGTH,
      )
    }
    if (schema.type === 'string' && Number.isInteger(schema.maxLength)) {
      properties[name].maxLength = Math.min(Math.max(schema.maxLength, 1), 10_000)
    }
  }

  const required = value.required || []
  if (!Array.isArray(required) || required.some((name) => !properties[name])) {
    fail('inputSchema.required must contain only declared input names.')
  }

  return {
    type: 'object',
    properties,
    required: [...new Set(required)],
    additionalProperties: false,
  }
}

function parseStep(value, inputs, index) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`step ${index + 1} must be an object.`)
  }
  if (!STEP_OPERATIONS.has(value.op)) fail(`step ${index + 1} has an unsupported operation.`)

  const step = {
    op: value.op,
    selector: boundedString(value.selector, `step ${index + 1} selector`, MAX_SELECTOR_LENGTH),
  }

  if (value.op === 'type') {
    if (typeof value.input !== 'string' || !inputs.has(value.input)) {
      fail(`step ${index + 1} must reference a declared input.`)
    }
    step.input = value.input
  }

  if (value.op === 'read') {
    step.as = boundedString(value.as, `step ${index + 1} result name`, 64)
    if (!RESULT_NAME.test(step.as)) fail(`step ${index + 1} result name is not supported.`)
  }

  if (value.op === 'wait') {
    step.state = value.state === 'absent' ? 'absent' : 'visible'
    step.timeoutMs = Number.isInteger(value.timeoutMs)
      ? Math.min(Math.max(value.timeoutMs, 100), MAX_TIMEOUT_MS)
      : 5_000
  }

  return step
}

export function isHttpOrigin(origin) {
  try {
    const url = new URL(origin)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.origin === origin
  } catch {
    return false
  }
}

export function parseToolDefinition(value) {
  let source = value
  if (typeof value === 'string') {
    if (new TextEncoder().encode(value).byteLength > MAX_DEFINITION_BYTES) {
      fail('the definition is too large.')
    }
    try {
      source = JSON.parse(value)
    } catch {
      fail('the definition is not valid JSON.')
    }
  }

  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    fail('the definition must be an object.')
  }

  const name = boundedString(source.name, 'name', 64)
  if (!TOOL_NAME.test(name)) fail('name must use lowercase letters, numbers, and underscores.')
  const description = boundedString(source.description, 'description', MAX_DESCRIPTION_LENGTH)
  const inputSchema = parseInputSchema(source.inputSchema)

  if (!Array.isArray(source.steps) || !source.steps.length || source.steps.length > MAX_STEPS) {
    fail(`steps must contain 1 to ${MAX_STEPS} entries.`)
  }
  const inputs = new Set(Object.keys(inputSchema.properties))
  const steps = source.steps.map((step, index) => parseStep(step, inputs, index))

  const annotations = {}
  if (source.annotations?.readOnlyHint === true) annotations.readOnlyHint = true
  if (source.annotations?.destructiveHint === true) annotations.destructiveHint = true

  const parsed = { name, description, inputSchema, steps, annotations }
  if (new TextEncoder().encode(JSON.stringify(parsed)).byteLength > MAX_DEFINITION_BYTES) {
    fail('the normalized definition is too large.')
  }
  return parsed
}

export const customToolLimits = {
  definitionsPerOrigin: 25,
}
