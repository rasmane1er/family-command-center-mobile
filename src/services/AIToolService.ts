/**
 * Claude tool definitions and dispatcher for autonomous family actions.
 * Tools let the AI directly create tasks, events, shopping items, bills, and goals.
 */

const generateId = () => Math.random().toString(36).substring(2, 11);
const now = () => new Date().toISOString();

// ── Tool schemas (Anthropic format) ─────────────────────────────────────────

export const AI_TOOLS = [
  {
    name: 'add_task',
    description: 'Add a task or chore to the family task list. Use when the user asks to add, create, or schedule a task/chore/todo.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Task title, concise and actionable' },
        description: { type: 'string', description: 'Optional longer description' },
        assignedToName: { type: 'string', description: 'Family member name to assign to (optional)' },
        dueDate: { type: 'string', description: 'ISO date string (YYYY-MM-DD), optional' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Task priority' },
        category: { type: 'string', description: 'Category like Chores, Health, Finance, School, etc.' },
        points: { type: 'number', description: 'XP points awarded on completion (default 50)' },
      },
      required: ['title', 'priority', 'category'],
    },
  },
  {
    name: 'add_shopping_item',
    description: 'Add an item to the family shopping list. Use when the user wants to add groceries or shopping items.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Item name' },
        quantity: { type: 'number', description: 'Quantity needed (default 1)' },
        unit: { type: 'string', description: 'Unit like lbs, oz, boxes, etc. (optional)' },
        category: { type: 'string', description: 'Category like Produce, Dairy, Meat, etc.' },
        notes: { type: 'string', description: 'Optional notes like brand preference' },
      },
      required: ['name', 'category'],
    },
  },
  {
    name: 'add_calendar_event',
    description: 'Add an event to the family calendar. Use when the user wants to schedule appointments, parties, or any calendar event.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Event title' },
        startDate: { type: 'string', description: 'ISO datetime string for event start' },
        endDate: { type: 'string', description: 'ISO datetime string for event end' },
        allDay: { type: 'boolean', description: 'Whether this is an all-day event' },
        location: { type: 'string', description: 'Location or address (optional)' },
        description: { type: 'string', description: 'Optional event description' },
        category: { type: 'string', description: 'Category like Medical, School, Social, etc.' },
      },
      required: ['title', 'startDate', 'endDate'],
    },
  },
  {
    name: 'mark_bill_paid',
    description: 'Mark a bill as paid. Use when the user says they paid a bill or wants to mark it as paid.',
    input_schema: {
      type: 'object',
      properties: {
        billName: { type: 'string', description: 'Name of the bill (partial match ok, e.g. "electric", "car insurance")' },
      },
      required: ['billName'],
    },
  },
  {
    name: 'add_goal',
    description: 'Add a family savings or life goal. Use when the user wants to set a financial goal, vacation fund, or family milestone.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Goal title' },
        description: { type: 'string', description: 'What this goal is about' },
        targetAmount: { type: 'number', description: 'Dollar amount to save (optional)' },
        targetDate: { type: 'string', description: 'Target completion date ISO string (optional)' },
        category: { type: 'string', description: 'Category like Travel, Home, Education, Emergency, etc.' },
      },
      required: ['title', 'category'],
    },
  },
] as const;

export type ToolName = typeof AI_TOOLS[number]['name'];

export interface ToolResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

// ── Tool dispatcher ──────────────────────────────────────────────────────────

