"use client"

import Link from "next/link"
import type { CSSProperties } from "react"
import { useMemo, useState } from "react"
import { ArrowRight, CircleDot, GitBranch, Info } from "lucide-react"
import type { GraphNode, StreamGraph } from "@/lib/data"
import type { StreamTreeGroup, StreamTreeNode } from "@/lib/tree"
import { TypeBadge } from "./TypeBadge"

const maxProductsPerChain = 7
const representativeProductsByChain: Record<string, string[]> = {
  polyolefin: ["HDPE", "LDPE", "LLDPE"],
  "eo-eg": ["EO", "MEG", "PET"],
  pvc: ["EDC", "VCM", "PVC"],
  "oxo-alcohol": ["Ethanol", "2-Ethylhexanol"],
  acetate: ["VAM", "EVA", "PVA"],
  other: []
}

export function RadialStreamMap({ graph, treeGroups }: { graph: StreamGraph; treeGroups: StreamTreeGroup[] }) {
  const roots = graph.nodes.filter((node) => node.depth === 0)
  const feedstock = roots[0]
  const [activeChain, setActiveChain] = useState<string | null>(null)
  const [showAllProducts, setShowAllProducts] = useState(false)
  const chains = useMemo(() => treeGroups.map((group, index) => toRadialChain(group, index, treeGroups.length)), [treeGroups])

  return (
    <div className="radial-layout">
      <aside className="radial-panel chain-panel">
        <div>
          <span className="eyebrow">Chains ({chains.length})</span>
        </div>
        <div className="chain-card-list">
          {chains.map((chain) => (
            <button
              className={`chain-card ${activeChain === chain.id ? "active" : ""}`}
              key={chain.id}
              onClick={() => setActiveChain(activeChain === chain.id ? null : chain.id)}
              style={{ "--chain-color": chain.color } as CustomProperties}
              type="button"
            >
              <span>
                <strong>{chain.label}</strong>
                <small>
                  <span className="chain-badge">{chain.classification}</span>
                  {chain.materialCount} materials
                </small>
              </span>
              <ArrowRight size={16} />
            </button>
          ))}
        </div>
      </aside>

      <section className="radial-stage" aria-label={`${graph.stream.label} radial downstream map`}>
        <label className="show-all-toggle">
          <input checked={showAllProducts} onChange={(event) => setShowAllProducts(event.target.checked)} type="checkbox" />
          Show all products
        </label>
        {feedstock ? <FeedstockNode node={feedstock} /> : null}
        {chains.map((chain) => (
          <ChainCluster
            active={activeChain === null || activeChain === chain.id}
            chain={chain}
            key={chain.id}
            onSelect={() => setActiveChain(activeChain === chain.id ? null : chain.id)}
            showExpanded={showAllProducts || activeChain === chain.id}
            showAllProducts={showAllProducts}
          />
        ))}
      </section>

      <aside className="radial-panel map-info-panel">
        <div className="info-card">
          <h3><Info size={15} /> About this map</h3>
          <p>Radial view of key downstream chains and representative products. Click any chain to focus it, or click a product for material details.</p>
        </div>
        <div className="info-card legend-card">
          <h3>Legend</h3>
          <span><GitBranch size={14} /> Chain node</span>
          <span><CircleDot size={14} /> Product node</span>
          <span><span className="legend-dot muted" /> Other product</span>
          <span><ArrowRight size={14} /> Direction</span>
        </div>
      </aside>
    </div>
  )
}

type RadialChain = {
  id: string
  label: string
  classification: string
  color: string
  angle: number
  materialCount: number
  products: StreamTreeNode[]
  allProducts: StreamTreeNode[]
  hiddenCount: number
}

