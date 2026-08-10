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

/**
 * Storage key for an anonymous `export default`. Not a valid JS identifier, so
 * it can never collide with a binding the source declares.
 */
const DEFAULT_EXPORT_KEY = '*default*'

function fail(node, message) {
  const at = node?.loc?.start
  const where = at ? ` (line ${at.line}, column ${at.column})` : ''
  throw new Error(`${message}${where}`)
}

/**
 * Evaluate a node that must be a plain data literal.
 *
 * `resolve` turns a bare identifier into a value — an import binding, or another
 * top-level const in the same file. It is a callback rather than a Map so that
 * consts can reference each other regardless of declaration order.
 */
function literalValue(node, resolve) {
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
        return literalValue(element, resolve)
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
        out[key] = literalValue(prop.value, resolve)
      }
      return out
    }

    case 'UnaryExpression': {
      // Negative numbers parse as a unary minus, not a literal.
      if (node.operator !== '-' && node.operator !== '+') {
        fail(node, `Unary operator "${node.operator}" is not allowed`)
      }
      const value = literalValue(node.argument, resolve)
      if (typeof value !== 'number') {
        fail(node, 'Unary +/- is only allowed on numbers')
      }
      return node.operator === '-' ? -value : value
    }

    case 'Identifier':
      return resolve(node)

    default:
      fail(node, `${node.type} is not a data literal`)
      return undefined
  }
}

/**
 * Parse `source` and return the value exported as `exportName`.
 *
 * Both `export const x = ...` and `const x = ...; export { x }` are supported,
 * including aliases (`export { data as SpeakersData }`). The export-list form is
 * ordinary ESM that the old `import()` path handled, so failing on it would have
 * been a silent narrowing of what these extractors accept.
 *
 * `resolveImport(specifier, localName)` maps a **default** import to the value
 * its binding should carry — the extract scripts use it to turn a bundler-aliased
 * image import into a path string. Namespace (`import * as x`) and named
 * (`import { x }`) specifiers are deliberately not bound: they do not denote the
 * module's default value, and binding them anyway produced a plausible-looking
 * but wrong path. Referencing one is an "unresolved identifier" error rather
 * than a quietly incorrect row.
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

  /** local name -> value, from default imports. */
  const importBindings = new Map()
  /** local name -> init AST node, from any top-level const. */
  const constNodes = new Map()
  /** exported name -> local name. */
  const exportedToLocal = new Map()

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
        if (spec.type !== 'ImportDefaultSpecifier') continue
        const value = resolveImport?.(node.source.value, spec.local.name)
        if (value !== undefined) importBindings.set(spec.local.name, value)
      }
      continue
    }

    // `export default [...]` has no name to bind, so it is filed under a key
    // that cannot collide with a real identifier and reached by asking for
    // "default". Allowing the node at the top level without mapping it here
    // made every default-exported roster report itself as missing.
    if (node.type === 'ExportDefaultDeclaration') {
      if (node.declaration.type === 'Identifier') {
        exportedToLocal.set('default', node.declaration.name)
      } else {
        constNodes.set(DEFAULT_EXPORT_KEY, node.declaration)
        exportedToLocal.set('default', DEFAULT_EXPORT_KEY)
      }
      continue
    }

    // `export { teamData }` / `export { data as SpeakersData }` carry no
    // declaration — the binding they name is declared elsewhere in the file.
    if (node.type === 'ExportNamedDeclaration' && !node.declaration) {
      for (const spec of node.specifiers ?? []) {
        if (spec.local?.type !== 'Identifier') continue
        const exported =
          spec.exported.type === 'Identifier'
            ? spec.exported.name
            : spec.exported.value
        exportedToLocal.set(exported, spec.local.name)
      }
      continue
    }

    const declaration =
      node.type === 'ExportNamedDeclaration' ? node.declaration : node

    if (!declaration || declaration.type !== 'VariableDeclaration') continue

    for (const declarator of declaration.declarations) {
      if (declarator.id.type !== 'Identifier') {
        fail(declarator, 'Destructuring declarations are not supported')
      }
      if (!declarator.init) continue

      constNodes.set(declarator.id.name, declarator.init)
      if (node.type === 'ExportNamedDeclaration') {
        exportedToLocal.set(declarator.id.name, declarator.id.name)
      }
    }
  }

  const localName = exportedToLocal.get(exportName)
  if (!localName) {
    throw new Error(`Source does not export a const named "${exportName}"`)
  }

  const target = constNodes.get(localName)
  if (!target) {
    throw new Error(
      localName === DEFAULT_EXPORT_KEY
        ? `"${exportName}" is exported but is not a data literal`
        : `"${exportName}" is exported but "${localName}" is not a const in this file`
    )
  }

  // Evaluated lazily so consts may reference each other in any order; the
  // in-progress set turns a cycle into an error instead of a stack overflow.
  const inProgress = new Set()
  const resolve = (identifierNode) => {
    const name = identifierNode.name
    if (importBindings.has(name)) return importBindings.get(name)
    if (!constNodes.has(name)) {
      fail(identifierNode, `Unresolved identifier "${name}"`)
    }
    if (inProgress.has(name)) {
      fail(identifierNode, `Circular reference through "${name}"`)
    }
    inProgress.add(name)
    try {
      return literalValue(constNodes.get(name), resolve)
    } finally {
      inProgress.delete(name)
    }
  }

  return literalValue(target, resolve)
}
