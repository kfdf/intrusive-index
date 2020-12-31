function newAdd(root, node, comp) {
  let nodes = []
  let curr = root[l]
  while (curr) {
    let cmp = comp(curr, node)
    if (cmp < 0) {
      nodes.push(curr)
      curr = curr[r]
    } else if (cmp > 0) {
      nodes.push(curr)
      nodes.push(null)
      curr = curr[l]
    } else {
      return false
    }
  }
  let resized = true
  while (nodes.length) {
    curr = nodes.pop()
    let isLeft = curr == null
    if (isLeft) curr = nodes.pop()
    if (node) {
      if (isLeft) curr[l] = node
      else curr[r] = node
      node = null 
    }
    let diff = curr[d]
    if (isLeft) {
      diff += 4
      curr[d] = diff
    }
    if (!resized) continue
    if (isLeft) {
      if ((diff & 3) === 0) {
        node = rotate(curr)
        resized = (node[d] & 3) !== 1
      } else {
        curr[d] = diff - 1
        resized = (diff & 3) === 1
      }
    } else {
      if ((diff & 3) === 2) {
        node = rotate(curr)
        resized = (node[d] & 3) !== 1
      } else {
        curr[d] = diff + 1
        resized = (diff & 3) === 1
      }
    }
  }
  if (node) root[l] = node
  root[d] += 4
  return true
}
function newAdd2(curr, comp, ret) {
  if (curr == null) return ret.status = RESIZED
  let cmp = comp(curr, ret.node)
  if (cmp == 0) return ret.status = UNCHANGED

  let next = cmp > 0 ? curr[l] : curr[r]
  newAdd2(next, comp, ret)
  let { node, status } = ret
  if (status === UNCHANGED) return
  if (node) {
    if (cmp > 0) {
      curr[l] = node
    } else {
      curr[r] = node
    }
    node = null
  }
  let diff = curr[d]
  if (cmp > 0) {
    curr[d] = (diff += 4)
  }
  if (status ===  RESIZED) {
    if (cmp > 0) {
      if ((diff & 3) === 0) {
        node = rotate(curr)
        status = ((node[d] & 3) === 1) ? UPDATED : RESIZED
      } else {
        curr[d] = diff - 1
        status = ((diff & 3) === 1) ? RESIZED : UPDATED        
      }
    } else {
      if ((diff & 3) === 2) {
        node = rotate(curr)
        status = ((node[d] & 3) === 1) ? UPDATED : RESIZED
      } else {
        curr[d] = diff + 1
        status = ((diff & 3) === 1) ? RESIZED : UPDATED        
      }      
    }
  }
  ret.node = node
  ret.status = status
} 
