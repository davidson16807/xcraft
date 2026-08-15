<!-- HUMAN WRITTEN -->

Now that we have some proper tests stood up, I'd like to introduce you to our TODO list. I'd like it if we could handle these one at a time, so that I can understand the changes being made. However I do not know what order would work best. I suspect the tasks have a different effects upon the code base, some more dramatic than others. Some may unnecessarily complicate the code base, or worse, make it difficult to implement other features. These preclusions should be tracked, even if only in the sense the combining features would make the code excessively complex. 

UNOBTRUSIVE:
* track the highest level completed and disable progression beyond it until it is solved
* (20-2x)/3 must allow 3 to be distributed across 20-2x
* add an option to auto-simplify expressions that evaluate to a constant
* allow dragging x when it is the only term/factor on a side
* allow dragging a constant when it is the only term/factor
* display 0 when all terms on a side are cancelled
* display 1 when all factors on a side are cancelled
* display * in front when moving a factor
* display + in front when moving a term

MAYBE OBTRUSIVE:
* allow swapping the sides of an equation (the "symmetric property")
* allow applying the opposite of a term to both sides of a fraction
* more levels to demonstrate properties of power laws
* allow inverting both sides of a fraction
* depicting square roots in the view layer

OBTRUSIVE:
* allow representing other algebras: set notation, boolean algebra
* allow representing other structures, starting with orders
* ability to write your own equations

* traverse through GRE workbook and find properties to implement in code or demonstrate through levels

