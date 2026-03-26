/**
 * Tests for MinCostHeap utility
 */
import { MinCostHeap } from "../../src/utils/MinCostHeap";

describe("MinCostHeap", () => {
  it("pop() returns undefined for an empty heap", () => {
    const heap = new MinCostHeap();
    expect(heap.pop()).toBeUndefined();
    expect(heap.length).toBe(0);
  });

  it("orders items by lowest cost first", () => {
    const heap = new MinCostHeap();
    heap.push({ nodeKey: "x", cost: 10 });
    heap.push({ nodeKey: "y", cost: 3 });
    heap.push({ nodeKey: "z", cost: 7 });

    expect(heap.length).toBe(3);
    expect(heap.pop()).toEqual({ nodeKey: "y", cost: 3 });
    expect(heap.pop()).toEqual({ nodeKey: "z", cost: 7 });
    expect(heap.pop()).toEqual({ nodeKey: "x", cost: 10 });
    expect(heap.length).toBe(0);
  });

  it("breaks ties by lexicographic nodeKey (string comparison)", () => {
    const heap = new MinCostHeap();
    heap.push({ nodeKey: "b", cost: 5 });
    heap.push({ nodeKey: "a", cost: 5 });
    heap.push({ nodeKey: "c", cost: 5 });

    expect(heap.pop()).toEqual({ nodeKey: "a", cost: 5 });
    expect(heap.pop()).toEqual({ nodeKey: "b", cost: 5 });
    expect(heap.pop()).toEqual({ nodeKey: "c", cost: 5 });
  });

  it("maintains correct ordering after multiple push/pop operations", () => {
    const heap = new MinCostHeap();
    heap.push({ nodeKey: 3, cost: 20 });
    heap.push({ nodeKey: 1, cost: 10 });
    heap.push({ nodeKey: 2, cost: 15 });

    expect(heap.pop()).toEqual({ nodeKey: 1, cost: 10 });
    heap.push({ nodeKey: 0, cost: 5 });

    expect(heap.pop()).toEqual({ nodeKey: 0, cost: 5 });
    expect(heap.pop()).toEqual({ nodeKey: 2, cost: 15 });
    expect(heap.pop()).toEqual({ nodeKey: 3, cost: 20 });
    expect(heap.pop()).toBeUndefined();
  });
});

