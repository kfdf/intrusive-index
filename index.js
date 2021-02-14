export default function constructorFactory() {
  const UNCHANGED = 0
  const UPDATED = 1
  const RESIZED = 2
  const UNBALANCED = 3
  const l = Symbol('left')
  const r = Symbol('right')
  const d = Symbol('diff')
  function addRight(curr, node, comp, replace) {
    let right = curr[r]
    if (right == null) {
      curr[r] = node
      return (++curr[d] & 3) === 2 ? RESIZED : UPDATED
    } 
    let cmp = comp(right, node)
    let result = UNCHANGED
    if (cmp < 0) {
      result = addRight(right, node, comp, replace)
    } else if (cmp > 0) {
      result = addLeft(right, node, comp, replace)
    } else if (cmp === 0 && replace && right !== node) {
      curr[r] = detachNode(right, node)
    }
    if (result < RESIZED) return result
    if (result === UNBALANCED) {
      curr[r] = right = rotate(right)
      if ((right[d] & 3) === 1) return UPDATED
    }
    let diff = curr[d]
    if ((diff & 3) === 2) return UNBALANCED
    curr[d] = diff + 1
    return (diff & 3) === 1 ? RESIZED : UPDATED
  }  
 
  function addLeft(curr, node, comp, replace) {
    let left = curr[l]
    if (left == null) {
      curr[l] = node
      return ((curr[d] += 3) & 3) === 0 ? RESIZED : UPDATED
    }    
    let cmp = comp(left, node)
    let result = UNCHANGED
    if (cmp < 0) {
      result = addRight(left, node, comp, replace)
    } else if (cmp > 0) {
      result = addLeft(left, node, comp, replace)
    } else if (cmp === 0 && replace && left !== node) {
      curr[l] = detachNode(left, node)
    }
    if (result === UNCHANGED) return UNCHANGED
    let diff = curr[d]
    curr[d] = (diff += 4)
    if (result === UPDATED) return UPDATED
    if (result === UNBALANCED) {
      curr[l] = left = rotate(left)
      if ((left[d] & 3) === 1) return UPDATED
    }
    if ((diff & 3) === 0) return UNBALANCED
    curr[d] = diff - 1
    return (diff & 3) === 1 ? RESIZED : UPDATED
  }  
  let detachedNode = null  
  function detachNode(target, repl) {
    detachedNode = target
    repl[l] = target[l]
    repl[r] = target[r]
    repl[d] = target[d]
    return repl
  }
  function getDetached() {
    let ret = detachedNode
    if (!ret) return ret
    ret[l] = null
    ret[r] = null
    ret[d] = -1
    detachedNode = null
    return ret
  }
  /** 
  @returns {0|1|2|3} */
  function deleteLeft(curr, value, comp) {
    let left = curr[l]
    if (left == null) return UNCHANGED
    let cmp = value === undefined ? comp(left) : comp(left, value)
    /** @type {0|1|2|3} */
    let result = UNCHANGED
    if (cmp > 0) {
      result = deleteLeft(left, value, comp)
    } else if (cmp < 0) {
      result = deleteRight(left, value, comp)
    } else if (cmp === 0) {
      let ll = left[l]
      let lr = left[r]
      if (ll && lr) {
        let size = left[d] >>> 2
        result = deleteLeftAt(left, size - 1)
        curr[l] = left = detachNode(left, detachedNode)
      } else {
        detachedNode = left
        curr[l] = left = ll || lr
        result = RESIZED
      }
    } 
    if (result === UNCHANGED) return UNCHANGED
    curr[d] -= 4
    if (result === UPDATED) return UPDATED  
    return deleteLeftFix(curr, result)
  }  
  /** 
  @returns {1|2|3} */
  function deleteLeftAt(curr, pos) {
    let left = curr[l]
    let size = left[d] >>> 2
    /** @type {1|2|3} */
    let result = UNCHANGED
    if (size > pos) {
      result = deleteLeftAt(left, pos)
    } else if (size < pos) {
      result = deleteRightAt(left, pos - size - 1)
    } else if (left[l] && left[r]) {
      result = deleteLeftAt(left, size - 1)
      curr[l] = left = detachNode(left, detachedNode)
    } else {
      detachedNode = left
      curr[l] = left = left[l] || left[r]
      result = RESIZED
    }
    curr[d] -= 4
    if (result === UPDATED) return UPDATED  
    return deleteLeftFix(curr, result)
  }  
  /**
  @param {2|3} result */
  function deleteLeftFix(curr, result) {
    if (result === UNBALANCED) {
      let left = rotate(curr[l]) 
      curr[l] = left
      if ((left[d] & 3) != 1) return UPDATED
    }
    let diff = curr[d]
    if ((diff & 3) === 2) return UNBALANCED
    curr[d] = diff + 1
    return (diff & 3) === 1 ? UPDATED : RESIZED
  }  
  /** 
  @returns {1|2|3} */
  function deleteRightAt(curr, pos) {
    let right = curr[r]
    let size = right[d] >>> 2
    /** @type {1|2|3} */
    let result = UNCHANGED
    if (size > pos) {
      result = deleteLeftAt(right, pos)
    } else if (size < pos) {
      result = deleteRightAt(right, pos - size - 1)
    } else if (right[l] && right[r]) {
      result = deleteLeftAt(right, size - 1)
      curr[r] = right = detachNode(right, detachedNode)
    } else {
      detachedNode = right
      curr[r] = right = right[l] || right[r]
      result = RESIZED
    }
    if (result === UPDATED) return UPDATED
    return deleteRightFix(curr, result)
  }
  /** 
  @returns {0|1|2|3} */
  function deleteRight(curr, value, comp) {
    let right = curr[r]
    if (right == null) return UNCHANGED  
    let cmp = value === undefined ? comp(right) : comp(right, value)
    /** @type {0|1|2|3} */
    let result = UNCHANGED
    if (cmp > 0) {
      result = deleteLeft(right, value, comp)
    } else if (cmp < 0) {
      result = deleteRight(right, value, comp)
    } else if (cmp === 0) {
      let rl = right[l]
      let rr = right[r]
      if (rl && rr) {
        let size = right[d] >>> 2
        result = deleteLeftAt(right, size - 1)
        curr[r] = right = detachNode(right, detachedNode)
      } else {
        detachedNode = right
        curr[r] = right = rl || rr
        result = RESIZED
      }
    }
    if (result === UNCHANGED) return UNCHANGED
    if (result === UPDATED) return UPDATED
    return deleteRightFix(curr, result)
  }
  /** 
  @param {2|3} result */
  function deleteRightFix(curr, result) {
    if (result === UNBALANCED) {
      let right = rotate(curr[r])
      curr[r] = right
      if ((right[d] & 3) != 1) return UPDATED
    }
    let diff = curr[d]
    if ((diff & 3) === 0) return UNBALANCED
    curr[d] = diff - 1
    return (diff & 3) === 1 ? UPDATED : RESIZED
  }  

  function rotate(node) {
    if ((node[d] & 3) === 2) {
  //    2+                    0       
  // |x|    1             2    |x|    
  //     |x| |x|       |x| |x| |1|    
  //     |1| |1|           |1|        
  // ---------------------------------
  //    2+                    1       
  // |x|    2             1    |x|    
  //     |x| |x|       |x| |x| |1|    
  //         |1|                      
      let right = node[r]
      let diff = right[d] & 3
      let nodeSize = node[d] & ~3
      if (diff >= 1) {
        if (diff === 2) {
          node[d] = nodeSize | 1
          right[d] = right[d] & ~3 | 1
        } else {
          node[d] = nodeSize | 2
          right[d] = right[d] & ~3
        }
        node[r] = right[l]
        right[l] = node
        right[d] += nodeSize + 4
        return right
      } else {
  //    2+                    1       
  // |x|        0         ?       ?   
  //        ?    |x|   |x| |x? |x? |x|
  //     |x? |x?                      
        let left = right[l]
        let diff = left[d] & 3
        if (diff === 2) {
          node[d] = nodeSize
          right[d] = right[d] & ~3 | 1
        } else if (diff === 0) {
          node[d] = nodeSize | 1
          right[d] = right[d] & ~3 | 2
        } else {
          node[d] = nodeSize | 1
          right[d] = right[d] & ~3 | 1
        }
        left[d] = left[d] & ~3 | 1
        node[r] = left[l]
        right[l] = left[r]
        left[l] = node
        left[r] = right
        right[d] -= (left[d] & ~3) + 4
        left[d] += nodeSize + 4
        return left
      }
    } else {
  //        0-             2           
  //    1    |x|       |x|    0       
  // |x| |x|           |1| |x| |x|    
  // |1| |1|               |1|        
  // ---------------------------------
  //        0-             1           
  //   0     |x|       |x|    1       
  // |x| |x|           |1| |x| |x|    
  // |1|                              
      let left = node[l]
      let leftD = left[d]
      let leftSize = leftD & ~3
      let diff = leftD & 3
      if (diff <= 1) {
        if (diff === 0) {
          left[d] = leftSize | 1
          node[d] = node[d] & ~3 | 1
        } else {
          left[d] = leftSize | 2
          node[d] = node[d] & ~3
        }
        node[l] = left[r]
        left[r] = node
        node[d] -= leftSize + 4
        return left
      } else {
  //               0-            1       
  //       2        |x|      ?       ?   
  //    |x|    ?          |x| |x? |x? |x|
  //        |x? |x?                      
        let right = left[r]
        let diff = right[d] & 3
        if (diff === 2) {
          node[d] = node[d] & ~3 | 1
          left[d] = leftSize
        } else if (diff === 0) {
          node[d] = node[d] & ~3 | 2
          left[d] = leftSize | 1
        } else {
          node[d] = node[d] & ~3 | 1
          left[d] = leftSize | 1
        }
        right[d] = right[d] & ~3 | 1
        left[r] = right[l]
        node[l] = right[r]
        right[l] = left
        right[r] = node
        right[d] += leftSize + 4
        node[d] -= (right[d] & ~3) + 4
        return right
      }
    }
  }
  class RangeIterator extends IndexIterator {
    constructor(root, start, end, reversed) {
      super()
      let nodes = []
      this.nodes = nodes
      this.reversed = reversed
      this.start = start
      this.end = end
      let offset = 0
      while (root) {
        let size = root[d] >>> 2
        let pos = offset + size
        if (pos < start) {
          offset += size + 1
          root = root[r]
        } else if (pos >= end) {
          root = root[l]
        } else {
          let target = reversed ? end - 1 : start
          while (true) {
            if (pos < target) {
              offset += size + 1
              if (reversed) nodes.push(root)
              root = root[r]
            } else if (pos > target) {
              if (!reversed) nodes.push(root)
              root = root[l]
            } else {
              nodes.push(root)
              root = null
            }
            if (!root) {
              if (reversed) this.end = pos + 1
              else this.start = pos
              return
            }
            size = root[d] >>> 2
            pos = offset + size
          }          
        }
      }   
    }
    moveNext() {
      if (this.start++ >= this.end) {
        this.current = undefined
        return false
      }
      let { nodes, current, reversed } = this
      if (current) {
        let lt = reversed ? r : l
        current = current[reversed ? l : r]
        while (current) {
          nodes.push(current)
          current = current[lt]
        }        
      }
      this.current = current = nodes.pop()
      return current !== undefined      
    }
  }
  class PredicateIterator extends IndexIterator {
    constructor(root, comp, reversed) {
      super()
      let nodes = []
      this.nodes = nodes
      this.reversed = reversed
      this.comp = comp
      let lt = reversed ? r : l
      while (root) {
        let cmp = comp(root)
        if (cmp < 0) {
          root = root[r]
        } else if (cmp > 0) {
          root = root[l]
        } else if (cmp === 0) {
          nodes.push(root)
          root = root[lt]
        } else break
      }  
    }
    setNext(predicate) {
      let { current, nodes, reversed } = this
      this.current = undefined
      let dt, lt, rt
      if (reversed) dt = -1, lt = r, rt = l
      else dt = 1, lt = l, rt = r
      while (nodes.length) {
        let top = nodes.pop()
        if (predicate(top) * dt >= 0) {
          nodes.push(top)
          break
        }
        current = top
      }
      if (!current) return
      current = current[rt]
      if (nodes.length === 0) {
        let { comp } = this
        while (current) {
          if (predicate(current) * dt < 0) {
            current = current[rt]
          } else if (comp(current) === 0) {
            nodes.push(current)
            current = current[lt]
            break
          } else {
            current = current[lt]
          }
        }
      }
      while (current) {
        if (predicate(current) * dt >= 0) {
          nodes.push(current)
          current = current[lt]
        } else {
          current = current[rt]
        }
      }
    }
    moveNext() {
      let { nodes, current, comp, reversed } = this
      if (current) {
        let lt = reversed ? r : l
        current = current[reversed ? l : r]
        while (current) {
          if (nodes.length || comp(current) === 0) {
            nodes.push(current)
          }
          current = current[lt]
        }
      }
      this.current = current = nodes.pop()
      return current !== undefined
    }  
  }
  return class IntrusiveIndex {
    constructor(comp) {
      this.comp = comp
      this.root = { [l]: null, [r]: null, [d]: 1 }
      this.tempRoot = null
    }
    get size() {
      return this.root[d] >>> 2
    }
    setRoot(root) {
      this.tempRoot = root
    }
    clear() {
      let { root } = this
      root[l] = null
      root[r] = null
      root[d] = 1
    }
    add(value) {
      let { root, comp } = this
      value[l] = null
      value[r] = null
      value[d] = 1
      return !!addLeft(root, value, comp, false)
    }
    insert(value) {
      let { root, comp } = this
      value[l] = null
      value[r] = null
      value[d] = 1
      detachedNode = null
      addLeft(root, value, comp, true)
      return getDetached()
    }
    delete(value) {
      let { root, comp } = this
      detachedNode = null
      if (typeof value === 'function') {
        deleteLeft(root, undefined, value)
      } else {
        deleteLeft(root, value, comp)
      }
      return getDetached()
    }
    deleteAt(pos) {
      let { root, size } = this
      if (pos < 0 || pos >= size) return null
      detachedNode = null
      deleteLeftAt(root, pos)
      return getDetached()
    }
    get(value) {
      let node = this.tempRoot || this.root[l]
      let { comp } = this
      let isComp = typeof value === 'function'
      while (node) {
        let cmp = isComp? value(node) : comp(node, value)
        if (cmp < 0) node = node[r]
        else if (cmp > 0) node = node[l]
        else if (cmp === 0) return node
        else break
      }
    }  
    getAt(pos) {
      let node = this.tempRoot || this.root[l]      
      while (node) {
        let size = node[d] >>> 2
        if (pos < size) {
          node = node[l]
        } else if (pos > size) {
          pos -= size + 1
          node = node[r]
        } else {
          return node
        }
      }
    } 
    findRange(value, option) {
      let node = this.tempRoot || this.root[l]
      let { comp } = this
      let isComp = typeof value === 'function'
      if (option === undefined) {
        option = isComp ? 'full' : 'any'
      }
      let end = 0
      let start = -1
      let preStart = undefined
      let atStart = undefined
      let preEnd = undefined
      let atEnd = undefined
      loop:
      while (node) {
        let cmp = isComp ? 
          value(node) : comp(node, value)
        if (cmp > 0) {
          atEnd = node
          node = node[l]
          continue
        } 
        if (start === -1 && cmp === 0) {
          let nodePos = end + (node[d] >>> 2)
          preStart = preEnd // !!
          if (option === 'any') {
            start = nodePos
            end = nodePos + 1
            atStart = node
            preEnd = node
            break loop
          }
          start = nodePos
          atStart = node
          if (option !== 'end') {
            let offset = end
            let node2 = node[l]
            while (node2) {
              let cmp = isComp ? 
                value(node2) : comp(node2, value)
              if (cmp < 0) {
                offset += (node2[d] >>> 2) + 1
                preStart = node2
                node2 = node2[r]
              } else {
                start = offset + (node2[d] >>> 2)
                atStart = node2
                node2 = node2[l]
              }
            }
            if (option === 'start') {
              end = nodePos + 1
              preEnd = node
              break loop
            }
          }
        }
        end += (node[d] >>> 2) + 1
        preEnd = node
        node = node[r]
      }
      if (start === -1) {
        start = end
        preStart = preEnd
        atStart = atEnd
      }
      return {
        start, end, 
        preStart, atStart, 
        preEnd, atEnd 
      }
    } 

    enumerate(a, b, c) {
      let node = this.tempRoot || this.root[l]
      if (typeof a === 'function') {
        return new PredicateIterator(node, a, b === 'desc')
      } else if (typeof a !== 'number') {
        return new RangeIterator(node, 0, Infinity, a === 'desc')
      } else if (typeof b !== 'number') {
        return new RangeIterator(node, a, Infinity, b === 'desc')
      } else {
        return new RangeIterator(node, a, b, c === 'desc')
      }
    }
    into(func) {
      return func(this)
    }
    static get l() {
      return l
    }
    static get r() {
      return r
    }
    static get d() {
      return d
    }
  }
}

