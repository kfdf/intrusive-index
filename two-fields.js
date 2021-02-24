export default function constructorFactory(
  l = Symbol('left'),
  r = Symbol('right')
) {
  let cached = { added: false, resized: false, node: null }
  function result(added = false, resized = false, node = null) {
    cached.added = added
    cached.resized = resized
    cached.node = node
    return cached
    // return { added, resized, node }
  }
  function addNode(curr, node, comp) {
    let cmp = comp(curr, node)
    if (cmp > 0) {
      let left = curr[l]
      if (typeof left === 'number') {  // c   c 
        node[r] = 0                    // 1  n 0
        node[l] = 1                    //    1
        curr[l] = node
        return result(true, true)
      } else {
        let right = left[r]
        if (typeof right === 'number') {
          if (right === 0) {
            let a = addNode(left, node, comp)
            if (a.resized) {
              a.node = smallRotate(curr, left, right)
              a.resized = false
            }
            return a
          } else { // right === 2        c     c
            node[r] = left           //   l2  n l1
            node[l] = 1              //   1   1 1
            curr[l] = node
            left[r] = 1
            return result(true, false)
          }
        } else {                              //  c
          let a = addNode(left, node, comp)   // l r
          if (a.resized) {
            let diff = right[r]   
            if (diff === 2) {
              right[r] = 1
              a.resized = false
            } else if (diff === 1) {
              right[r] = 0
            } else {
              a.node = rotate(curr, left, right, diff)
              a.resized = false 
            }
          } else if (a.node !== null) {
            curr[l] = a.node
            a.node = null
          }
          return a
        }
      }
    } else if (cmp < 0) {
      let left = curr[l]
      if (typeof left === 'number') {  // c  c  
        node[r] = 2                    // 1   n2
        node[l] = 1                    //     1 
        curr[l] = node
        return result(true, true, null)
      } else {
        let right = left[r]
        if (typeof right === 'number') {   
          if (right === 0) {             //  c    c
            node[r] = 1                  // l 0  l n1  
            node[l] = 1                  // 1    1 1 
            left[r] = node
            return result(true, false)
          } else { // right === 2
            let a = addNode(left, node, comp)
            if (a.resized) {
              a.node = smallRotate(curr, left, right)
              a.resized = false
            }
            return a
          }
        } else {                               //  c
          let a = addNode(right, node, comp)   // l r
          if (a.resized) {
            let diff = right[r]
            if (diff === 0) {
              right[r] = 1
              a.resized = false
            } else if (diff === 1) {
              right[r] = 2
            } else {
              a.node = rotate(curr, left, right, diff)
              a.resized = false
            }
          } else if (a.node !== null) {
            left[r] = a.node
            a.node = null
          }
          return a          
        }
      }
    }
    return result()    
  }
  function smallRotate(curr, left, right) {
    let lleft = left[l]
    let ldiff = lleft[r]
    if (right === 0) {      
      if (ldiff === 0) {
        left[r] = curr[r]  //      c       l        
        lleft[r] = curr    //    l  0    ll c1      
        curr[r] = 1        //  ll 0  
        curr[l] = 1
        return left
      } else {
        lleft[r] = curr[r] //        c         ll     
        lleft[l] = left    //    l    0       l  c1 
        left[r] = curr     //     ll2 
        left[l] = 1
        curr[r] = 1
        curr[l] = 1
        return lleft
      }
    } else {
      if (ldiff === 0) {
        lleft[r] = curr[r] //   c         ll         
        lleft[l] = curr    //      l2    c  l1     
        curr[l] = 1        //    ll  0 
        curr[r] = left
        left[r] = 1
        left[l] = 1
        return lleft    
      } else {
        left[r] = curr[r] //   c         l
        left[l] = curr    //     l2    c  ll1
        curr[r] = lleft   //       ll2   
        curr[l] = 1
        lleft[r] = 1
        return left
      }
    }
  }
  function rotate(curr, left, right, diff) {
    if (diff === 0) {
//            0-            1
//    2        |x|      ?       ?
// |x|    ?          |x| |x? |x? |x|
//     |x? |x?
      let lleft = left[l]
      let lright = lleft[r]
      let ldiff = lright[r]
      if (ldiff === 2) {
        let lrleft = lright[l]
        let lrright = lrleft[r]
        let lrdiff
        if (typeof lrright == 'number') {
          lrdiff = lrright     //          c           lr
          if (lrdiff === 0) {  //   l       r0    l      c1
            lleft[r] = lrleft  // ll   lr2      ll lrl1    r2
            curr[l] = right    //    lrl  0
          } else { // lrdiff === 2                        
            curr[l] = lrleft   //          c        lr
            lrleft[r] = right  //   l       r0    l      c1
            lrleft = lleft     // ll lr2        ll 0  lrl  r1
          }                    //      lrl2
        } else {
          lrdiff = lrright[r]  //           c          lr
          lleft[r] = lrleft    //   l        r0    l        c1
          curr[l] = lrright    // ll   lr2       ll lrl? lrr  r?
          lrright[r] = right   //    lrl lrr?
        }
        lright[l] = left
        lright[r] = curr[r]
        left[r] = curr
        curr[r] = 1         
        if (lrdiff === 0) {
          lrleft[r] = 1
          right[r] = 2
        } else if (lrdiff === 1) {
          lrleft[r] = 1
          right[r] = 1
        } else {
          lrleft[r] = 0
          right[r] = 1
        }
        return lright      
      } else {         
//        0-        2                 0-        1 
//    1    |x|  |x|    0          0    |x|  |x|    1     
// |x| |x|      |1| |x| |x|    |x| |x|      |1| |x| |x|      
// |1| |1|          |1|        |1|         
        left[l] = lleft
        left[r] = curr[r]
        lleft[r] = curr
        curr[l] = lright
        lright[r] = right  //       c        l 
        if (ldiff === 0) { //   l    r0    ll   c1
          curr[r] = 1      // ll lr0          lr  r1
          right[r] = 1     
        } else { // ldiff === 1
          curr[r] = 2      //       c        l
          right[r] = 0     //   l    r0    ll   c2
        }                  // lr lr1          lr  r0 
        return left         
      }                     
    } else { // diff === 2
      let rleft = right[l]
      let rright = rleft[r]
      let rdiff = rright[r]
      if (rdiff === 0) {
//    2+                    1       
// |x|        0         ?       ?   
//        ?    |x|   |x| |x? |x? |x|
//     |x? |x?                      
        let rlleft = rleft[l]    
        let rlright = rlleft[r]                   
        let rldiff
        if (typeof rlright === 'number') {
          rldiff = rlright      //  c                  rl         
          if (rldiff === 0) {   // l       r2      c     r1       
            left[r] = rlleft    //      rl   rr0  l rll1   rr2
            right[l] = rright   //   rll  0                         
          } else { // rldiff === 2
            right[l] = rlleft   //  c                rl         
            rlleft[r] = rright  // l       r2      c      r1       
            rlleft = left       //   rl     rr0  l  0  rll  rr1
          }                     //     rll2    
        } else {
          rldiff = rlright[r]   //  c                    rl         
          left[r] = rlleft      // l         r2      c        r1       
          right[l] = rlright    //      rl     rr0  l rll? rlr  rr?
          rlright[r] = rright   //   rll  rlr?               
        }
        rleft[l] = curr  
        rleft[r] = curr[r]
        curr[r] = right           
        right[r] = 1         
        if (rldiff === 0) {
          rlleft[r] = 1
          rright[r] = 2
        } else if (rldiff === 1) {
          rlleft[r] = 1
          rright[r] = 1
        } else {
          rlleft[r] = 0
          rright[r] = 1
        }
        return rleft
      } else {
//    2+                0           2+               1           
// |x|    1         2    |x|     |x|    2        1    |x|        
//     |x| |x|   |x| |x| |1|         |x| |x|  |x| |x| |1|        
//     |1| |1|       |1|                 |1|                     
        right[l] = curr
        right[r] = curr[r]
        curr[r] = rright
        left[r] = rleft    //   c             r       
        if (rdiff === 1) { // l    r2      c    rr0   
          rright[r] = 0    //    rl rr1   l rl2
          rleft[r] = 2     
        } else {           //   c             r       
          rright[r] = 1    // l    r2      c    rr1   
          rleft[r] = 1     //    rl rr2   l rl1
        }                   
        return right  
      }
    }
  }                       

  function walkTree(node, action, depth) {
    let left = node[l]
    if (typeof left === 'number') {
      action(node, left, depth)
    } else {
      let right = left[r]
      if (typeof right === 'number') {
        if (right === 0) {
          walkTree(left, action, depth + 1)
          action(node, right, depth)
        } else {
          action(node, right, depth)
          walkTree(left, action, depth + 1)
        }
      } else { 
        walkTree(left, action, depth + 1)
        action(node, right[r], depth)
        walkTree(right, action, depth + 1)
      }
    }
  }  
  return class IntrusiveIndex {
    constructor(comp) {
      this.comp = comp
      this.root = null
    }
    add(node) {
      let { root, comp } = this
      if (root === null) {
        this.root = node
        node[r] = 0
        node[l] = 1
        return true
      } else {
        let a = addNode(root, node, comp)
        if (a.node !== null) {
          this.root = a.node
          a.node = null
        }
        return a.added
      }
    }
    get(value) {
      let { root, comp } = this
      if (root == null) return
      while (true) {
        let cmp = comp(root, value)
        if (cmp < 0) {
          let left = root[l]
          if (typeof left === 'number') break
          let right = left[r]
          if (typeof right === 'number') {
            if (right === 2) root = left
            else break
          } else {
            root = right
          }
        } else if (cmp > 0) {
          let left = root[l]
          if (typeof left === 'number') break
          let right = left[r]
          if (typeof right === 'number') {
            if (right === 0) root = left
            else break
          } else {
            root = left
          }
        } else if (cmp === 0) {
          return root
        } else break
      }
    }
    walk(action) {
      let { root } = this
      if (root === null) return
      walkTree(root, action, 0)
    }
  
    static get l() {
      return l
    }
    static get r() {
      return r
    }
  }
}


