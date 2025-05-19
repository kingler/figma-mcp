// Types for agents, tasks, and agent pools
export interface Agent {
  id: string;
  type: string;
  capabilities: string[];
  status: 'available' | 'busy' | 'offline';
  // BDI Model Attributes
  beliefs?: Record<string, any>;
  desires?: Array<{
    id: string;
    priority: number;
    description: string;
  }>;
  intentions?: Array<{
    id: string;
    desireId: string;
    action: string;
    status: 'planned' | 'in_progress' | 'completed' | 'failed';
  }>;
  // Swarm/Pheromone attributes
  reputation?: number;
  role?: 'orchestrator' | 'worker' | 'bdi-agent';
  specialization?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  requiredCapabilities: string[];
  priority: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assignedTo?: string;
  // Pheromone tracking
  signals?: Signal[];
  // Task metadata
  createdAt?: number;
  updatedAt?: number;
  completedAt?: number;
}

export interface AgentPool {
  name: string;
  agentIds: string[];
  specialization?: string;
}

export interface TaskAssignment {
  taskId: string;
  agentId: string;
  timestamp: number;
}

// Signal types from the HARSO pheromone system
export interface Signal {
  id: string;
  type: string;
  target: string;
  strength: number;
  category: 'state' | 'need' | 'problem' | 'priority' | 'dependency' | 'anticipatory';
  timestamp: number;
  message: string;
  data?: Record<string, any>;
}

// Category constants for better type checking
export const SignalCategories = {
  STATE: 'state' as const,
  NEED: 'need' as const,
  PROBLEM: 'problem' as const,
  PRIORITY: 'priority' as const,
  DEPENDENCY: 'dependency' as const,
  ANTICIPATORY: 'anticipatory' as const
};

// Pre-defined signal types from HARSO
export const SignalTypes = {
  PROJECT_INIT_NEEDED: 'project_initialization_needed',
  PROJECT_INIT_COMPLETE: 'project_initialization_complete',
  ARCH_DEFINED: 'architecture_defined_for_module_X',
  CODING_NEEDED: 'coding_needed_for_feature_X',
  CODING_COMPLETE: 'coding_complete_for_feature_X',
  CRITICAL_BUG: 'critical_bug_in_feature_X',
  INTEGRATION_CONFLICT: 'integration_conflict_on_merge_ABC',
  PERFORMANCE_BOTTLENECK: 'performance_bottleneck_in_N',
  PRIORITIZE_FEATURE: 'prioritize_feature_X_development',
  FEATURE_DEPENDENCY: 'feature_X_depends_on_feature_Y',
  ANTICIPATE_INTEGRATION: 'anticipate_integration_soon_for_feature_X'
};

/**
 * Registry for managing agents, tasks, and agent pools
 */
export class AgentRegistry {
  private agents: Map<string, Agent>;
  private tasks: Map<string, Task>;
  private pools: Map<string, AgentPool>;
  private assignments: TaskAssignment[];
  private signals: Map<string, Signal>;

  constructor() {
    this.agents = new Map();
    this.tasks = new Map();
    this.pools = new Map();
    this.assignments = [];
    this.signals = new Map();
  }

  // Agent management methods
  async registerAgent(agent: Agent): Promise<Agent> {
    // Set default reputation
    if (agent.reputation === undefined) {
      agent.reputation = 50;
    }
    this.agents.set(agent.id, { ...agent });
    return agent;
  }

