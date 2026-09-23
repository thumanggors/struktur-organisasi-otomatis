"use client";

import { Tree, TreeNode } from "react-organizational-chart";
import type { PersonNode } from "@/lib/tree";

const LEVEL_STYLES = [
  "bg-purple-100 border-purple-400",
  "bg-green-100 border-green-400",
  "bg-blue-100 border-blue-400",
  "bg-amber-100 border-amber-400",
];

function Card({ node, depth }: { node: PersonNode; depth: number }) {
  const style = LEVEL_STYLES[depth % LEVEL_STYLES.length];
  return (
    <div
      className={`inline-flex flex-col items-center gap-1 rounded border p-3 shadow-sm ${style}`}
      title={node.jobdesk || undefined}
    >
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

function renderNode(node: PersonNode, depth: number) {
  return (
    <TreeNode key={node.id} label={<Card node={node} depth={depth} />}>
      {renderChildren(node.children, depth + 1)}
    </TreeNode>
  );
}

function renderChildren(children: PersonNode[], depth: number) {
  const allLeaves = children.every((c) => c.children.length === 0);

  if (children.length > 3 && allLeaves) {
    return (
      <TreeNode
        label={
          <div className="grid grid-cols-2 gap-2">
            {children.map((child) => (
              <Card key={child.id} node={child} depth={depth} />
            ))}
          </div>
        }
      />
    );
  }

  return children.map((child) => renderNode(child, depth));
}

export default function OrgChart({ roots }: { roots: PersonNode[] }) {
  if (roots.length === 0) {
    return <p className="text-gray-500">Belum ada data orang.</p>;
  }

  return (
    <div id="org-chart-capture" className="inline-block bg-white p-4">
      {roots.map((root) => (
        <Tree key={root.id} label={<Card node={root} depth={0} />} lineWidth="2px" lineColor="#bbb" lineBorderRadius="8px">
          {renderChildren(root.children, 1)}
        </Tree>
      ))}
    </div>
  );
}