export class IndexIterator {
  constructor() {
    this.current = undefined
  }
  moveNext() {
    return false
  }
  next() {
    let done = !this.moveNext()
    let value = this.current
    return { done, value }
  }
  [Symbol.iterator]() {
    return this
  }
  map(transform) {
    return new MapIterator(this, transform)
  }
  filter(predicate) {
    return new FilterIterator(this, predicate)
  }
  flatten() {
    return new FlattenIterator(this)
  }
  range(start, end) {
    return new RangeIterator(this, start, end)
  }
  skip(count) {
    return new SkipIterator(this, count)
  }
  take(count) {
    return new TakeIterator(this, count)
  }
  fallback(value) {
    return new FallbackIterator(this, value)
  }
  segment(comparator) {
    return new GroupsIterator(this, comparator)
  }
  sort(comparator) {
    return new SortIterator(this, comparator)
  }
  reverse() {
    return new ReverseIterator(this)
  }
  group(comparator) {
    return this.sort(comparator).segment(comparator)
  }
  concat(value) {
    return IndexIterator.from([this, value]).flatten()
  }
  into(func) {
    return func(this)
  }
  reduce(callback, value) {
    if (value === undefined) {
      this.moveNext()
      value = this.current
    }
    while (this.moveNext()) {
      value = callback(value, this.current)
    }
    return value
  }
  forEach(callback) {
    while (this.moveNext()) {
      callback(this.current)
    }
  }
  toArray() {
    let ret = []
    while (this.moveNext()) {
      ret.push(this.current)
    }
    return ret
  }
  static from(iterable) {
    if (iterable.moveNext) {
      return iterable
    } else {
      return new WrapperIterator(iterable)
    }
  }
}

