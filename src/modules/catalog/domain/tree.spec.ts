import { Category } from './category.entity';
import { buildTree } from './tree';

describe('buildTree (domain pure function) — DOMAIN-SPEC-1-CATALOG § 1.2', () => {
  const createCategory = (
    id: string,
    name: string,
    slug: string,
    parentId: string | null = null,
  ): Category => {
    return new Category({
      id,
      name,
      slug,
      parentId,
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    });
  };

  it('should return an empty array when given an empty flat list', () => {
    expect(buildTree([])).toEqual([]);
  });

  // Test cases 1 & 5: tree Thời trang → Đồ Nam → {Áo thun, Quần jeans}
  // and the pure tree builder: shuffled flat list → correct tree, siblings in the right order
  it('should correctly assemble tree and sort siblings ascending by ASCII slug even when shuffled', () => {
    const root = createCategory('1', 'Thời trang', 'thoi-trang', null);
    const men = createCategory('2', 'Đồ Nam', 'do-nam', '1');
    const tshirt = createCategory('3', 'Áo thun', 'ao-thun', '2');
    const jeans = createCategory('4', 'Quần jeans', 'quan-jeans', '2');

    // Shuffle order of input items intentionally
    const shuffled = [jeans, root, tshirt, men];

    const tree = buildTree(shuffled);

    expect(tree).toHaveLength(1);

    const rootNode = tree[0];
    expect(rootNode.id).toBe('1');
    expect(rootNode.name).toBe('Thời trang');
    expect(rootNode.slug).toBe('thoi-trang');
    expect(rootNode.parentId).toBeNull();
    expect(rootNode.children).toHaveLength(1);

    const menNode = rootNode.children[0];
    expect(menNode.id).toBe('2');
    expect(menNode.name).toBe('Đồ Nam');
    expect(menNode.slug).toBe('do-nam');
    expect(menNode.parentId).toBe('1');
    expect(menNode.children).toHaveLength(2);

    // R4: Siblings sorted ascending by slug ("ao-thun" < "quan-jeans")
    const firstChild = menNode.children[0];
    const secondChild = menNode.children[1];

    expect(firstChild.name).toBe('Áo thun');
    expect(firstChild.slug).toBe('ao-thun');
    expect(firstChild.children).toHaveLength(0);

    expect(secondChild.name).toBe('Quần jeans');
    expect(secondChild.slug).toBe('quan-jeans');
    expect(secondChild.children).toHaveLength(0);
  });

  it('should handle subtrees where the parent is outside the flat dataset', () => {
    // Subtree for "Đồ Nam" (parent '1' is not included in the dataset)
    const men = createCategory('2', 'Đồ Nam', 'do-nam', '1');
    const tshirt = createCategory('3', 'Áo thun', 'ao-thun', '2');
    const jeans = createCategory('4', 'Quần jeans', 'quan-jeans', '2');

    const tree = buildTree([jeans, men, tshirt]);

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('2');
    expect(tree[0].name).toBe('Đồ Nam');
    expect(tree[0].children).toHaveLength(2);
    expect(tree[0].children[0].slug).toBe('ao-thun');
    expect(tree[0].children[1].slug).toBe('quan-jeans');
  });

  it('should sort multiple root categories ascending by ASCII slug', () => {
    const rootB = createCategory('1', 'Thời trang', 'thoi-trang', null);
    const rootA = createCategory('2', 'Điện máy', 'dien-may', null);
    const rootC = createCategory('3', 'Văn phòng phẩm', 'van-phong-pham', null);

    const tree = buildTree([rootC, rootB, rootA]);

    expect(tree).toHaveLength(3);
    expect(tree[0].slug).toBe('dien-may');
    expect(tree[1].slug).toBe('thoi-trang');
    expect(tree[2].slug).toBe('van-phong-pham');
  });
});
