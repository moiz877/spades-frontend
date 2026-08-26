'use client';

import { useEffect, useState } from 'react';
import { CaretRight, CaretDown, FileText } from '@phosphor-icons/react';
import { SkeletonLine, SkeletonList } from '@/components/ui/Skeleton';
import type { CategoryNode } from '@/app/api/series/categories/route';
import type { SeriesSource } from '@/lib/types';

interface CategoryTreeProps {
  source: SeriesSource;
  selectedIds: Set<string>;
  onToggleSeries: (seriesId: string, seriesName: string) => void;
}

export function CategoryTree({ source, selectedIds, onToggleSeries }: CategoryTreeProps) {
  return (
    <TreeLevel
      source={source}
      prefix=""
      depth={0}
      selectedIds={selectedIds}
      onToggleSeries={onToggleSeries}
    />
  );
}

function TreeLevel({
  source,
  prefix,
  depth,
  selectedIds,
  onToggleSeries,
}: {
  source: SeriesSource;
  prefix: string;
  depth: number;
  selectedIds: Set<string>;
  onToggleSeries: (seriesId: string, seriesName: string) => void;
}) {
  const [nodes, setNodes] = useState<CategoryNode[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ source });
    if (prefix) params.set('prefix', prefix);

    fetch(`/api/series/categories?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setNodes(data.nodes ?? []);
      })
      .catch(() => {
        if (!cancelled) setNodes([]);
      });

    return () => {
      cancelled = true;
    };
  }, [source, prefix]);

  if (nodes === null) {
    if (depth === 0) {
      return <SkeletonList rows={6} />;
    }
    return (
      <div style={{ paddingLeft: depth * 14 + 8, paddingTop: 4, paddingBottom: 4 }}>
        <SkeletonLine className="h-6 w-2/3" />
      </div>
    );
  }

  if (nodes.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-col gap-0.5">
      {nodes.map((node) => (
        <TreeNode
          key={node.value}
          node={node}
          source={source}
          prefix={prefix}
          depth={depth}
          selectedIds={selectedIds}
          onToggleSeries={onToggleSeries}
        />
      ))}
    </ul>
  );
}

function TreeNode({
  node,
  source,
  prefix,
  depth,
  selectedIds,
  onToggleSeries,
}: {
  node: CategoryNode;
  source: SeriesSource;
  prefix: string;
  depth: number;
  selectedIds: Set<string>;
  onToggleSeries: (seriesId: string, seriesName: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const childPrefix = prefix ? `${prefix}.${node.value}` : node.value;
  const isSelected = node.isLeaf && node.seriesId ? selectedIds.has(node.seriesId) : false;

  if (node.isLeaf && node.seriesId) {
    return (
      <li>
        <button
          type="button"
          onClick={() => onToggleSeries(node.seriesId!, node.seriesName ?? node.value)}
          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition ${
            isSelected ? 'bg-cyan-500/10 text-cyan-300' : 'text-white/70 hover:bg-white/5'
          }`}
          style={{ paddingLeft: depth * 14 + 8 }}
        >
          <FileText size={14} className="shrink-0" />
          <span className="truncate">{node.seriesName ?? node.value}</span>
        </button>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-white/80 transition hover:bg-white/5"
        style={{ paddingLeft: depth * 14 }}
      >
        {expanded ? <CaretDown size={14} /> : <CaretRight size={14} />}
        <span className="truncate">{node.value}</span>
        <span className="ml-auto font-mono-tabular text-xs text-white/30">{node.count}</span>
      </button>
      {expanded && (
        <TreeLevel
          source={source}
          prefix={childPrefix}
          depth={depth + 1}
          selectedIds={selectedIds}
          onToggleSeries={onToggleSeries}
        />
      )}
    </li>
  );
}