export async function executeTool(name: ToolName, input: Record<string, unknown>): Promise<ToolResult> {
  try {
    switch (name) {
      case 'add_task':
        return executeAddTask(input);
      case 'add_shopping_item':
        return executeAddShoppingItem(input);
      case 'add_calendar_event':
        return executeAddCalendarEvent(input);
      case 'mark_bill_paid':
        return executeMarkBillPaid(input);
      case 'add_goal':
        return executeAddGoal(input);
      default:
        return { success: false, message: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return { success: false, message: String(err) };
  }
}

function executeAddTask(input: Record<string, unknown>): ToolResult {
  const { addTask, members } = (require('../store/useFamilyStore').useFamilyStore as any).getState();
  const family = (require('../store/useFamilyStore').useFamilyStore as any).getState().family;
  if (!family) return { success: false, message: 'No family set up' };

  let assignedTo: string[] | undefined;
  if (input.assignedToName) {
    const member = members.find((m: any) =>
      m.name.toLowerCase().includes((input.assignedToName as string).toLowerCase())
    );
    if (member) assignedTo = [member.id];
  }

  const task = {
    id: generateId(),
    familyId: family.id,
    title: input.title as string,
    description: input.description as string | undefined,
    assignedTo,
    dueDate: input.dueDate as string | undefined,
    priority: (input.priority as string) || 'medium',
    status: 'pending' as const,
    category: (input.category as string) || 'General',
    recurrence: 'none' as const,
    points: (input.points as number) || 50,
    createdAt: now(),
    createdBy: 'ai',
  };
  addTask(task);
  return {
    success: true,
    message: `Task "${task.title}" added${assignedTo ? ` and assigned` : ''}`,
    data: { taskId: task.id, title: task.title },
  };
}

function executeAddShoppingItem(input: Record<string, unknown>): ToolResult {
  const { shoppingLists, addShoppingList, updateShoppingList } =
    (require('../store/useOperationsStore').useOperationsStore as any).getState();
  const family = (require('../store/useFamilyStore').useFamilyStore as any).getState().family;
  if (!family) return { success: false, message: 'No family set up' };

  const newItem = {
    id: generateId(),
    name: input.name as string,
    quantity: (input.quantity as number) || 1,
    unit: input.unit as string | undefined,
    category: (input.category as string) || 'General',
    notes: input.notes as string | undefined,
    isChecked: false,
    addedBy: 'ai',
    addedAt: now(),
  };

  // Add to first active list or create a new one
  const activeList = shoppingLists.find((l: any) => !l.isCompleted);
  if (activeList) {
    updateShoppingList(activeList.id, {
      items: [...(activeList.items || []), newItem],
      updatedAt: now(),
    });
  } else {
    addShoppingList({
      id: generateId(),
      familyId: family.id,
      name: 'Shopping List',
      items: [newItem],
      isCompleted: false,
      createdAt: now(),
      createdBy: 'ai',
    });
  }
  return {
    success: true,
    message: `"${newItem.name}" added to shopping list`,
    data: { itemName: newItem.name },
  };
}

function executeAddCalendarEvent(input: Record<string, unknown>): ToolResult {
  const { addEvent } = (require('../store/useFamilyStore').useFamilyStore as any).getState();
  const family = (require('../store/useFamilyStore').useFamilyStore as any).getState().family;
  if (!family) return { success: false, message: 'No family set up' };

  const event = {
    id: generateId(),
    familyId: family.id,
    title: input.title as string,
    description: input.description as string | undefined,
    startDate: input.startDate as string,
    endDate: input.endDate as string,
    allDay: (input.allDay as boolean) || false,
    location: input.location as string | undefined,
    attendees: [],
    color: '#4A90D9',
    category: (input.category as string) || 'General',
    recurrence: 'none' as const,
    createdAt: now(),
    createdBy: 'ai',
  };
  addEvent(event);
  return {
    success: true,
    message: `Event "${event.title}" added to calendar`,
    data: { eventId: event.id, title: event.title },
  };
}

function executeMarkBillPaid(input: Record<string, unknown>): ToolResult {
  const { bills, markBillPaid } = (require('../store/useFinanceStore').useFinanceStore as any).getState();
  const search = (input.billName as string).toLowerCase();
  const bill = bills.find((b: any) => b.name.toLowerCase().includes(search));
  if (!bill) {
    return {
      success: false,
      message: `No bill found matching "${input.billName}". Available bills: ${bills.map((b: any) => b.name).join(', ')}`,
    };
  }
  markBillPaid(bill.id);
  return {
    success: true,
    message: `${bill.name} ($${bill.amount}) marked as paid`,
    data: { billId: bill.id, billName: bill.name, amount: bill.amount },
  };
}

function executeAddGoal(input: Record<string, unknown>): ToolResult {
  const { addGoal } = (require('../store/useFamilyStore').useFamilyStore as any).getState();
  const family = (require('../store/useFamilyStore').useFamilyStore as any).getState().family;
  if (!family) return { success: false, message: 'No family set up' };

  const goal = {
    id: generateId(),
    familyId: family.id,
    title: input.title as string,
    description: input.description as string | undefined,
    targetAmount: input.targetAmount as number | undefined,
    currentAmount: 0,
    targetDate: input.targetDate as string | undefined,
    category: (input.category as string) || 'General',
    isCompleted: false,
    createdAt: now(),
  };
  addGoal(goal);
  return {
    success: true,
    message: `Goal "${goal.title}" created${goal.targetAmount ? ` (target: $${goal.targetAmount})` : ''}`,
    data: { goalId: goal.id, title: goal.title },
  };
}
