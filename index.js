export default function constructorFactory() {
  const UNC = 0
  const UPD = 1
  const RES = 2
  const ROT = 3
  const l = Symbol('left')
  const r = Symbol('right')
  const d = Symbol('diff')
  function addRight(curr, node, comp, replace) {
    let right = curr[r]
    if (right == null) {
      curr[r] = node
      return (++curr[d] & 3) === 2 ? RES : UPD
    } 
    let cmp = comp(right, node)
    let result = UNC
    if (cmp < 0) {
      result = addRight(right, node, comp, replace)
    } else if (cmp > 0) {
      result = addLeft(right, node, comp, replace)
    } else if (cmp === 0 && replace && right !== node) {
      curr[r] = detachNode(right, node)
    }
    if (result <= UPD) return result
    if (result === ROT) {
      curr[r] = rotate(right)
      return UPD
    }
    let diff = curr[d]
    if ((diff & 3) === 2) return ROT
    curr[d] = diff + 1
    return (diff & 3) === 1 ? RES : UPD
  }  
 
  function addLeft(curr, node, comp, replace) {
    let left = curr[l]
    if (left == null) {
      curr[l] = node
      return ((curr[d] += 3) & 3) === 0 ? RES : UPD
    }    
    let cmp = comp(left, node)
    let result = UNC
    if (cmp < 0) {
      result = addRight(left, node, comp, replace)
    } else if (cmp > 0) {
      result = addLeft(left, node, comp, replace)
    } else if (cmp === 0 && replace && left !== node) {
      curr[l] = detachNode(left, node)
    }
    if (result === UNC) return UNC
    let diff = curr[d]
    curr[d] = (diff += 4)
    if (result === UPD) return UPD
    if (result === ROT) {
      curr[l] = left = rotate(left)
      return UPD
    }
    if ((diff & 3) === 0) return ROT
    curr[d] = diff - 1
    return (diff & 3) === 1 ? RES : UPD
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
    if (ret == null) return ret
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
    if (left == null) return UNC
    let cmp = value === undefined ? comp(left) : comp(left, value)
    /** @type {0|1|2|3} */
    let result = UNC
    if (cmp > 0) {
      result = deleteLeft(left, value, comp)
    } else if (cmp < 0) {
      result = deleteRight(left, value, comp)
    } else if (cmp === 0) {
      let ll = left[l]
      let lr = left[r]
      if (ll != null && lr != null) {
        let size = left[d] >>> 2
        result = deleteLeftAt(left, size - 1)
        curr[l] = left = detachNode(left, detachedNode)
      } else {
        detachedNode = left
        curr[l] = left = ll == null ? lr : ll
        result = RES
      }
    } 
    if (result === UNC) return UNC
    curr[d] -= 4
    if (result === UPD) return UPD  
    return deleteLeftFix(curr, result)
  }  
  /** 
  @returns {1|2|3} */
  function deleteLeftAt(curr, offset) {
    let left = curr[l]
    let size = left[d] >>> 2
    /** @type {1|2|3} */
    let result = UNC
    if (size > offset) {
      result = deleteLeftAt(left, offset)
    } else if (size < offset) {
      result = deleteRightAt(left, offset - size - 1)
    } else if (size === offset) {
      let ll = left[l]
      let lr = left[r]
      if (ll != null && lr != null) {
        result = deleteLeftAt(left, size - 1)
        curr[l] = left = detachNode(left, detachedNode)
      } else {
        detachedNode = left
        curr[l] = left = ll == null ? lr : ll
        result = RES
      }
    } 
    if (result === UNC) return UNC
    curr[d] -= 4
    if (result === UPD) return UPD  
    return deleteLeftFix(curr, result)
  }  
  /**
  @param {2|3} result */
  function deleteLeftFix(curr, result) {
    if (result === ROT) {
      let left = rotate(curr[l]) 
      curr[l] = left
      if ((left[d] & 3) !== 1) return UPD
    }
    let diff = curr[d]
    if ((diff & 3) === 2) return ROT
    curr[d] = diff + 1
    return (diff & 3) === 1 ? UPD : RES
  }  
  /** 
  @returns {1|2|3} */
  function deleteRightAt(curr, offset) {
    let right = curr[r]
    let size = right[d] >>> 2
    /** @type {1|2|3} */
    let result = UNC
    if (size > offset) {
      result = deleteLeftAt(right, offset)
    } else if (size < offset) {
      result = deleteRightAt(right, offset - size - 1)
    } else if (size === offset) {
      let rl = right[l]
      let rr = right[r]
      if (rl != null && rr != null) {
        result = deleteLeftAt(right, size - 1)
        curr[r] = right = detachNode(right, detachedNode)
      } else {
        detachedNode = right
        curr[r] = right = rl == null ? rr : rl
        result = RES
      }
    }
    if (result <= UPD) return result
    return deleteRightFix(curr, result)
  }
  /** 
  @returns {0|1|2|3} */
  function deleteRight(curr, value, comp) {
    let right = curr[r]
    if (right == null) return UNC  
    let cmp = value === undefined ? comp(right) : comp(right, value)
    /** @type {0|1|2|3} */
    let result = UNC
    if (cmp > 0) {
      result = deleteLeft(right, value, comp)
    } else if (cmp < 0) {
      result = deleteRight(right, value, comp)
    } else if (cmp === 0) {
      let rl = right[l]
      let rr = right[r]
      if (rl != null && rr != null) {
        let size = right[d] >>> 2
        result = deleteLeftAt(right, size - 1)
        curr[r] = right = detachNode(right, detachedNode)
      } else {
        detachedNode = right
        curr[r] = right = rl == null ? rr : rl
        result = RES
      }
    }
    if (result <= UPD) return result
    return deleteRightFix(curr, result)
  }
  /** 
  @param {2|3} result */
  function deleteRightFix(curr, result) {
    if (result === ROT) {
      let right = rotate(curr[r])
      curr[r] = right
      if ((right[d] & 3) !== 1) return UPD
    }
    let diff = curr[d]
    if ((diff & 3) === 0) return ROT
    curr[d] = diff - 1
    return (diff & 3) === 1 ? UPD : RES
  }  

  function rotate(node) {
    if ((node[d] & 3) === 2) {
//    2+                    0  
// |x|    1             2    |x| 
//     |x| |x|       |x| |x| |1| 
//     |1| |1|           |1| 
//-------------------------------
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
//-------------------------------
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
//            0-            1       
//    2        |x|      ?       ?   
// |x|    ?          |x| |x? |x? |x|
//     |x? |x?                      
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
  function findRangeV8Plz(isComp, value, part, 
    from, start, preStart, atStart, end, 
    preEnd, atEnd, root, rootOffset, rootBase
  ) {
    if (start === -1) {
      start = end
      preStart = preEnd
      atStart = atEnd
    } else if (part === 'any') {
      end = rootOffset + 1
      preEnd = root
    } else if (part !== 'end') {
      let base = rootBase
      let node = root[l]
      while (node) {
        let offset = base + (node[d] >>> 2)
        let cmp = from !== undefined && offset < from ? -1 :
          isComp ? value(node) : comp(node, value)
        if (cmp >= 0) {
          start = offset
          atStart = node
          node = node[l]
        } else {
          base = offset + 1
          preStart = node
          node = node[r]
        }
      }
      if (part === 'start') {
        end = rootOffset + 1
        preEnd = root
      }
    }
    return {
      start, preStart, atStart, 
      end, preEnd, atEnd,
      rootBase, root, rootOffset,
    }    
  }
  class RangeIterator extends IndexIterator {
    constructor(root, start, end, reversed) {
      super()
      let nodes = []
      this.nodes = nodes
      this.reversed = reversed
      this.count = 0
      this.following = null
      let base = 0
      while (root != null) {
        let size = root[d] >>> 2
        let offset = base + size
        if (offset < start) {
          base = offset + 1
          root = root[r]
        } else if (offset >= end) {
          root = root[l]
        } else {
          let target = reversed ? end - 1 : start
          while (true) {
            if (offset < target) {
              base = offset + 1
              if (reversed) nodes.push(root)
              root = root[r]
            } else if (offset > target) {
              if (!reversed) nodes.push(root)
              root = root[l]
            } else {
              nodes.push(root)
              root = null
            }
            if (root == null) {
              this.count = reversed ?
                offset + 1 - start : end - offset
              return
            }
            size = root[d] >>> 2
            offset = base + size
          }          
        }
      }   
    }
    nextValue() {
      if (--this.count < 0) return
      let { nodes, following, reversed } = this
      while (following) {
        nodes.push(following)
        following = following[reversed ? r : l]
      }       
      let ret = nodes.pop()
      if (ret === undefined) return
      this.following = ret[reversed ? l : r]
      return ret
    }
  }
  class CompIterator extends IndexIterator {
    constructor(root, comp, reversed) {
      super()
      let nodes = []
      this.nodes = nodes
      this.reversed = reversed
      this.comp = comp
      this.following = null
      while (root) {
        let cmp = comp(root)
        if (cmp < 0) {
          root = root[r]
        } else if (cmp > 0) {
          root = root[l]
        } else if (cmp === 0) {
          nodes.push(root)
          root = root[reversed ? r : l]
        } else break
      }  
    }
    nextValue() {
      let { nodes, following, comp, reversed } = this
      while (following != null) {
        if (nodes.length || comp(following) === 0) {
          nodes.push(following)
        }
        following = following[reversed ? r : l]
      }
      let ret = nodes.pop()
      if (ret === undefined) return
      this.following = ret[reversed ? l : r]
      return ret
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
    deleteAt(offset) {
      let { root, size } = this
      if (offset < 0 || offset >= size) return null
      detachedNode = null
      deleteLeftAt(root, offset)
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
    getAt(offset) {
      let node = this.tempRoot || this.root[l]      
      while (node) {
        let size = node[d] >>> 2
        if (offset < size) {
          node = node[l]
        } else if (offset > size) {
          offset -= size + 1
          node = node[r]
        } else {
          return node
        }
      }
    } 
    findRange(value, part, from, upto) {
      let node = this.tempRoot || this.root[l]
      let { comp } = this
      let isComp = typeof value === 'function'
      if (part === undefined) {
        part = isComp ? 'full' : 'any'
      }
      if (from === undefined) {
        if (upto !== undefined) from = 0
      } else {
        if (upto === undefined) upto = Infinity
      }
      let end = 0
      let start = -1
      let rootOffset = -1
      let rootBase = 0
      let root = undefined
      let preStart = undefined
      let atStart = undefined
      let preEnd = undefined
      let atEnd = undefined
      while (node != null) {
        let offset
        let cmp 
        if (from !== undefined) {
          offset = end + (node[d] >>> 2)
          cmp = offset < from ? -1 : offset >= upto ? 1 :
            isComp ? value(node) : comp(node, value)
          if (cmp > 0) {
            atEnd = node
            node = node[l]
            continue
          }               
        } else {
          cmp = isComp ? value(node) : comp(node, value)
          if (cmp > 0) {
            atEnd = node
            node = node[l]
            continue
          }  
          offset = end + (node[d] >>> 2)
        }
        if (start === -1 && cmp === 0) {
          root = atStart = node
          rootOffset = start = offset
          rootBase = end
          preStart = preEnd // !!
          if (part === 'any' || part === 'start') break
        }
        end = offset + 1
        preEnd = node
        node = node[r]
      }
      return findRangeV8Plz(isComp, value, part,
        from, start, preStart, atStart, end, 
        preEnd, atEnd, root, rootOffset, rootBase)
    } 

    enumerate(a, b, c) {
      let node = this.tempRoot || this.root[l]
      if (typeof a === 'function') {
        return new CompIterator(node, a, b === 'desc')
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
  nextValue() { }
  next() {
    let value = this.nextValue()
    let done = value === undefined
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
    return new ArrayIterator([this, value]).flatten()
  }
  into(func) {
    return func(this)
  }
  reduce(callback, value) {
    let offset = 0
    if (value === undefined) {
      value = this.nextValue()
      if (value === undefined) return
      offset++
    }
    let item 
    while ((item = this.nextValue()) !== undefined) {
      value = callback(value, item, offset++)
    }
    return value
  }
  forEach(callback) {
    let offset = 0
    let item 
    while ((item = this.nextValue()) !== undefined) {
      callback(item, offset++)
    }
  }
  toArray() {
    let ret = []
    let item 
    while ((item = this.nextValue()) !== undefined) {
      ret.push(item)
    }
    return ret
  }
  static from(iterable) {
    if (iterable == null) {
      return new IndexIterator()
    } else if (iterable.nextValue) {
      return iterable
    } else if (Array.isArray(iterable)) {
      return new ArrayIterator(iterable)
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
  nextValue() {
    let { rator } = this
    if (rator === null) return
    let { done, value } = rator.next()
    if (!done) return value
    this.rator = null      
  }
}
class ArrayIterator extends IndexIterator {
  constructor(array) {
    super()
    this.array = array
    this.offset = 0
  }
  nextValue() {
    return this.array[this.offset++]
  }
}
class MapIterator extends IndexIterator {
  constructor(rator, transform) {
    super()
    this.rator = rator
    this.transform = transform
    this.offset = 0
  }
  nextValue() {
    let item = this.rator.nextValue()
    if (item === undefined) return
    return this.transform(item, this.offset++)
  }
}
class FilterIterator extends IndexIterator {
  constructor(rator, predicate) {
    super()
    this.rator = rator
    this.predicate = predicate
    this.offset = 0
  }
  nextValue() {
    let { rator, predicate } = this
    let item
    while ((item = rator.nextValue()) !== undefined) {
      if (predicate(item, this.offset++)) return item
    }
  }
}
class FlattenIterator extends IndexIterator {
  constructor(rator) {
    super()
    this.rator = rator
    this.inner = null
  }
  nextValue() {
    while (true) {
      if (this.inner != null) {
        let item = this.inner.nextValue()
        if (item !== undefined) return item
        this.inner = null
      }
      let item = this.rator.nextValue()
      if (item == null) return item // !!!
      if (item[Symbol.iterator]) {
        this.inner = IndexIterator.from(item)
      } else {
        return item
      }
    }
  }
}
class SkipIterator extends IndexIterator {
  constructor(rator, count) {
    super()
    this.rator = rator
    this.count = count
  }  
  nextValue() {
    let { rator } = this
    while (--this.count >= 0) {
      if (rator.nextValue() === undefined) return
    }
    return rator.nextValue()
  }
}
class TakeIterator extends IndexIterator {
  constructor(rator, count) {
    super()
    this.rator = rator
    this.count = count
  }  
  nextValue() {
    if (--this.count >= 0) return this.rator.nextValue()
  }
}
class FallbackIterator extends IndexIterator {
  constructor(rator, value) {
    super()
    this.rator = rator
    this.value = value
  }
  nextValue() {
    let { rator, value } = this
    if (value === undefined) return rator.nextValue()
    this.value = undefined
    let ret = rator.nextValue()
    return ret === undefined ? value : ret
  }
}
class BufferedIterator extends IndexIterator {
  constructor(rator) {
    super()
    this.rator = rator
    this.buffer = null
    this.offset = 0
  }
  nextValue() {
    let { buffer, offset } = this
    if (buffer === null) {
      this.init()
      if ((buffer = this.buffer) === null) return
    }
    if (offset < buffer.length) {
      this.offset = offset + 1
      let ret = buffer[offset]
      buffer[offset] = undefined
      return ret
    }
    this.buffer = null
  } 
  toArray() {
    this.init()
    let { buffer, offset } = this
    if (buffer === null) return []
    this.buffer = null
    if (offset > 0) buffer.splice(0, offset)
    return buffer
  }
}
class GroupsIterator extends IndexIterator {
  constructor(rator, comparator) {
    super()
    this.rator = rator
    this.comparator = comparator
    this.inner = null
  }
  nextValue() {
    let { inner, rator, comparator } = this
    let first = undefined
    if (inner) {
      inner.init()
      first = inner.first
    } else {
      first = rator.nextValue()
    }
    if (first === undefined) {
      this.inner = null
    } else {
      return this.inner = new GroupIterator(rator, comparator, first)      
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
    this.buffer = this.rator.toArray().sort(this.comparator)
    this.rator = null
  }
}
class ReverseIterator extends BufferedIterator {
  init() {
    if (this.buffer || !this.rator) return
    this.buffer = this.rator.toArray().reverse()
    this.rator = null
  }
}
class GroupIterator extends BufferedIterator {
  constructor(rator, comparator, first) {
    super(rator)
    this.comparator = comparator
    this.first = first  
    this.firstStep = true
  }
  init() {
    if (this.buffer || !this.rator) return
    let buffer = []
    let item
    while ((item = this.nextValue()) !== undefined) {
      buffer.push(item)
    }
    this.buffer = buffer
  }
  nextValue() {
    if (this.buffer !== null) {
      // return super.nextValue()
      let { buffer, offset } = this
      if (offset < buffer.length) {
        this.offset = offset + 1
        let ret = buffer[offset]
        buffer[offset] = undefined
        return ret
      }
      this.buffer = null
    } else if (this.firstStep) {
      this.firstStep = false
      return this.first
    } else if (this.rator != null) {
      let item = this.rator.nextValue()
      if (item !== undefined && 
        this.comparator(this.first, item) === 0) {
        return item
      }
      this.first = item
      this.rator = null
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
    if (removed == null) return null
    let { indexes, removals, inserts } = this.journal
    indexes.push(index)
    removals.push(removed)
    inserts.push(null)        
    return removed
  }
  deleteAt(index, offset) {
    let removed = index.deleteAt(offset)
    if (removed == null) return null
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
