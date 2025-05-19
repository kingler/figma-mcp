import { AgentRegistry, Agent, Task, AgentPool, TaskAssignment } from './agentRegistry.js';

/**
 * Orchestrator Service for coordinating multi-agent systems using BDI principles
 * (Belief-Desire-Intention)
 */
export class OrchestratorService {
  private registry: AgentRegistry;
  
  constructor(registry: AgentRegistry) {
    this.registry = registry;
  }
  
  // Agent Management
  
  async registerAgent(agent: Agent): Promise<Agent> {
    return this.registry.registerAgent(agent);
  }
  
  async updateAgentStatus(agentId: string, status: 'available' | 'busy' | 'offline'): Promise<Agent> {
    return this.registry.updateAgentStatus(agentId, status);
  }
  
  async listAvailableAgents(capability?: string): Promise<Agent[]> {
    return this.registry.listAvailableAgents(capability);
  }
  
  // Task Management
  
  async createTask(task: Task): Promise<Task> {
    // Ensure new tasks start with 'pending' status
    const newTask: Task = {
      ...task,
      status: 'pending' as const
    };
    return this.registry.createTask(newTask);
  }
  
  async assignTask(taskId: string, agentId: string): Promise<TaskAssignment> {
    return this.registry.assignTask(taskId, agentId);
  }
  
  async getTaskStatus(taskId: string): Promise<Task> {
    return this.registry.getTask(taskId);
  }
  
  // Agent Pool Management
  
  async createAgentPool(pool: AgentPool): Promise<AgentPool> {
    return this.registry.createAgentPool(pool);
  }
  
  // Orchestration Logic
  
  /**
   * Automatically allocate pending tasks to available agents based on
   * capabilities, priorities, and agent availability.
   * 
   * This is the core orchestration function that implements the BDI model:
   * - Beliefs: Current state of tasks and agents
   * - Desires: Getting all tasks completed efficiently
   * - Intentions: Specific allocations of tasks to agents
   */
  async autoAllocateTasks(maxAllocations?: number): Promise<TaskAssignment[]> {
    const pendingTasks = await this.registry.listTasks('pending');
    const availableAgents = await this.registry.listAvailableAgents();
    
    if (pendingTasks.length === 0 || availableAgents.length === 0) {
      return [];
    }
    
    // Sort tasks by priority (highest first)
    const sortedTasks = [...pendingTasks].sort((a, b) => b.priority - a.priority);
    
    const allocations: TaskAssignment[] = [];
    const assignedAgentIds = new Set<string>();
    
    // Process tasks up to maxAllocations (if specified)
    const tasksToProcess = maxAllocations ? sortedTasks.slice(0, maxAllocations) : sortedTasks;
    
    for (const task of tasksToProcess) {
      // Find the best agent for this task
      const compatibleAgents = availableAgents.filter(agent => 
        !assignedAgentIds.has(agent.id) && 
        this.hasRequiredCapabilities(agent, task)
      );
      
      if (compatibleAgents.length === 0) {
        continue; // No available agents with required capabilities
      }
      
      // Find the agent with the most matching capabilities (best fit)
      const bestAgent = this.findBestAgentForTask(compatibleAgents, task);
      
      try {
        // Attempt to assign the task
        const assignment = await this.registry.assignTask(task.id, bestAgent.id);
        allocations.push(assignment);
        assignedAgentIds.add(bestAgent.id);
        
        // Stop if we've reached the max allocations
        if (maxAllocations && allocations.length >= maxAllocations) {
          break;
        }
      } catch (error) {
        console.error(`Failed to assign task ${task.id} to agent ${bestAgent.id}:`, error);
        // Continue with next task
      }
    }
    
    return allocations;
  }
  
  /**
   * Check if an agent has all the required capabilities for a task
   */
  private hasRequiredCapabilities(agent: Agent, task: Task): boolean {
    return task.requiredCapabilities.every(capability => 
      agent.capabilities.includes(capability)
    );
  }
  
  /**
   * Find the best agent for a task based on capability matching
   */
  private findBestAgentForTask(agents: Agent[], task: Task): Agent {
    // Calculate a score for each agent based on matching capabilities
    const scoredAgents = agents.map(agent => {
      const matchingCapabilities = task.requiredCapabilities.filter(cap => 
        agent.capabilities.includes(cap)
      ).length;
      
      // Bonus points for specialized agents that have exactly the required capabilities
      const specializationBonus = 
        agent.capabilities.length === task.requiredCapabilities.length ? 2 : 0;
      
      return {
        agent,
        score: matchingCapabilities + specializationBonus
      };
    });
    
    // Sort by score (highest first)
    scoredAgents.sort((a, b) => b.score - a.score);
    
    // Return the highest scoring agent
    return scoredAgents[0].agent;
  }
} 