class WrapperIterator extends IndexIterator {
  constructor(iterable) {
    super()
    this.rator = iterable[Symbol.iterator]()
  }
  moveNext() {
    if (this.rator === null) return false
    let { done, value } = this.rator.next()
    if (done) {
      this.current = undefined
      this.rator = null
      return false
    } else {
      this.current = value
      return true
    }
  }
}

class MapIterator extends IndexIterator {
  constructor(rator, transform) {
    super()
    this.rator = rator
    this.transform = transform
  }
  moveNext() {
    let { rator, transform } = this
    let ret = rator.moveNext()
    this.current = ret ? transform(rator.current) : undefined
    return ret
  }
}
class FilterIterator extends IndexIterator {
  constructor(rator, predicate) {
    super()
    this.rator = rator
    this.predicate = predicate
  }
  moveNext() {
    let { rator, predicate } = this
    while (rator.moveNext()) {
      if (!predicate(rator.current)) continue
      this.current = rator.current
      return true
    }
    this.current = undefined
    return false
  }
}
class FlattenIterator extends IndexIterator {
  constructor(rator) {
    super()
    this.rator = rator
    this.inner = null
  }
  moveNext() {
    while (true) {
      if (this.inner) {
        if (this.inner.moveNext()) {
          this.current = this.inner.current
          return true
        } else {
          this.inner = null
        }
      }
      if (this.rator.moveNext()) {
        let { current } = this.rator
        if (current[Symbol.iterator]) {
          this.inner = IndexIterator.from(current)
        } else {
          this.current = current
          return true
        }
      } else {
        this.current = undefined
        return false
      }
    }
  }
}
class SkipIterator extends IndexIterator {
  constructor(rator, count) {
    super()
    this.rator = rator
    this.count = Math.max(0, count)
  }  
  moveNext() {
    let { rator } = this
    while (this.count !== 0) {
      this.count--
      if (!rator.moveNext()) return false
    }
    let ret = rator.moveNext()
    this.current = rator.current
    return ret
  }
}
class TakeIterator extends IndexIterator {
  constructor(rator, count) {
    super()
    this.rator = rator
    this.count = Math.max(0, count)
  }  
  moveNext() {
    let { rator } = this
    if (this.count === 0) {
      this.current = undefined
      return false
    }
    this.count--
    let ret = rator.moveNext()
    this.current = rator.current
    return ret
  }
}
class FallbackIterator extends IndexIterator {
  constructor(rator, value) {
    super()
    this.rator = rator
    this.value = value
  }
  moveNext() {
    let { rator, value } = this
    if (value === undefined) {
      let ret = rator.moveNext()
      this.current = rator.current
      return ret
    }
    this.value = undefined
    this.current = rator.moveNext() ? rator.current : value
    return true
  }
}
class BufferedIterator extends IndexIterator {
  constructor(rator) {
    super()
    this.rator = rator
    this.buffer = null
    this.pos = 0
  }
  moveNext() {
    let { buffer, pos } = this
    if (buffer === null) {
      this.init()
      if ((buffer = this.buffer) === null) return false
    }
    if (pos < buffer.length) {
      this.pos = pos + 1
      this.current = buffer[pos]
      buffer[pos] = undefined
      return true
    } 
    this.current = undefined
    this.buffer = null
    this.rator = null
    return false
  }  
  toArray() {
    this.init()
    let { buffer, pos } = this
    if (buffer === null) return []
    this.buffer = null
    this.rator = null
    if (pos > 0) buffer.splice(0, pos)
    return buffer
  } 
}
class GroupsIterator extends IndexIterator {
  constructor(rator, comparator) {
    super()
    this.rator = rator
    this.comparator = comparator
  }
  moveNext() {
    let { current, rator, comparator } = this
    let first = undefined
    if (current) {
      current.init()
      first = current.first
    } else if (rator.moveNext()) {
      first = rator.current
    }
    if (first === undefined) {
      this.current = undefined
      return false
    } else {
      this.current = new GroupIterator(rator, comparator, first)
      return true
    }
  }
}
class SortIterator extends BufferedIterator {
  constructor(rator, comparator) {
    super(rator)
    this.comparator = comparator
  }
  init() {
    if (this.buffer || !this.rator) return
    this.buffer = this.rator
      .toArray().sort(this.comparator)
  }
}
class ReverseIterator extends BufferedIterator {
  init() {
    if (this.buffer || !this.rator) return
    this.buffer = this.rator
      .toArray().reverse()
  }
}
class GroupIterator extends BufferedIterator {
  constructor(rator, comparator, first) {
    super(rator)
    this.comparator = comparator
    this.first = first   
    // this.superMoveNext = BufferedIterator.prototype.moveNext 
  }
  init() {
    if (this.buffer || !this.rator) return
    let { current, rator } = this
    let buffer = []
    while (this.moveNext()) {
      buffer.push(this.current)
    }
    this.current = current
    this.rator = rator
    this.buffer = buffer
  }
  moveNext() {
    if (this.buffer !== null) {
      // return super.moveNext()
      // return this.superMoveNext()
      let { buffer, pos } = this
      if (pos < buffer.length) {
        this.pos = pos + 1
        this.current = buffer[pos]
        buffer[pos] = undefined
        return true
      }
      this.current = undefined
      this.buffer = null
      this.rator = null
      return false
    }
    let { rator, comparator, first } = this
    if (this.current !== undefined) {
      let hasNext = rator.moveNext()
      if (hasNext && comparator(first, rator.current) === 0) {
        this.current = rator.current
        return true
      }
      this.first = hasNext ? rator.current : undefined
      this.rator = null
      this.current = undefined
      return false
    } else if (rator !== null) {
      this.current = this.first
      return true
    } else {
      return false
    }
  }
}

