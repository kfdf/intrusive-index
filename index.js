export default function indexFactory() {
  const UNCHANGED = 0
  const UPDATED = 1
  const RESIZED = 2
  const UNBALANCED = 3
  const l = Symbol('left')
  const r = Symbol('right')
  const d = Symbol('diff')
 

  function addRight(curr, node, comparer, replace) {
    let right = curr[r]
    if (right == null) {
      curr[r] = node
      detachedNode = null
      return (++curr[d] & 3) == 2 ? RESIZED : UPDATED
    } 
    let cmp = comparer(right, node)
    let result = UNCHANGED
    if (cmp < 0) {
      result = addRight(right, node, comparer, replace)
    } else if (cmp > 0) {
      result = addLeft(right, node, comparer, replace)
    } else if (replace) {
      curr[r] = detachNode(right, node)
    } else {
      detachedNode = null
    }
    if (result < RESIZED) return result
    if (result == UNBALANCED) {
      curr[r] = right = rotate(right)
      if ((right[d] & 3) == 1) return UPDATED
    }
    if ((curr[d] & 3) == 2) return UNBALANCED
    return (++curr[d] & 3) == 2 ? RESIZED : UPDATED
  }  
 
  function addLeft(curr, node, comparer, replace) {
    let left = curr[l]
    if (left == null) {
      curr[l] = node
      curr[d] += 4
      detachedNode = null
      return (--curr[d] & 3) == 0 ? RESIZED : UPDATED
    }    
    let cmp = comparer(left, node)
    let result = UNCHANGED
    if (cmp < 0) {
      result = addRight(left, node, comparer, replace)
    } else if (cmp > 0) {
      result = addLeft(left, node, comparer, replace)
    } else if (replace) {
      curr[l] = detachNode(left, node)
    } else {
      detachedNode = null
    }
    if (result == UNCHANGED) return UNCHANGED
    curr[d] += 4
    if (result == UPDATED) return UPDATED
    if (result == UNBALANCED) {
      curr[l] = left = rotate(left)
      if ((left[d] & 3) == 1) return UPDATED
    }
    if ((curr[d] & 3) == 0) return UNBALANCED
    return (--curr[d] & 3) == 0 ? RESIZED : UPDATED
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
  function deleteLeft(curr, value, comparer) {
    let left = curr[l]
    if (left == null) {
      detachedNode = null
      return UNCHANGED
    }
    let cmp = comparer(left, value)
    /** @type {0|1|2|3} */
    let result
    if (cmp > 0) {
      result = deleteLeft(left, value, comparer)
    } else if (cmp < 0) {
      result = deleteRight(left, value, comparer)
    } else if (left[l] && left[r]) {
      let size = left[d] >>> 2
      result = deleteLeftAt(left, size - 1)
      curr[l] = left = detachNode(left, detachedNode)
    } else {
      detachedNode = left
      curr[l] = left = left[l] || left[r]
      result = RESIZED
    }
    if (result == UNCHANGED) return UNCHANGED
    curr[d] -= 4
    if (result == UPDATED) return UPDATED  
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
    if (result == UPDATED) return UPDATED  
    return deleteLeftFix(curr, result)
  }  
  /**
  @param {2|3} result */
  function deleteLeftFix(curr, result) {
    if (result == UNBALANCED) {
      let left = rotate(curr[l]) 
      curr[l] = left
      if ((left[d] & 3) != 1) return UPDATED
    }
    if ((curr[d] & 3) == 2) return UNBALANCED
    return (++curr[d] & 3) == 2 ? UPDATED : RESIZED
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
    if (result == UPDATED) return UPDATED
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
    if (result == UPDATED) return UPDATED
    return deleteRightFix(curr, result)
  }
  /** 
  @returns {0|1|2|3} */
  function deleteRight(curr, value, comparer) {
    let right = curr[r]
    if (right == null) {
      detachedNode = null
      return UNCHANGED  
    }
    let cmp = comparer(right, value)
    /** @type {0|1|2|3} */
    let result
    if (cmp > 0) {
      result = deleteLeft(right, value, comparer)
    } else if (cmp < 0) {
      result = deleteRight(right, value, comparer)
    } else if (right[l] && right[r]) {
      let size = right[d] >>> 2
      result = deleteLeftAt(right, size - 1)
      curr[r] = right = detachNode(right, detachedNode)
    } else {
      detachedNode = right
      curr[r] = right = right[l] || right[r]
      result = RESIZED
    }
    if (result == UNCHANGED) return UNCHANGED
    if (result == UPDATED) return UPDATED
    return deleteRightFix(curr, result)
  }
  /** 
  @param {2|3} result */
  function deleteRightFix(curr, result) {
    if (result == UNBALANCED) {
      let right = rotate(curr[r])
      curr[r] = right
      if ((right[d] & 3) != 1) return UPDATED
    }
    if ((curr[d] & 3) == 0) return UNBALANCED
    return (--curr[d] & 3) == 0 ? UPDATED : RESIZED
  }  

  function rotate(node) {
    if ((node[d] & 3) == 2) {
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
        if (diff == 2) {
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
        if (diff == 2) {
          node[d] = nodeSize
          right[d] = right[d] & ~3 | 1
        } else if (diff == 0) {
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
        if (diff == 0) {
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
  //               0-             1       
  //       2        |x|      ?       ?   
  //    |x|    ?          |x| |x? |x? |x|
  //        |x? |x?                      
        let right = left[r]
        let diff = right[d] & 3
        if (diff == 2) {
          node[d] = node[d] & ~3 | 1
          left[d] = leftSize
        } else if (diff == 0) {
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
  /**
  @param {number} index */
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

  /** 
  @param {number} start
  @param {number} end
  @param {boolean} reversed  */
  function enumerateRange(node, start, end, reversed) {
    let count = end - start
    if (count === 1) {
      return new MiniEnumerator(node, null)
    }
    if (count === 2) {
      let ascending = start === node[d] >>> 2
      let node2 = getAt(node, start + +ascending)
      if (ascending === reversed) {
        return new MiniEnumerator(node2, node)
      } else {
        return new MiniEnumerator(node, node2)
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
        return new Enumerator(nodes, count, reversed)
      }
    }
  }
  function validateNode(node, comparer, isRoot) {
    if (node == null) return {
      min: null, max: null,
      height: 0, size: 0
    }    
    if (typeof node[l] != 'object') throw {
      message: `the 'left' property is not an object`,
      current: node,
    }
    if (typeof node[r] != 'object') throw {
      message: `the 'right' property is not an object`,
      current: node,
    }
    if (!Number.isSafeInteger(node[d])) throw {
      message: `the 'diff' property is not an integer`,
      current: node,
    }

    let lst = validateNode(node[l], comparer)
    let rst = validateNode(node[r], comparer)

    if (lst.max && comparer(lst.max, node) >= 0) throw {
      message: 'the left subtree is ranked higher or equal',
      current: node,
      highestRankingLeft: lst.max
    }
    if (rst.min && comparer(rst.min, node) <= 0) throw {
      message: 'the right subtree is ranked lower or equal',
      current: node, 
      lowestRankingRight: rst.min
    }
    let diff = (node[d] & 3) - 1
    if (!isRoot && rst.height - lst.height !== diff) throw {
      message: 'invalid height difference',
      current: node,
      currentDiff: diff, 
      rightHeight: rst.height,
      leftHeight: lst.height,
    }
    let size = node[d] >>> 2
    if (lst.size !== size) throw {
      message: 'invalid size',
      current: node,
      currentSize: size,
      actualSize: lst.size,
    }
    return {
      min: lst.min || node, 
      max: rst.max || node, 
      height: Math.max(lst.height, rst.height) + 1, 
      size: lst.size + rst.size + 1,
    }
  }
  /**
  @template T */  
  class Enumerator {
    /**
    @param {number} count 
    @param {boolean} reversed */
    constructor(nodes, count, reversed) {
      /** @type {T?} */
      this.current = null
      /** @private */
      this.nodes = nodes
      /** @private */
      this.count = count
      /** @private */
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
      if (this.moveNext()) {
        return { done: false, value: this.current } 
      } else {
        return { done: true, value: null }
      }
    }
    [Symbol.iterator]() {
      return this
    }
  }
  /**
  @template T */
  class MiniEnumerator {
    constructor(item, item2) {
      /** @type {T?} */
      this.current = null
      /** @private */
      this.item = item
      /** @private */
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
      if (this.moveNext()) {
        return { done: false, value: this.current } 
      } else {
        return { done: true, value: null }
      }
    } 
    [Symbol.iterator]() {
      return this
    }
  }  
  /**
  @template T */
  class IntrusiveIndex {
    /** 
    @param {(a: T, b: T) => number} comparer */
    constructor(comparer) {
      /** @private */
      this.comparer = comparer
      /** @private */
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
    /**
    @param {T} value 
    @param {boolean} replace 
    @returns {T | null} */
    add(value, replace = false) {
      let { root, comparer } = this
      value[l] = null
      value[r] = null
      value[d] = 1
      return !!addLeft(root, value, comparer, false)
    }
    /**
    @param {T} value 
    @param {boolean} replace 
    @returns {T | null} */
    insert(value) {
      let { root, comparer } = this
      value[l] = null
      value[r] = null
      value[d] = 1
      addLeft(root, value, comparer, true)
      return getDetached()
    }

    /**
    @param {T} value
    @returns {T | null} */
    delete(value) {
      let { root, comparer } = this
      deleteLeft(root, value, comparer)
      return getDetached()
    }
    /**
    @param {number} value 
    @returns {T | null} */    
    deleteAt(index) {
      let { root, size } = this
      if (index < 0 || index >= size) return null
      deleteLeftAt(root, index)
      return getDetached()
    }
    /**
    @param {T | (value: T) => number} value or comparer
    @returns {T | null} */     
    get(value) {
      let { root, comparer } = this
      let isComp = typeof value === 'function'
      let node = root[l]
      while (node) {
        let cmp = isComp ? value(node) : comparer(node, value)
        if (cmp < 0) node = node[r]
        else if (cmp > 0) node = node[l]
        else return node
      }
      return null
    }  
    /**
    @param {number} index
    @returns {T | null} */    
    getAt(index) {
      let { root, size } = this
      if (index >= 0 && index < size) {
        return getAt(root[l], index)
      }
      return null
    }
    /**
    @param {(entry: T) => number} comparer */     
    findRange(comparer) {
      let { root } = this
      let node = root[l]
      let end = 0
      let start = -1
      while (node) {
        let cmp = comparer(node)
        if (cmp > 0) {
          node = node[l]
          continue
        } 
        if (start == -1 && cmp == 0) {
          start = end + (node[d] >>> 2)
          let offset = end
          let node2 = node[l]
          while (node2) {
            if (comparer(node2) < 0) {
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
      if (start == -1) start = end
      return { start, end }
    } 

    /** 
    @param {(entry: T) => number} comparer
    @param {boolean} reversed 
    @returns {Enumerator<T>} */
    enumerate(comparer, reversed = false) {
      let { root } = this
      let curr = root[l]
      while (curr) {
        let cmp = comparer(curr)
        if (cmp < 0) curr = curr[r]
        else if (cmp > 0) curr = curr[l]
        else break
      }
      if (!curr) return new MiniEnumerator(null, null)
      let start = curr[d] >>> 2
      let end = start + 1
      let offset = 0
      let node = curr[l]
      while (node) {
        if (comparer(node) >= 0) {
          start = offset + (node[d] >>> 2)
          node = node[l]
        } else {
          offset += (node[d] >>> 2) + 1
          node = node[r]
        }
      }
      node = curr[r]
      while (node) {
        if (comparer(node) > 0) {
          node = node[l]
        } else {
          end += (node[d] >>> 2) + 1
          node = node[r]
        }
      }    
      return enumerateRange(curr, start, end, reversed)
    }
    /** 
    @param {number} start
    @param {number} end
    @param {boolean} reversed  
    @returns {Enumerator<T>} */
    enumerateRange(start = 0, end = ~0, reversed = false) {
      let { size, root } = this
      if (end < 0) end = size + end + 1
      start = Math.max(0, start)
      end = Math.min(size, end)
      if (start >= end) {
        return new MiniEnumerator(null, null)
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
    validate() {
      let { root, comparer } = this
      validateNode(root, comparer, true)
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
  return IntrusiveIndex
}

export const IIA = indexFactory()
export const IIB = indexFactory()
export const IIC = indexFactory()
export const IID = indexFactory()
export const IIE = indexFactory()
export const IIF = indexFactory()
