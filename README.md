# G

A system to manipulate state with ease. 


## Principles


0. Continuations 
   Linear execution of programs has failed us. Code should be arranged semanticlly, leaving up order of execution to the system that computes state. Programmer should never think about execution contexts,
   ticks and flows.

1. Side effects are tracked automatically
   Down with 

2. Anything can be undone
   Unloading and deconstructing of complex interaction should be possible 

   *  Remove things one by one or in batch
      It should be possible to tear down a big house brick by brick in any order.
      The house can be rebuilt back by pieces 

   *  Unload code by removing its effects
    No domain-specific code should be ran when cleaning up.

   *  Progressive state migration
      When state is changed

3. Stacks of values
   Concurrent stat

4. 

5. All state can be tagged with metadata
   * 


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
