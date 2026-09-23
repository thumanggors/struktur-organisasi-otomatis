"use client";

import { Tree, TreeNode } from "react-organizational-chart";
import { User } from "lucide-react";
import type { PersonNode } from "@/lib/tree";
import { splitStaff } from "@/lib/tree";
import { divisiColorFor, type DivisiColorMap, type DivisiColorSet } from "@/lib/divisiColor";

const NEUTRAL: DivisiColorSet = {
  badge: "bg-slate-100 text-slate-700",
  solid: "bg-slate-800",
  border: "border-slate-800",
  bg: "bg-slate-800",
};

function Card({ node, colorMap }: { node: PersonNode; colorMap: DivisiColorMap }) {
  const color = node.divisi ? divisiColorFor(colorMap, node.divisi) : NEUTRAL;
  return (
    <div className="inline-flex min-w-[11rem] flex-col items-center overflow-hidden rounded-lg border border-slate-200 bg-white text-center shadow-sm">
      <div className={`h-1.5 w-full ${color.bg}`} aria-hidden="true" />
      <div className="flex flex-col items-center gap-1 p-3" title={node.jobdesk || undefined}>
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
          <span className={`mt-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${color.badge}`}>{node.divisi}</span>
        )}
      </div>
    </div>
  );
}

/** A Wakil Direktur/Sekretaris and (if any) their own reports, still nested below them. */
function StaffBranch({ node, colorMap }: { node: PersonNode; colorMap: DivisiColorMap }) {
  if (node.children.length === 0) return <Card node={node} colorMap={colorMap} />;
  return (
    <Tree label={<Card node={node} colorMap={colorMap} />} lineWidth="2px" lineColor="#cbd5e1" lineBorderRadius="8px">
      {renderChildren(node.children, colorMap)}
    </Tree>
  );
}

/**
 * A node's own card, plus any staff positions (Wakil Direktur/Sekretaris)
 * hanging off a trunk that drops from the card and branches right. The
 * trunk (left grid column) stretches to match the staff column's real
 * height, so it's part of normal document flow — the "line" reports
 * below are correctly pushed down to make room, not overlapped.
 */
function NodeLabel({
  node,
  staff,
  colorMap,
}: {
  node: PersonNode;
  staff: PersonNode[];
  colorMap: DivisiColorMap;
}) {
  if (staff.length === 0) return <Card node={node} colorMap={colorMap} />;
  return (
    <div className="inline-flex flex-col items-center">
      <Card node={node} colorMap={colorMap} />
      {/* Equal side columns keep the trunk exactly under the card's center. */}
      <div className="grid w-max grid-cols-[1fr_2px_1fr]">
        <div aria-hidden="true" />
        <div className="bg-slate-300" aria-hidden="true" />
        <div className="flex flex-col gap-4 pt-4 pb-6">
          {staff.map((s) => (
            <div key={s.id} className="flex items-start">
              {/* mt-16 ≈ half a card's height, so the tick meets the staff card itself, not its subtree. */}
              <div className="mt-16 h-0.5 w-6 shrink-0 bg-slate-300" aria-hidden="true" />
              <StaffBranch node={s} colorMap={colorMap} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function renderNode(node: PersonNode, colorMap: DivisiColorMap) {
  const { staff, line } = splitStaff(node.children);
  return (
    <TreeNode key={node.id} label={<NodeLabel node={node} staff={staff} colorMap={colorMap} />}>
      {renderChildren(line, colorMap)}
    </TreeNode>
  );
}

function renderChildren(children: PersonNode[], colorMap: DivisiColorMap) {
  const allLeaves = children.every((c) => c.children.length === 0);

  if (children.length > 3 && allLeaves) {
    return (
      <TreeNode
        label={
          // max-content columns: a 1fr grid shrinks to the parent's width and the cards overlap.
          <div className="grid w-max grid-cols-[repeat(2,max-content)] gap-3">
            {children.map((child) => (
              <Card key={child.id} node={child} colorMap={colorMap} />
            ))}
          </div>
        }
      />
    );
  }

  return children.map((child) => renderNode(child, colorMap));
}

export default function OrgChart({
  roots,
  companyName,
  logoUrl,
  colorMap,
}: {
  roots: PersonNode[];
  companyName?: string | null;
  logoUrl?: string | null;
  colorMap: DivisiColorMap;
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
            label={<NodeLabel node={root} staff={staff} colorMap={colorMap} />}
            lineWidth="2px"
            lineColor="#cbd5e1"
            lineBorderRadius="8px"
          >
            {renderChildren(line, colorMap)}
          </Tree>
        );
      })}
    </div>
  );
}
