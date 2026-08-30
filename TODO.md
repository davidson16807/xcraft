<!-- HUMAN WRITTEN -->

BUGS:
check mark in "7. Distribution" did not change
in "4 Multiplication", dragging "1/x" across the equals sign produces logx, probably because lone divisors were never 
"Challenge" was apparently challenging
sides of equation do not expand horizontally to fit contents
"Power of a quotient" shows parentheses on different lines
"32 Same result roots" needs to be fixed, doesn't resolve when x is solved
"34 Split a logarithm" is hard for user discover distributivity
√(x/2) shows up like (√x)/2
(yx)/2ᵃ doesn't show 
"37 Split same result logarithm" is a slop level
"40 Power in a logarithm base" is a slop level and may be unsolvable

UNOBTRUSIVE:
* levels need to switch to variables a,b,c for constants to indicate that root is being taken
* large expressions like the denominator of "1 / x/14 + 3/14" can't be dragged - division is treated as a "pow" expression so it has no handle
* track the highest level completed and disable progression beyond it until it is solved

MAYBE OBTRUSIVE:
* create levels to test other algebras: set notation, boolean algebra

OBTRUSIVE:
* allow inverting fractions on both sides
* allow applying the opposite of a term to both sides of a fraction
* allow dragging equations within systems of equations
* ability to write your own equations
* decouple essential EquationsView logic from logic that formats element visuals (e.g. showing × vs ⋅ for arithmetic, color dots like 🔴)
* export to latex, python, javascript, etc.
* "techtree" of operations
* mode=god, mode=creative, mode=story
* expand target side width to prevent sides rapidly switching back and forth
* internationalization

* traverse through GRE workbook and find properties to implement in code or demonstrate through levels