export const IIA = constructorFactory()
export const IIB = constructorFactory()
export const IIC = constructorFactory()
export const IID = constructorFactory()
export const IIE = constructorFactory()
export const IIF = constructorFactory()

let factoryCount = 0
export function createFactory() {
  let source = constructorFactory.toString()
  let start = source.indexOf('{') + 1
  let end = source.lastIndexOf('}') 
  let body = source.slice(start, end)
  body = '/*' + factoryCount++ + '*/' + body
  let factory = new Function(IndexIterator.name, body)
  return () => factory(IndexIterator)  
}

export class TransactionBase {
  constructor() {
    this.journal = {
      savepoints: [],
      indexes: [],
      removals: [],
      inserts: [],
    }
  }
  add(index, item) {
    if (!index.add(item)) return false
    let { indexes, removals, inserts } = this.journal
    indexes.push(index)
    removals.push(null)
    inserts.push(item)
    return true
  }  
  insert(index, item) {
    let removed = index.insert(item)
    let { indexes, removals, inserts } = this.journal
    indexes.push(index)
    removals.push(removed)
    inserts.push(item)    
    return removed
  }
  delete(index, item) {
    let removed = index.delete(item)
    if (!removed) return null
    let { indexes, removals, inserts } = this.journal
    indexes.push(index)
    removals.push(removed)
    inserts.push(null)        
    return removed
  }
  deleteAt(index, pos) {
    let removed = index.deleteAt(pos)
    if (!removed) return null
    let { indexes, removals, inserts } = this.journal
    indexes.push(index)
    removals.push(removed)
    inserts.push(null)      
    return removed
  }
  savepoint() {
    let { indexes, savepoints } = this.journal
    savepoints.push(indexes.length)
  }  
  release() {
    this.journal.savepoints.pop()
  }  
  rollback() {
    let { indexes, removals, inserts, savepoints } = this.journal
    let savepoint = savepoints.pop() || 0
    while (indexes.length > savepoint) {
      let index = indexes.pop()
      let removed = removals.pop()
      let inserted = inserts.pop()
      let current
      if (inserted && removed) {
        current = index.insert(removed)
      } else if (inserted) {
        current = index.delete(inserted)
      } else if (removed) {
        current = index.insert(removed)
      }
      if (current !== inserted) return false
    }
    return true
  }
}
