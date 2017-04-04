# G

A system to manipulate state with ease. 


## Principles


0. Continuations 
   Linear execution of programs has failed us. Code should be arranged semanticlly, leaving up order of execution to the system that computes state. Programmer should never think about execution contexts,
   ticks and flows.

1. Side effects are tracked automatically
   All state changes build a graph of operations, that can be visualized and undone in group. The graph is available to future operations to find efficient strategy of migrating state, it can be dynamically updated and spliced. The graph is not centralized, and is rather a functional data structure that can be easily spliced and patched. 

2. Anything can be undone
   Unloading and deconstructing of complex interaction should be possible 

   *  Remove things one by one or in batch
      It should be possible to tear down a big house brick by brick in any order.
      The house can be rebuilt back by pieces 

   *  Unload code by removing its effects
    No domain-specific code should be ran when cleaning up.

   *  Progressive state migration
      When state is changed, the system knows what needs to be updated, and how current state can be migrated with least effort

3. Stacks of values
   State changes can be triggered by different sources: User interactions, declarative rules, inheritance and domain-specific code. Values should coexist together, work in a predictable and reprodusible way way for complex behaviours to compose properly with glue code.

4. State can be tagged with metadata
   Values may have additional identity used for retrival and cleanup of state. Metadata may also provide clues for sorting, ownership and importance of values.
   


## Abstractions

### Operation
Single operation is a triplet of (context, key, value) 
and optional metadata arguments. Those are immutable.

Operations also have three pairs of mutable pointers that 
make up linked lists:

*Effect*  - $before/$after + $caller
A graph of causation, doubles up as transaction. 

*History* - $preceeding/$succeeding 
A stack of concurrent values for the key of specific context

*Group*   - $previous/$next 
A groupping of values, similar to array.


### Node

*G.Node* - An observable virtual dom element. Provides a number of state reconciliation strategies and ways to build the tree.

*G.Node.Values* - Representation of form data. Provides observable access to structured fieldnames, and current state of form fields.

*G.Node.Microdata* - Nestable resources bound to DOM by conventions of microdata. Provides 2-way access to data, can populate templates when data is changed.
###
