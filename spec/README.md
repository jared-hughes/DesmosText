The language specification for DesmosText is fully included within this `spec` directory.

The spec currently consists of a few parts for each language element

- corresponding TypeScript interface for the Desmos State JSON, taken from [Calc state TS](https://github.com/jared-hughes/calc-state-ts)
- BNF-like grammar for how it should appear in DesmosText (this will be formalized at a later date to support the parser)
- example(s) of the language element in use

See [State.md](State.md) for the root-level definitions from which everything else is defined.

Any questions or areas of significant doubt are marked with a `???`.

??? We need some way to handle unparseable math. For example if some latex is `x+\cdot 5`, we'd still want to encode it in DesmosText to not use information or account for the case where the parser is broken. Maybe use backticks like `` `x+\cdot 5` `` or just quotes like we're using for strings, such as `"x+\cdot 5"`.
