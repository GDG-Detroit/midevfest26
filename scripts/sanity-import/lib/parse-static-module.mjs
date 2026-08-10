/**
 * Read a data literal out of an ESM source file without executing it.
 *
 * The extract scripts used to base64 the source into a `data:text/javascript`
 * URL and `import()` it. That evaluates the module: any top-level statement in
 * the file runs with full Node privileges — fs, child_process, network — before
 * a single row is validated. For a roster that came out of this repo's own git
 * history that is no worse than `npm run build`, which already executes the same
 * file. It stops being equivalent when the source is another repository's
 * data file (extract-devfest-2025.mjs is built to do exactly that) and the
 * machine running it holds a Sanity write token and Google service-account
 * credentials, as the n8n host does.
 *
 * So: parse to an AST and read only literal nodes. Nothing is evaluated, no
 * sandbox has to hold, and an unexpected construct is a hard error naming the
 * line rather than something that quietly ran.
 *
 * Deliberately an allow-list. Anything not enumerated below throws.
 */
import { parse } from 'acorn'

/**
 * Nodes that can appear at the top level of an accepted source.
 *
 * All declarative. What this deliberately excludes is ExpressionStatement —
 * the shape every top-level side effect takes, from `writeFileSync(...)` to a
 * bare IIFE. A default export is data like any other and is ignored unless it
 * happens to be the requested export.
 */
const ALLOWED_TOP_LEVEL = new Set([
  'ImportDeclaration',
  'ExportNamedDeclaration',
  'ExportDefaultDeclaration',
  'VariableDeclaration',
  'EmptyStatement',
])

function fail(node, message) {
  const at = node?.loc?.start
  const where = at ? ` (line ${at.line}, column ${at.column})` : ''
  throw new Error(`${message}${where}`)
}

/**
 * Evaluate a node that must be a plain data literal.
 *
 * `bindings` resolves bare identifiers — image imports rewritten to path
 * strings, and any top-level const literals the source declares.
 */
function literalValue(node, bindings) {
  switch (node.type) {
    case 'Literal':
      return node.value

    case 'TemplateLiteral':
      // Only a template with no interpolation is a constant.
      if (node.expressions.length > 0) {
        fail(node, 'Template literal with interpolation is not a constant')
      }
      return node.quasis.map((q) => q.value.cooked).join('')

    case 'ArrayExpression':
      return node.elements.map((element) => {
        if (element === null) return null
        if (element.type === 'SpreadElement') {
          fail(element, 'Spread is not allowed in a data literal')
        }
        return literalValue(element, bindings)
      })

    case 'ObjectExpression': {
      const out = {}
      for (const prop of node.properties) {
        if (prop.type !== 'Property') {
          fail(prop, 'Only plain properties are allowed in a data literal')
        }
        if (prop.computed) {
          fail(prop, 'Computed keys are not allowed in a data literal')
        }
        const key =
          prop.key.type === 'Identifier' ? prop.key.name : prop.key.value
        out[key] = literalValue(prop.value, bindings)
      }
      return out
    }

    case 'UnaryExpression': {
      // Negative numbers parse as a unary minus, not a literal.
      if (node.operator !== '-' && node.operator !== '+') {
        fail(node, `Unary operator "${node.operator}" is not allowed`)
      }
      const value = literalValue(node.argument, bindings)
      if (typeof value !== 'number') {
        fail(node, 'Unary +/- is only allowed on numbers')
      }
      return node.operator === '-' ? -value : value
    }

    case 'Identifier':
      if (!bindings.has(node.name)) {
        fail(node, `Unresolved identifier "${node.name}"`)
      }
      return bindings.get(node.name)

    default:
      fail(node, `${node.type} is not a data literal`)
      return undefined
  }
}

/**
 * Parse `source` and return the value of `export const <exportName> = ...`.
 *
 * `resolveImport(specifier, localName)` maps each import to the value its
 * binding should carry — the extract scripts use it to turn a bundler-aliased
 * image import into the path string the row needs. Return `undefined` to leave
 * a binding unresolved, which makes any use of it an error.
 */
export function readExportedLiteral(source, exportName, options = {}) {
  const { resolveImport } = options

  let program
  try {
    program = parse(source, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
    })
  } catch (error) {
    throw new Error(`Could not parse source as an ES module: ${error.message}`)
  }

  const bindings = new Map()
  let found
  let seen = false

  for (const node of program.body) {
    if (!ALLOWED_TOP_LEVEL.has(node.type)) {
      fail(
        node,
        `Unexpected ${node.type} at the top level — this file is read as ` +
          `data and may only contain imports, const declarations, and exports`
      )
    }

    if (node.type === 'ImportDeclaration') {
      for (const spec of node.specifiers) {
        const value = resolveImport?.(node.source.value, spec.local.name)
        if (value !== undefined) bindings.set(spec.local.name, value)
      }
      continue
    }

    // `export const x = ...` and a bare `const x = ...` are both declarations;
    // the export just wraps one.
    const declaration =
      node.type === 'ExportNamedDeclaration' ? node.declaration : node

    if (!declaration || declaration.type !== 'VariableDeclaration') {
      if (node.type === 'ExportNamedDeclaration') continue
      fail(node, `Unexpected ${node.type} at the top level`)
    }

    for (const declarator of declaration.declarations) {
      if (declarator.id.type !== 'Identifier') {
        fail(declarator, 'Destructuring declarations are not supported')
      }
      if (!declarator.init) continue

      const name = declarator.id.name
      const isTarget =
        name === exportName && node.type === 'ExportNamedDeclaration'

      // Only the target export has to be a literal. Other top-level consts are
      // resolved lazily so an unrelated non-literal const is not fatal.
      if (isTarget) {
        found = literalValue(declarator.init, bindings)
        seen = true
        continue
      }

      try {
        bindings.set(name, literalValue(declarator.init, bindings))
      } catch {
        // Unusable as a binding; only an error if something references it.
      }
    }
  }

  if (!seen) {
    throw new Error(`Source does not export a const named "${exportName}"`)
  }

  return found
}
