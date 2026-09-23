"use client";

import { Tree, TreeNode } from "react-organizational-chart";
import { User } from "lucide-react";
import type { PersonNode } from "@/lib/tree";
import { splitStaff } from "@/lib/tree";
import { divisiColor } from "@/lib/divisiColor";

const NEUTRAL_ACCENT = "border-l-slate-800";

function Card({ node }: { node: PersonNode }) {
  const accent = node.divisi ? divisiColor(node.divisi).border : NEUTRAL_ACCENT;
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
        <span className={`mt-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${divisiColor(node.divisi).badge}`}>
          {node.divisi}
        </span>
      )}
    </div>
  );
}

/** A Wakil Direktur/Sekretaris and (if any) their own reports, still nested below them. */
function StaffBranch({ node }: { node: PersonNode }) {
  if (node.children.length === 0) return <Card node={node} />;
  return (
    <Tree label={<Card node={node} />} lineWidth="2px" lineColor="#cbd5e1" lineBorderRadius="8px">
      {renderChildren(node.children)}
    </Tree>
  );
}

/** A node's own card, plus any staff positions branching off to its right. */
function NodeLabel({ node, staff }: { node: PersonNode; staff: PersonNode[] }) {
  if (staff.length === 0) return <Card node={node} />;
  return (
    <div className="flex items-start">
      <Card node={node} />
      <div className="ml-3 flex flex-col justify-center gap-3 self-center border-l-2 border-slate-300 pl-3">
        {staff.map((s) => (
          <div key={s.id} className="relative">
            <div
              className="absolute top-1/2 -left-3 h-0.5 w-3 -translate-y-1/2 bg-slate-300"
              aria-hidden="true"
            />
            <StaffBranch node={s} />
          </div>
        ))}
      </div>
    </div>
  );
}

function renderNode(node: PersonNode) {
  const { staff, line } = splitStaff(node.children);
  return (
    <TreeNode key={node.id} label={<NodeLabel node={node} staff={staff} />}>
      {renderChildren(line)}
    </TreeNode>
  );
}

function renderChildren(children: PersonNode[]) {
  const allLeaves = children.every((c) => c.children.length === 0);

  if (children.length > 3 && allLeaves) {
    return (
      <TreeNode
        label={
          <div className="grid grid-cols-2 gap-2">
            {children.map((child) => (
              <Card key={child.id} node={child} />
            ))}
          </div>
        }
      />
    );
  }

  return children.map((child) => renderNode(child));
}

export default function OrgChart({
  roots,
  companyName,
  logoUrl,
}: {
  roots: PersonNode[];
  companyName?: string | null;
  logoUrl?: string | null;
}) {
  if (roots.length === 0) {
    return <p className="text-slate-500">Belum ada data orang.</p>;
  }

  return (
    <div id="org-chart-capture" className="inline-block bg-white p-4">
      {(companyName || logoUrl) && (
        <div className="mb-6 flex flex-col items-center gap-2 border-b border-slate-100 pb-4">
          {logoUrl && <img src={logoUrl} alt={companyName ?? "Logo perusahaan"} className="h-16 w-16 object-contain" />}
          {companyName && <h2 className="text-lg font-semibold text-slate-900">{companyName}</h2>}
        </div>
      )}
      {roots.map((root) => {
        const { staff, line } = splitStaff(root.children);
        return (
          <Tree
            key={root.id}
            label={<NodeLabel node={root} staff={staff} />}
            lineWidth="2px"
            lineColor="#cbd5e1"
            lineBorderRadius="8px"
          >
            {renderChildren(line)}
          </Tree>
        );
      })}
    </div>
  );
}
