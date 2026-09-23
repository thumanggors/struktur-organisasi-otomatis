"use client";

import { Tree, TreeNode } from "react-organizational-chart";
import { User } from "lucide-react";
import type { PersonNode } from "@/lib/tree";

const LEVEL_ACCENTS = ["border-l-slate-900", "border-l-sky-600", "border-l-emerald-600", "border-l-amber-500"];

function Card({ node, depth }: { node: PersonNode; depth: number }) {
  const accent = LEVEL_ACCENTS[depth % LEVEL_ACCENTS.length];
  return (
    <div
      className={`inline-flex min-w-[11rem] flex-col items-center gap-1 rounded-lg border border-slate-200 border-l-4 bg-white p-3 text-center shadow-sm ${accent}`}
      title={node.jobdesk || undefined}
    >
      {node.fotoUrl ? (
        <img src={node.fotoUrl} alt={node.nama} className="h-14 w-14 rounded-full object-cover ring-2 ring-slate-100" />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
          <User className="h-6 w-6" aria-hidden="true" />
        </div>
      )}
      <p className="font-semibold text-slate-900">{node.nama}</p>
      <p className="text-sm text-slate-500">{node.jabatan}</p>
      {node.divisi && (
        <span className="mt-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{node.divisi}</span>
      )}
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
    return <p className="text-slate-500">Belum ada data orang.</p>;
  }

  return (
    <div id="org-chart-capture" className="inline-block bg-white p-4">
      {roots.map((root) => (
        <Tree key={root.id} label={<Card node={root} depth={0} />} lineWidth="2px" lineColor="#cbd5e1" lineBorderRadius="8px">
          {renderChildren(root.children, 1)}
        </Tree>
      ))}
      <p className="mt-4 text-right text-xs text-slate-300">by. Pictor R. Tumanggor</p>
    </div>
  );
}
