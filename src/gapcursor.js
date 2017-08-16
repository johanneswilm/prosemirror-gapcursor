import {Selection} from "prosemirror-state"
import {Slice} from "prosemirror-model"

// ::- Gap cursor selections are represented using this class. Its
// `$anchor` and `$head` properties both point at the cursor position.
export class GapCursor extends Selection {
  // : (ResolvedPos)
  constructor($pos) {
    super($pos, $pos)
  }

  map(doc, mapping) {
    let $pos = doc.resolve(mapping.map(this.$head))
    return GapCursor.valid($pos) ? new GapCursor($pos) : Selection.near($pos)
  }

  content() { return Slice.empty }

  eq(other) {
    return other instanceof GapCursor && other.head == this.head
  }

  toJSON() {
    return {type: "gapcursor", pos: this.head}
  }

  static fromJSON(doc, json) {
    return new GapCursor(doc.resolve(json.pos))
  }

  getBookmark() { return new GapBookmark(this.anchor) }

  static valid($pos) {
    if ($pos.depth > 0 && !$pos.parent.type.spec.isolating) return false
    let index = $pos.index()
    // FIXME handle row/table exception
    return (index == 0 || closedAt($pos.parent.child(index - 1), 1)) &&
      (index == $pos.parent.childCount || closedAt($pos.parent.child(index), -1))
  }

  static findFrom($pos, dir, mustMove) {
    for (let d = $pos.depth;; d--) {
      let parent = $pos.node(d)
      if (d == 0 || parent.type.spec.isolating ||
          (dir > 0 ? $pos.indexAfter(d) < parent.childCount : $pos.index(d) > 0)) {
        if (mustMove && d == $pos.depth) return null
        let $here = $pos.doc.resolve(dir < 0 ? $pos.before(d + 1) : $pos.after(d + 1))
        return GapCursor.valid($here) ? $here : null
      }
    }
  }
}

GapCursor.prototype.visible = false

Selection.jsonID("gapcursor", GapCursor)

class GapBookmark {
  constructor(pos) {
    this.pos = pos
  }
  map(mapping) {
    return new GapBookmark(mapping.map(this.pos))
  }
  resolve(doc) {
    let $pos = doc.resolve(this.pos)
    return GapCursor.valid($pos) ? new GapCursor($pos) : Selection.near($pos)
  }
}

function closedAt(node, side) {
  for (;;) {
    if (node.inlineContent) return false
    if (node.childCount == 0 || node.type.spec.isolating) return true
    node = side < 0 ? node.firstChild : node.lastChild
  }
}