/**
 * Binary min-heap for Dijkstra-style priority queues.
 * Stores items like: { nodeKey, cost }
 */
export class MinCostHeap {
  constructor() {
    this.heap = [];
  }

  get length() {
    return this.heap.length;
  }

  // Items: { nodeKey, cost }; tie-break on nodeKey for stable ordering.
  push(item) {
    this.heap.push(item);
    this.bubbleUp(this.heap.length - 1);
  }

  pop() {
    const h = this.heap;
    if (h.length === 0) return undefined;
    if (h.length === 1) return h.pop();
    const min = h[0];
    h[0] = h.pop();
    this.bubbleDown(0);
    return min;
  }

  parentIndex(i) {
    return (i - 1) >> 1;
  }

  heapLess(a, b) {
    if (a.cost !== b.cost) return a.cost < b.cost;
    return String(a.nodeKey) < String(b.nodeKey);
  }

  bubbleUp(i) {
    const h = this.heap;
    while (i > 0) {
      const p = this.parentIndex(i);
      if (this.heapLess(h[p], h[i])) break;
      [h[p], h[i]] = [h[i], h[p]];
      i = p;
    }
  }

  bubbleDown(i) {
    const h = this.heap;
    const n = h.length;
    while (true) {
      let smallest = i;
      const l = (i << 1) + 1;
      const r = l + 1;
      if (l < n && this.heapLess(h[l], h[smallest])) smallest = l;
      if (r < n && this.heapLess(h[r], h[smallest])) smallest = r;
      if (smallest === i) break;
      [h[i], h[smallest]] = [h[smallest], h[i]];
      i = smallest;
    }
  }
}