function ChainCluster({
  active,
  chain,
  onSelect,
  showExpanded,
  showAllProducts
}: {
  active: boolean
  chain: RadialChain
  onSelect: () => void
  showExpanded: boolean
  showAllProducts: boolean
}) {
  const chainRadius = 30
  const productRadius = 16
  const visibleProducts = showAllProducts ? chain.allProducts : showExpanded ? chain.allProducts.slice(0, maxProductsPerChain) : chain.products
  const hiddenCount = Math.max(0, chain.allProducts.length - visibleProducts.length)
  const x = 50 + Math.cos(chain.angle) * chainRadius
  const y = 50 + Math.sin(chain.angle) * chainRadius
  const productAngles = productSpread(chain.angle, visibleProducts.length)
  const moreX = 50 + Math.cos(chain.angle) * (chainRadius + 15)
  const moreY = 50 + Math.sin(chain.angle) * (chainRadius + 15)

  return (
    <div className={`radial-chain ${active ? "active" : "dimmed"}`} style={{ "--chain-color": chain.color } as CustomProperties}>
      <svg className="radial-connector" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <line x1="50" y1="50" x2={x} y2={y} />
        {visibleProducts.map((product, index) => {
          const productX = 50 + Math.cos(productAngles[index]) * productRadius + Math.cos(chain.angle) * chainRadius
          const productY = 50 + Math.sin(productAngles[index]) * productRadius + Math.sin(chain.angle) * chainRadius
          return <line key={product.id} x1={x} y1={y} x2={productX} y2={productY} />
        })}
      </svg>
      <button className="chain-node" onClick={onSelect} style={{ left: `${x}%`, top: `${y}%` }} type="button">
        <GitBranch size={20} />
        <strong>{chain.label}</strong>
        <span>{chain.classification}</span>
      </button>
      {visibleProducts.map((product, index) => {
        const productX = 50 + Math.cos(productAngles[index]) * productRadius + Math.cos(chain.angle) * chainRadius
        const productY = 50 + Math.sin(productAngles[index]) * productRadius + Math.sin(chain.angle) * chainRadius
        return (
          <Link
            className="product-node"
            href={`/materials/${product.id}`}
            key={product.id}
            style={{ left: `${productX}%`, top: `${productY}%` }}
            title={[product.material.type, product.material.subtype].filter(Boolean).join(" / ")}
          >
            <span className="product-dot"><CircleDot size={14} /></span>
            <strong>{product.material.name}</strong>
            <small>{product.material.subtype || product.material.type || "Product"}</small>
          </Link>
        )
      })}
      {hiddenCount ? (
        <button className="more-node" onClick={onSelect} style={{ left: `${moreX}%`, top: `${moreY}%` }} type="button">
          +{hiddenCount} more
        </button>
      ) : null}
    </div>
  )
}

function FeedstockNode({ node }: { node: GraphNode }) {
  return (
    <Link className="feedstock-node" href={`/materials/${node.id}`}>
      <span className="feedstock-symbol">C=C</span>
      <strong>{node.name}</strong>
      <TypeBadge type={node.type} />
    </Link>
  )
}

function toRadialChain(group: StreamTreeGroup, index: number, total: number): RadialChain {
  const startAngle = -Math.PI / 2
  const angle = startAngle + (index / Math.max(total, 1)) * Math.PI * 2
  const allProducts = flattenProducts(group.children)
  const representativeNames = representativeProductsByChain[group.id]
  const products = representativeNames
    ? allProducts.filter((product) => representativeNames.includes(product.material.name)).slice(0, 3)
    : allProducts.slice(0, 3)

  return {
    id: group.id,
    label: group.label,
    classification: group.classification,
    color: group.color,
    angle,
    materialCount: uniqueProductCount(allProducts),
    products,
    allProducts,
    hiddenCount: Math.max(0, allProducts.length - products.length)
  }
}

function flattenProducts(nodes: StreamTreeNode[]) {
  const output: StreamTreeNode[] = []
  const seen = new Set<string>()
  const queue = [...nodes]

  while (queue.length) {
    const node = queue.shift()
    if (!node || seen.has(node.id)) continue
    seen.add(node.id)
    output.push(node)
    queue.push(...node.children)
  }

  return output
}

function uniqueProductCount(nodes: StreamTreeNode[]) {
  return new Set(nodes.map((node) => node.id)).size
}

function productSpread(chainAngle: number, count: number) {
  if (count <= 1) return [chainAngle]
  const arc = Math.PI * 0.72
  return Array.from({ length: count }, (_, index) => chainAngle - arc / 2 + (arc * index) / (count - 1))
}

type CustomProperties = CSSProperties & Record<`--${string}`, string>