function print(index) {
  let nodes = []
  index.walk((node, diff, depth) => {
    let sign = 
      diff === 1 ? ' =' : 
      diff === 0 ? ' <' : 
      diff === 2 ? ' >' : ' ?'
    nodes.push(' '.repeat(depth) + node.value + sign)
  })
  nodes.reverse()
  for (let node of nodes) {
    console.log(node)
  }
}

let IIA = constructorFactory('left', 'right')

for (let i = 0; i < 10; i++) {
  let index = new IIA((a, b) => a.value - b.value)
  let values = Array(1000).fill(0)
    .map((_, i) => i)
    .sort((a, b) => Math.random() - 0.5)
  for (let value of values) {
    index.add({ ['foo_' + i]: true, value })
  }
  let sum = 0
  for (let value of values) {
    sum += index.get({ value }).value
  }
}
let index = new IIA((a, b) => a.value - b.value)
let values = Array(1000000).fill(0)
  .map((_, i) => i)
  .sort((a, b) => Math.random() - 0.5)
function Row(value) {
  this.value = value
  this[IIA.l] = null
  this[IIA.r] = null
}
let start = Date.now()
for (let i = 0; i < values.length; i++) {
  index.add(new Row(values[i]))
}
console.log(Date.now() - start)
start = Date.now()
let sum = 0
for (let i = 0; i < values.length; i++) {
  let value = values[i]
  sum += index.get({ value }).value
}
console.log(Date.now() - start, sum)
// console.log(JSON.stringify(index.root, null, 2))
// print(index)
