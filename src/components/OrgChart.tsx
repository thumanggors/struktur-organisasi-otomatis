"use client";

import { Tree, TreeNode } from "react-organizational-chart";
import type { PersonNode } from "@/lib/tree";

function Card({ node }: { node: PersonNode }) {
  return (
    <div className="inline-flex flex-col items-center gap-1 rounded border bg-white p-3 shadow-sm">
      {node.fotoUrl ? (
        <img src={node.fotoUrl} alt={node.nama} className="h-14 w-14 rounded-full object-cover" />
      ) : (
        <div className="h-14 w-14 rounded-full bg-gray-200" />
      )}
      <p className="font-semibold">{node.nama}</p>
      <p className="text-sm text-gray-600">{node.jabatan}</p>
      {node.divisi && <p className="text-xs text-gray-400">{node.divisi}</p>}
    </div>
  );
}

function renderNode(node: PersonNode) {
  return (
    <TreeNode key={node.id} label={<Card node={node} />}>
      {node.children.map((child) => renderNode(child))}
    </TreeNode>
  );
}

export default function OrgChart({ roots }: { roots: PersonNode[] }) {
  if (roots.length === 0) {
    return <p className="text-gray-500">Belum ada data orang.</p>;
  }

  return (
    <div id="org-chart-capture" className="inline-block bg-white p-4">
      {roots.map((root) => (
        <Tree key={root.id} label={<Card node={root} />} lineWidth="2px" lineColor="#bbb" lineBorderRadius="8px">
          {root.children.map((child) => renderNode(child))}
        </Tree>
      ))}
    </div>
  );
}
