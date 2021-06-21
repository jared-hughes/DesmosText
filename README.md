# DesmosText

DesmosText serves as a near one-to-one mapping between Desmos graphs in JSON and human-readable text files. DesmosText uses the `.dest` file extension.

WARNING: DesmosText is not yet stable. Do not use it with the expectation that `.dest` files will continue to work in the future.

Some goals for DesmosText:

- Provide a simple human-readable format for Desmos graphs, allowing:
  - Simple editing for programs to generate text instead of how people paste text with newlines into Desmos
  - Provide canonical file sizes for code golfing purposes
  - Easy, human-readable sharing independent of Desmos' graph links
- Transform smoothly (via compilers) to and from Desmos State JSON
  - more precisely, any graph that doesn't display any errors and is created purely within the Desmos UI should have equal function when transformed through DesmosText
  - (nice-to-have) can transform back and forth without losing any information
- Everything possible in Desmos should be possible in DesmosText as well
- Use sane defaults (the same defaults as Desmos) when possible, for example `-10 ≤ x ≤ 10` for viewport bounds
- (long-term) Can be included in DesModder as a button to switch between DesmosText mode and MathQuill mode

Some non-goals for DesmosText:

- Be a strict superset of Desmos State JSON
- Add any new features to Desmos
- Check for any errors in the program (this should instead be done "at runtime" in Desmos)

## Progress Timeline to 0.1 release (near feature parity with Desmos):

- Language design: 0% (100% = includes all features of desktop Desmos)
- Testing: 0% (not sure how to get to 100%)

Forward

- DesmosText to DesmosText AST: 0% (100% = can parse all of the above language features)
- DesmosText AST to Desmos State JSON + LaTeX AST: 0% (100% = can convert all of the above language features to Desmos graph state JSON, except with LaTeX AST instead of LaTeX strings)
- LaTeX AST to Desmos LaTeX strings: 0% (100% = can convert any LaTeX from the above features to LaTeX strings)

Backward

- Desmos LaTeX strings to LaTeX AST: 0% (100% = can parse all Latex that Desmos can handle)
- Desmos State JSON to DesmosText AST: 0% (100% = can convert any Desmos graph to DesmosText AST)
- DesmosText AST to DesmosText: 0% (100% = can convert and Desmos graph to Desmos Text)

## Implementation

After learnings from [DesmosPlus](https://github.com/jared-hughes/DesmosPlus) and my projects using estree, this should hopefully be much better-architected.

Specific plans to change:

- Use Typescript instead of mere Javascript
- Use Nearley instead of ANTLR for parsing
- Compile first to a LaTeX AST instead of directly building up LaTeX strings through string operations

## The Future

I am intending for the DesmosText AST to serve as the canonical form for building up graph states programmatically. (Possible analogy: many languages compile to C instead of directly to machine code). This will be helpful if I (or someone else) ever chooses to finish implementing DesmosPlus.
