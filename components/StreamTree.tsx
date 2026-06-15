"use client"

import Link from "next/link"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { StreamTreeGroup, StreamTreeNode } from "@/lib/tree"
import type { GraphNode } from "@/lib/data"
import { TypeBadge } from "./TypeBadge"

export function StreamTree({ groups, roots }: { groups: StreamTreeGroup[]; roots: GraphNode[] }) {
  return (
    <div className="tree-map">
      <div className="tree-root-row">
        {roots.map((root) => (
          <Link className="tree-root-material" href={`/materials/${root.id}`} key={root.id}>
            <span className="tree-material-name">{root.name}</span>
            <span className="tree-material-meta">
              <TypeBadge type={root.type} />
              {root.subtype ? <span>{root.subtype}</span> : null}
            </span>
          </Link>
        ))}
      </div>
      {groups.map((group) => (
        <details className="tree-group" key={group.id} open>
          <summary>
            <span className="tree-toggle"><ChevronRight className="closed" size={15} /><ChevronDown className="open" size={15} /></span>
            <span>{group.label}</span>
          </summary>
          <div className="tree-children">
            {group.children.map((node) => (
              <TreeNode node={node} key={node.id} />
            ))}
          </div>
        </details>
      ))}
    </div>
  )
}

function TreeNode({ node }: { node: StreamTreeNode }) {
  const content = (
    <Link className="tree-material" href={`/materials/${node.id}`} onClick={(event) => event.stopPropagation()}>
      <span className="tree-material-name">{node.material.name}</span>
      <span className="tree-material-meta">
        <TypeBadge type={node.material.type} />
        {node.material.subtype ? <span>{node.material.subtype}</span> : null}
        {node.material.ccma ? <span>CCMA</span> : null}
        {node.material.ceh ? <span>CEH</span> : null}
      </span>
    </Link>
  )

  if (!node.children.length) {
    return <div className="tree-node leaf">{content}</div>
  }

  return (
    <details className="tree-node" open>
      <summary>
        <span className="tree-toggle"><ChevronRight className="closed" size={14} /><ChevronDown className="open" size={14} /></span>
        {content}
      </summary>
      <div className="tree-children">
        {node.children.map((child) => (
          <TreeNode node={child} key={`${node.id}-${child.id}`} />
        ))}
      </div>
    </details>
  )
}
