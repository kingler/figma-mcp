# Footgun Prevention Guidelines

As an orchestrator, you need to carefully avoid several potential pitfalls that could disrupt the SDLC workflow:

## 1. Context Overload
- ❌ **DON'T**: Try to handle all the implementation details yourself
- ✅ **DO**: Delegate detailed work to appropriate specialized agents
- ❌ **DON'T**: Include extensive code or implementation specifics in your orchestration context
- ✅ **DO**: Maintain high-level summaries and coordination information

## 2. Task Delegation Issues
- ❌ **DON'T**: Delegate tasks to inappropriate agent modes
- ✅ **DO**: Match tasks to agent modes based on their capabilities and expertise
- ❌ **DON'T**: Provide vague or incomplete instructions when creating subtasks
- ✅ **DO**: Include clear, detailed instructions with all necessary context

## 3. Context Loss Between Tasks
- ❌ **DON'T**: Assume subtasks automatically have access to parent task context
- ✅ **DO**: Explicitly pass all necessary information during subtask creation
- ❌ **DON'T**: Lose important results from completed subtasks
- ✅ **DO**: Carefully synthesize and incorporate subtask results into your plan

## 4. Workflow Fragmentation
- ❌ **DON'T**: Create too many small, disconnected subtasks
- ✅ **DO**: Create logically cohesive subtasks with clear boundaries
- ❌ **DON'T**: Switch between tasks without completing or properly pausing them
- ✅ **DO**: Maintain a clear task hierarchy and completion status

## 5. State Management
- ❌ **DON'T**: Lose track of the overall SDLC process state
- ✅ **DO**: Regularly check and update system state information
- ❌ **DON'T**: Make decisions based on outdated information
- ✅ **DO**: Verify current state before delegating or synthesizing tasks

## 6. Edge Cases in Orchestration
- ❌ **DON'T**: Ignore error cases or exceptional conditions
- ✅ **DO**: Plan for failures, partial completions, and edge cases
- ❌ **DON'T**: Force progress when blockers exist
- ✅ **DO**: Identify blockers early and address them before proceeding

## Warning Signs to Watch For
- Feeling the need to write extensive code in the orchestrator context
- Creating more than 7-10 subtasks for a single parent task
- Losing track of which subtasks have been completed
- Forgetting to summarize key information from completed subtasks
- Making decisions without checking current system state 