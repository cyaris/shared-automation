# Python And SQL

- Apply these conventions to tracked and nonignored Python and SQL source files. Skip generated, vendored, build-output, and ignored files unless a task explicitly requires them.
- Follow the repository's configured formatter, import sorter, and linter rather than hand-formatting against their output. After changing Python or SQL in a repository that defines formatting or lint validation commands, run every applicable validation and address its findings.
- Write comments only when they materially clarify necessary context. Fix typos in comments that you write or edit nearby.
- Do not define a local variable if it is referenced only once unless its name materially improves clarity or the variable is needed for correctness; otherwise, inline its value. Line wrapping alone does not justify a single-use variable.
- Group consecutive statements by purpose with one blank line between groups. Keep statements together when they are the same kind or directly sequentially related; a standalone comment counts as the separator, so do not also add a blank line immediately before it solely to create separation.
- When order has no semantic, dependency, source-order, or configuration-defined meaning, arrange lists, dictionary keys, named definitions, and other code collections alphabetically. Compare code case-sensitively with uppercase before lowercase, and let the formatter, import sorter, linter, or another installed ordering tool take precedence.
- Format user-facing or human-readable logged numeric quantities with thousands separators. In Python, include `,` in the format specifier, such as `f"{count:,d}"` or `f"{count:,}"`. Do not apply numeric formatting to identifiers, to other values whose digits are not quantities, or to structured log fields a parser or metrics pipeline consumes, because the separators make them locale-dependent strings.
- Declare every installed dependency in the owning project's dependency file rather than relying on the local environment or a transitive dependency.

### Python

- Format Python with the repository's Black and isort settings.
- Keep imports at the top of a module. Defer an import into a function only to break a circular dependency or when the module must run without a genuinely optional dependency. Let isort determine import ordering; its output takes precedence over manual ordering.
- Leave a blank line immediately before every `return` unless the return is the first statement in the function body, the immediate body of an `if`/`elif`/`else` guard, or immediately follows a multiline string assignment.
- Omit a bare `return` only when control would naturally reach the end of the function at that point. Keep or add a bare `return` for an intentional early exit that prevents later statements from running, and do not write `return None` for a no-value return.
- Follow an `if`/`elif`/`else` statement with a blank line before the next statement unless it is the last statement in its block. A standalone comment immediately after the conditional counts as that separation, so do not also add a blank line before the comment.
- Before formatting, remove trailing commas that serve no syntactic purpose. Keep a comma when syntax requires it or when Black restores it to preserve the formatted layout; judge nested collections independently because Black may collapse them separately.
- Indent the contents of a multiline triple-quoted string to the indentation of its opening delimiter. When the opening delimiter shares a line with a statement, use that statement's indentation; when the delimiter stands on its own as a nested argument, align the contents with the delimiter rather than dedenting them.

### SQL

- Write SQL operations and keywords in lowercase.
- Put each clause, such as `select`, `from`, `where`, `group by`, `order by`, and `limit`, on its own line. A query may remain on one line only when it is a single-item `select` from one table with no other clauses.
- Keep a clause with one item on one line. For multi-item `select` and named-column `group by` clauses, put the keyword on its own line and each item on its own line one indentation level deeper. Keep positional `group by` items inline regardless of count.
- Keep `order by` items inline unless there are at least five named columns or the line would exceed Black's configured line length; then put each item on its own indented line. Positional `order by` items remain inline regardless of count.
- Format an `insert` target-column list as a parenthesized multi-item list with one indented column per line and the closing `)` appended to the last column, followed by a blank line before the supplying `select` or `values`. Lists of three or fewer columns and lists that fit within Black's configured line length may remain inline.
- Treat a single interpolated placeholder that expands to multiple clause items or target columns as one written item: keep it beside the clause keyword or inline within the parentheses.
- For `where`, `having`, and `qualify`, keep a single condition beside the keyword. With multiple conditions, put the keyword on its own line, put each operand on its own indented line, and begin continuation lines with `and` or `or`.
- Break only the outermost boolean level when nested parenthesized groups contain only simple leaf conditions. When a parenthesized group contains another parenthesized boolean group, break that containing group too and indent one additional level per nesting level.
- Prefer `qualify` over a subquery or CTE used only to filter a window function's result.
- Keep a function-call calculation on one line, including an entire window `over (...)` clause and nested aggregate or scalar calls, even when the line is long.
- Keep a join and its first `on` condition on the same line. With multiple join conditions, put each additional condition on its own line, aligned beneath the first condition with the leading `and` or `or` extending to its left.
- Do not alias a query that reads from only one relation. When aliases are needed, assign sequential single-letter aliases `a`, `b`, `c`, and so on in table order, restarting at `a` in each query scope.
- Omit optional operators and keywords that have no effect, including `as` between a selected value and its alias. Retain required syntax such as the `as` in a CTE definition.
- Cast with `::` rather than `cast(... as ...)`.
- In `group by`, use selected-column positions rather than names or calculations whenever possible.
- Put a blank line before a `select` that begins on a new line.
- Prefer a descriptively named CTE over a derived-table subquery in `from` or `join`, but use as few CTEs as practical and fold a one-use projection or simple row-shaping step into its immediate consumer when that remains clear and does not duplicate logic or change table grain.
- Format a `with` clause with `with` on its own line and blank lines after `with`, between CTE definitions, and before the outer query. Write each CTE as `<name> as (` on its own line, leave a blank line before its inner query, keep the inner query at the statement's base indentation, and append the closing `)` and any separating comma to the inner query's final line.
