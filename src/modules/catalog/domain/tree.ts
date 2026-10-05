import { Category } from './category.entity';

/**
 * Hierarchical tree node representing a Category with its nested children.
 * Pure TypeScript domain model with zero framework or ORM dependencies.
 */
export class CategoryNode {
  constructor(
    public readonly category: Category,
    public readonly children: CategoryNode[] = [],
  ) {}

  get id(): string {
    return this.category.id;
  }

  get name(): string {
    return this.category.name;
  }

  get slug(): string {
    return this.category.slug;
  }

  get parentId(): string | null {
    return this.category.parentId;
  }

  get isActive(): boolean {
    return this.category.isActive;
  }

  get createdAt(): Date {
    return this.category.createdAt;
  }

  get updatedAt(): Date {
    return this.category.updatedAt;
  }
}

interface MutableNode {
  category: Category;
  children: MutableNode[];
}

/**
 * Builds a nested category tree from a flat array of categories.
 *
 * Requirements:
 * - Pure function, testable without database (R5).
 * - O(n) linear complexity using Map lookup (R5).
 * - Siblings at every level (including root nodes) sorted ascending by ASCII slug (R4).
 * - Handles both complete trees (parent_id IS NULL at root) and subtrees (parent not in dataset).
 */
export function buildTree(flat: Category[]): CategoryNode[] {
  if (!flat || flat.length === 0) {
    return [];
  }

  // 1. Pass 1: Map all categories by ID for O(1) parent lookups
  const nodeMap = new Map<string, MutableNode>();
  for (const cat of flat) {
    nodeMap.set(cat.id, {
      category: cat,
      children: [],
    });
  }

  // 2. Pass 2: Wire parent-child relationships
  const roots: MutableNode[] = [];
  for (const node of nodeMap.values()) {
    const parentId = node.category.parentId;
    if (parentId && nodeMap.has(parentId)) {
      nodeMap.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // 3. Helper to sort siblings ascending by slug (ASCII order) and freeze into CategoryNode
  const compareBySlug = (a: MutableNode, b: MutableNode): number => {
    if (a.category.slug < b.category.slug) return -1;
    if (a.category.slug > b.category.slug) return 1;
    return 0;
  };

  const toCategoryNode = (node: MutableNode): CategoryNode => {
    node.children.sort(compareBySlug);
    const sortedChildren = node.children.map(toCategoryNode);
    return new CategoryNode(node.category, sortedChildren);
  };

  // Sort root-level siblings and build final tree
  roots.sort(compareBySlug);
  return roots.map(toCategoryNode);
}