  async updateAgentStatus(agentId: string, status: 'available' | 'busy' | 'offline'): Promise<Agent> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent with ID '${agentId}' not found`);
    }
    
    const updatedAgent = { ...agent, status };
    this.agents.set(agentId, updatedAgent);
    return updatedAgent;
  }

  async getAgent(agentId: string): Promise<Agent> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent with ID '${agentId}' not found`);
    }
    return agent;
  }

  async listAgents(): Promise<Agent[]> {
    return Array.from(this.agents.values());
  }

  async listAvailableAgents(capability?: string): Promise<Agent[]> {
    const availableAgents = Array.from(this.agents.values())
      .filter(agent => agent.status === 'available');
    
    if (capability) {
      return availableAgents.filter(agent => agent.capabilities.includes(capability));
    }
    
    return availableAgents;
  }

  // BDI agent methods
  async updateAgentBeliefs(agentId: string, beliefs: Record<string, any>): Promise<Agent> {
    const agent = await this.getAgent(agentId);
    const updatedAgent = { 
      ...agent, 
      beliefs: { ...(agent.beliefs || {}), ...beliefs }
    };
    this.agents.set(agentId, updatedAgent);
    return updatedAgent;
  }

  async updateAgentDesires(agentId: string, desire: { id: string; priority: number; description: string }): Promise<Agent> {
    const agent = await this.getAgent(agentId);
    const desires = [...(agent.desires || [])];
    
    // Update existing desire or add new one
    const existingIndex = desires.findIndex(d => d.id === desire.id);
    if (existingIndex >= 0) {
      desires[existingIndex] = desire;
    } else {
      desires.push(desire);
    }
    
    const updatedAgent = { ...agent, desires };
    this.agents.set(agentId, updatedAgent);
    return updatedAgent;
  }

  async updateAgentIntention(
    agentId: string, 
    intention: { id: string; desireId: string; action: string; status: 'planned' | 'in_progress' | 'completed' | 'failed' }
  ): Promise<Agent> {
    const agent = await this.getAgent(agentId);
    const intentions = [...(agent.intentions || [])];
    
    // Update existing intention or add new one
    const existingIndex = intentions.findIndex(i => i.id === intention.id);
    if (existingIndex >= 0) {
      intentions[existingIndex] = intention;
    } else {
      intentions.push(intention);
    }
    
    const updatedAgent = { ...agent, intentions };
    this.agents.set(agentId, updatedAgent);
    return updatedAgent;
  }

  async updateAgentReputation(agentId: string, delta: number): Promise<Agent> {
    const agent = await this.getAgent(agentId);
    const newReputation = Math.max(0, Math.min(100, (agent.reputation || 50) + delta));
    
    const updatedAgent = { ...agent, reputation: newReputation };
    this.agents.set(agentId, updatedAgent);
    return updatedAgent;
  }

  // Task management methods
  async createTask(task: Task): Promise<Task> {
    const now = Date.now();
    const newTask = {
      ...task,
      createdAt: now,
      updatedAt: now,
      signals: []
    };
    
    this.tasks.set(task.id, newTask);
    return newTask;
  }

  async updateTaskStatus(taskId: string, status: 'pending' | 'in_progress' | 'completed' | 'failed'): Promise<Task> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task with ID '${taskId}' not found`);
    }
    
    const now = Date.now();
    const updatedTask = { 
      ...task, 
      status,
      updatedAt: now,
      completedAt: status === 'completed' ? now : task.completedAt
    };
    
    this.tasks.set(taskId, updatedTask);
    return updatedTask;
  }

  async getTask(taskId: string): Promise<Task> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task with ID '${taskId}' not found`);
    }
    return task;
  }

  async listTasks(status?: 'pending' | 'in_progress' | 'completed' | 'failed'): Promise<Task[]> {
    const tasks = Array.from(this.tasks.values());
    
    if (status) {
      return tasks.filter(task => task.status === status);
    }
    
    return tasks;
  }

  // Signal management methods
  async createSignal(signal: Omit<Signal, 'id' | 'timestamp'>): Promise<Signal> {
    const id = `signal_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const now = Date.now();
    
    const newSignal: Signal = {
      ...signal,
      id,
      timestamp: now
    };
    
    this.signals.set(id, newSignal);
    
    // If signal is associated with a task, link it
    if (signal.target && this.tasks.has(signal.target)) {
      const task = await this.getTask(signal.target);
      const updatedTask = {
        ...task,
        signals: [...(task.signals || []), newSignal]
      };
      this.tasks.set(task.id, updatedTask);
    }
    
    return newSignal;
  }

  async getSignalsByType(type: string): Promise<Signal[]> {
    return Array.from(this.signals.values())
      .filter(signal => signal.type === type);
  }

  async getSignalsByCategory(category: string): Promise<Signal[]> {
    return Array.from(this.signals.values())
      .filter(signal => signal.category === category);
  }
  
  async getSignalsByTarget(target: string): Promise<Signal[]> {
    return Array.from(this.signals.values())
      .filter(signal => signal.target === target);
  }

  async updateSignalStrength(signalId: string, strengthDelta: number): Promise<Signal> {
    const signal = this.signals.get(signalId);
    if (!signal) {
      throw new Error(`Signal with ID '${signalId}' not found`);
    }
    
    const updatedSignal = {
      ...signal,
      strength: Math.max(0, signal.strength + strengthDelta)
    };
    
    this.signals.set(signalId, updatedSignal);
    
    // Update signal in task if associated
    if (signal.target && this.tasks.has(signal.target)) {
      const task = await this.getTask(signal.target);
      if (task.signals) {
        const signalIndex = task.signals.findIndex(s => s.id === signalId);
        if (signalIndex >= 0) {
          const updatedSignals = [...task.signals];
          updatedSignals[signalIndex] = updatedSignal;
          
          const updatedTask = {
            ...task,
            signals: updatedSignals
          };
          this.tasks.set(task.id, updatedTask);
        }
      }
    }
    
    return updatedSignal;
  }

  // Apply pheromone dynamics to all signals (evaporation)
  async applyPheromoneEvaporation(rates: Record<string, number> = { default: 0.05 }): Promise<void> {
    for (const [signalId, signal] of this.signals.entries()) {
      const rate = rates[signal.category] || rates.default;
      const newStrength = signal.strength * (1 - rate);
      
      if (newStrength < 0.05) {
        // Prune the signal if too weak
        this.signals.delete(signalId);
        
        // Remove from task if associated
        if (signal.target && this.tasks.has(signal.target)) {
          const task = await this.getTask(signal.target);
          if (task.signals) {
            const updatedTask = {
              ...task,
              signals: task.signals.filter(s => s.id !== signalId)
            };
            this.tasks.set(task.id, updatedTask);
          }
        }
      } else {
        // Update signal strength
        await this.updateSignalStrength(signalId, -signal.strength * rate);
      }
    }
  }

  // Assignment methods
  async assignTask(taskId: string, agentId: string): Promise<TaskAssignment> {
    const task = await this.getTask(taskId);
    const agent = await this.getAgent(agentId);
    
    // Check if task is already assigned
    if (task.assignedTo) {
      throw new Error(`Task '${taskId}' is already assigned to agent '${task.assignedTo}'`);
    }
    
    // Check if agent is available
    if (agent.status !== 'available') {
      throw new Error(`Agent '${agentId}' is not available (current status: ${agent.status})`);
    }
    
    // Check if agent has required capabilities
    const hasCapabilities = task.requiredCapabilities.every(cap => 
      agent.capabilities.includes(cap)
    );
    
    if (!hasCapabilities) {
      throw new Error(`Agent '${agentId}' does not have all required capabilities for task '${taskId}'`);
    }
    
    // Update task and agent
    await this.updateTaskStatus(taskId, 'in_progress');
    await this.updateAgentStatus(agentId, 'busy');
    
    // Update task's assignedTo field with explicit type safety
    const updatedTask: Task = { 
      ...task, 
      status: 'in_progress' as const,
      assignedTo: agentId,
      updatedAt: Date.now()
    };
    this.tasks.set(taskId, updatedTask);
    
    // Record the assignment
    const assignment: TaskAssignment = {
      taskId,
      agentId,
      timestamp: Date.now()
    };
    
    this.assignments.push(assignment);
    
    // Create assignment signal
    await this.createSignal({
      type: 'task_assigned',
      target: taskId,
      strength: 5.0,
      category: 'state',
      message: `Task '${task.title}' assigned to agent '${agent.id}'`,
      data: { agentId, taskId }
    });
    
    return assignment;
  }

  // Agent pool methods
  async createAgentPool(pool: AgentPool): Promise<AgentPool> {
    // Verify that all agents exist
    for (const agentId of pool.agentIds) {
      await this.getAgent(agentId);
    }
    
    this.pools.set(pool.name, { ...pool });
    return pool;
  }

  async getAgentPool(name: string): Promise<AgentPool> {
    const pool = this.pools.get(name);
    if (!pool) {
      throw new Error(`Agent pool '${name}' not found`);
    }
    return pool;
  }

  async listAgentPools(): Promise<AgentPool[]> {
    return Array.from(this.pools.values());
  }
} 