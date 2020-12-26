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
      detachedNode = null
      return (++curr[d] & 3) === 2 ? RESIZED : UPDATED
    } 
    let cmp = comp(right, node)
    let result = UNCHANGED
    if (cmp < 0) {
      result = addRight(right, node, comp, replace)
    } else if (cmp > 0) {
      result = addLeft(right, node, comp, replace)
    } else if (replace && right !== node) {
      curr[r] = detachNode(right, node)
    } else {
      detachedNode = null
    }
    if (result < RESIZED) return result
    if (result === UNBALANCED) {
      curr[r] = right = rotate(right)
      if ((right[d] & 3) === 1) return UPDATED
    }
    if ((curr[d] & 3) === 2) return UNBALANCED
    return (++curr[d] & 3) === 2 ? RESIZED : UPDATED
  }  
 
  function addLeft(curr, node, comp, replace) {
    let left = curr[l]
    if (left == null) {
      curr[l] = node
      curr[d] += 4
      detachedNode = null
      return (--curr[d] & 3) === 0 ? RESIZED : UPDATED
    }    
    let cmp = comp(left, node)
    let result = UNCHANGED
    if (cmp < 0) {
      result = addRight(left, node, comp, replace)
    } else if (cmp > 0) {
      result = addLeft(left, node, comp, replace)
    } else if (replace && left !== node) {
      curr[l] = detachNode(left, node)
    } else {
      detachedNode = null
    }
    if (result === UNCHANGED) return UNCHANGED
    curr[d] += 4
    if (result === UPDATED) return UPDATED
    if (result === UNBALANCED) {
      curr[l] = left = rotate(left)
      if ((left[d] & 3) === 1) return UPDATED
    }
    if ((curr[d] & 3) === 0) return UNBALANCED
    return (--curr[d] & 3) === 0 ? RESIZED : UPDATED
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
    ret[d] = 1
    detachedNode = null
    return ret
  }
  /** 
  @returns {0|1|2|3} */
  function deleteLeft(curr, value, comp) {
    let left = curr[l]
    if (left == null) {
      detachedNode = null
      return UNCHANGED
    }
    let cmp = comp(left, value)
    /** @type {0|1|2|3} */
    let result
    if (cmp > 0) {
      result = deleteLeft(left, value, comp)
    } else if (cmp < 0) {
      result = deleteRight(left, value, comp)
    } else if (left[l] && left[r]) {
      let size = left[d] >>> 2
      result = deleteLeftAt(left, size - 1)
      curr[l] = left = detachNode(left, detachedNode)
    } else {
      detachedNode = left
      curr[l] = left = left[l] || left[r]
      result = RESIZED
    }
    if (result === UNCHANGED) return UNCHANGED
    curr[d] -= 4
    if (result === UPDATED) return UPDATED  
    return deleteLeftFix(curr, result)
  }  
  /** 
  @returns {1|2|3} */
  function deleteLeftAt(curr, index) {
    let left = curr[l]
    let size = left[d] >>> 2
    /** @type {1|2|3} */
    let result
    if (size > index) {
      result = deleteLeftAt(left, index)
    } else if (size < index) {
      result = deleteRightAt(left, index - size - 1)
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
    if ((curr[d] & 3) === 2) return UNBALANCED
    return (++curr[d] & 3) === 2 ? UPDATED : RESIZED
  }  
  /** 
  @returns {1|2|3} */
  function deleteRightAt(curr, index) {
    let right = curr[r]
    let size = right[d] >>> 2
    /** @type {1|2|3} */
    let result
    if (size > index) {
      result = deleteLeftAt(right, index)
    } else if (size < index) {
      result = deleteRightAt(right, index - size - 1)
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
  @returns {1|2|3} */
  function deleteRightAt(curr, index) {
    let right = curr[r]
    let size = right[d] >>> 2
    /** @type {1|2|3} */
    let result
    if (size > index) {
      result = deleteLeftAt(right, index)
    } else if (size < index) {
      result = deleteRightAt(right, index - size - 1)
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
    if (right == null) {
      detachedNode = null
      return UNCHANGED  
    }
    let cmp = comp(right, value)
    /** @type {0|1|2|3} */
    let result
    if (cmp > 0) {
      result = deleteLeft(right, value, comp)
    } else if (cmp < 0) {
      result = deleteRight(right, value, comp)
    } else if (right[l] && right[r]) {
      let size = right[d] >>> 2
      result = deleteLeftAt(right, size - 1)
      curr[r] = right = detachNode(right, detachedNode)
    } else {
      detachedNode = right
      curr[r] = right = right[l] || right[r]
      result = RESIZED
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
    if ((curr[d] & 3) === 0) return UNBALANCED
    return (--curr[d] & 3) === 0 ? UPDATED : RESIZED
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
      let leftSize = left[d] & ~3
      let diff = left[d] & 3
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
  function getAt(node, index) {
    while (true) {
      let size = node[d] >>> 2
      if (index < size) {
        node = node[l]
      } else if (index > size) {
        index -= size + 1
        node = node[r]
      } else {
        return node
      }
    }
  }  
  function enumerateRange(node, start, end, reversed) {
    let count = end - start
    if (count === 1) {
      return new MiniIndexGenerator(node, null)
    }
    if (count === 2) {
      let ascending = start === node[d] >>> 2
      let node2 = getAt(node, start + +ascending)
      if (ascending === reversed) {
        return new MiniIndexGenerator(node2, node)
      } else {
        return new MiniIndexGenerator(node, node2)
      }
    }
    let nodes = []
    if (reversed) start = end - 1
    while (true) {
      let index = node[d] >>> 2
      if (start < index) {
        if (!reversed) nodes.push(node)
        node = node[l]
      } else if (start > index) {
        start -= index + 1
        if (reversed) nodes.push(node)
        node = node[r]
      } else {
        nodes.push(node)
        return new IndexGenerator(nodes, count, reversed)
      }
    }
  }
  class IndexGenerator {
    constructor(nodes, count, reversed) {
      this.current = null
      this.nodes = nodes
      this.count = count
      this.reversed = reversed
    }
    moveNext() {
      if (--this.count < 0) {
        this.current = null
        return false
      } 
      let { nodes, current, reversed } = this
      if (current) {
        if (reversed) {
          current = current[l]
          while (current) {
            nodes.push(current)
            current = current[r]
          }
        } else {
          current = current[r]
          while (current) {
            // if (node[d] >>> 2 < this.count)
            nodes.push(current)
            current = current[l]
          }
        }
      }
      this.current = nodes.pop()
      return true
    }  
    next() {
      let done = !this.moveNext()
      let value = this.current
      return { done, value }
    }
    [Symbol.iterator]() {
      return this
    }
  }
  class MiniIndexGenerator {
    constructor(item, item2) {
      this.current = null
      this.item = item
      this.item2 = item2
    }
    moveNext() {
      let top = this.item
      this.current = top
      this.item = this.item2
      this.item2 = null
      return !!top
    }   
    next() {
      let done = !this.moveNext()
      let value = this.current
      return { done, value }
    } 
    [Symbol.iterator]() {
      return this
    }
  }  
  return class IntrusiveIndex {
    constructor(comp) {
      this.comp = comp
      this.root = { [l]: null, [r]: null, [d]: 1 }
    }
    get size() {
      return this.root[d] >>> 2
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
      addLeft(root, value, comp, true)
      return getDetached()
    }
    delete(value) {
      let { root, comp } = this
      deleteLeft(root, value, comp)
      return getDetached()
    }
    deleteAt(index) {
      let { root, size } = this
      if (index < 0 || index >= size) return null
      deleteLeftAt(root, index)
      return getDetached()
    }
    get(value) {
      let { root, comp } = this
      let isComp = typeof value === 'function'
      let node = root[l]
      while (node) {
        let cmp = isComp ? value(node) : comp(node, value)
        if (cmp < 0) node = node[r]
        else if (cmp > 0) node = node[l]
        else return node
      }
      return null
    }  
    getAt(index) {
      let { root, size } = this
      if (index < 0) index = size + index + 1
      if (index < size) return getAt(root[l], index)
      return null
    }
    findRange(comp) {
      let { root } = this
      let node = root[l]
      let end = 0
      let start = -1
      while (node) {
        let cmp = comp(node)
        if (cmp > 0) {
          node = node[l]
          continue
        } 
        if (start === -1 && cmp === 0) {
          start = end + (node[d] >>> 2)
          let offset = end
          let node2 = node[l]
          while (node2) {
            if (comp(node2) < 0) {
              offset += (node2[d] >>> 2) + 1
              node2 = node2[r]
            } else {
              start = offset + (node2[d] >>> 2)
              node2 = node2[l]
            }
          }
        }
        end += (node[d] >>> 2) + 1
        node = node[r]
      }
      if (start === -1) start = end
      return { start, end }
    } 
    enumerate(comp, reversed = false) {
      let { root } = this
      let curr = root[l]
      while (curr) {
        let cmp = comp(curr)
        if (cmp < 0) curr = curr[r]
        else if (cmp > 0) curr = curr[l]
        else break
      }
      if (!curr) return new MiniIndexGenerator(null, null)
      let start = curr[d] >>> 2
      let end = start + 1
      let offset = 0
      let node = curr[l]
      while (node) {
        if (comp(node) >= 0) {
          start = offset + (node[d] >>> 2)
          node = node[l]
        } else {
          offset += (node[d] >>> 2) + 1
          node = node[r]
        }
      }
      node = curr[r]
      while (node) {
        if (comp(node) > 0) {
          node = node[l]
        } else {
          end += (node[d] >>> 2) + 1
          node = node[r]
        }
      }    
      return enumerateRange(curr, start, end, reversed)
    }
    enumerateRange(start = 0, end = ~0, reversed = false) {
      let { size, root } = this
      if (end < 0) end = size + end + 1
      start = Math.max(0, start)
      end = Math.min(size, end)
      if (start >= end) {
        return new MiniIndexGenerator(null, null)
      } 
      let node = root[l]
      while (true) {
        let index = node[d] >>> 2
        if (end <= index) {
          node = node[l]
        } else if (index < start) {
          node = node[r]
          start -= index + 1
          end -= index + 1
        } else {
          return enumerateRange(node, start, end, reversed)
        }
      }
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

export const IIA = constructorFactory()
export const IIB = constructorFactory()
export const IIC = constructorFactory()
export const IID = constructorFactory()
export const IIE = constructorFactory()
export const IIF = constructorFactory()

export class Transaction {
  constructor() {
    this.indexList = []
    this.removedList = []
    this.insertedList = []
  }
  add(index, item) {
    if (!index.add(item)) return false
    this.indexList.push(index)
    this.removedList.push(null)
    this.insertedList.push(item)
    return true
  }  
  insert(index, item) {
    let removed = index.insert(item)
    this.indexList.push(index)
    this.removedList.push(removed)
    this.insertedList.push(item)
    return removed
  }
  delete(index, item) {
    let removed = index.delete(item)
    if (!removed) return null
    this.indexList.push(index)
    this.removedList.push(removed)
    this.insertedList.push(null)
    return removed
  }
  deleteAt(index, pos) {
    let removed = index.deleteAt(pos)
    if (!removed) return null
    this.indexList.push(index)
    this.removedList.push(removed)
    this.insertedList.push(null)
    return removed
  }  
  replace(index, item, replacee) {
    let removed = this.insert(index, item)
    removed = removed || replacee && this.delete(replacee)
    return removed !== replacee
  }  
  rollback() {
    let { indexList, removedList, insertedList } = this
    while (indexList.length) {
      let index = indexList.pop()
      let removed = removedList.pop()
      let inserted = insertedList.pop()
      let current
      if (inserted && removed) {
        current = index.insert(removed)
      } else if (inserted) {
        current = index.delete(inserted)
      } else if (removed) {
        current = index.insert(removed)
      }
      if (current !== inserted) throw {
        message: 'rollback failed',
        current, 
        expected: inserted,
        position: indexList.length,
      }
    }
  }
}
