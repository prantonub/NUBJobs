"use client";

import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  header: React.ReactNode;
  /** Key to read from the row when no custom `cell` is provided. */
  accessor?: keyof T;
  /** Custom cell renderer; takes precedence over `accessor`. */
  cell?: (row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  isLoading?: boolean;
  pageSize?: number;
  rowKey?: (row: T, index: number) => React.Key;
  emptyState?: React.ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
}

/**
 * Generic, client-paginated table built on the shadcn Table primitive.
 * Supports column accessors or custom cell renderers, a loading skeleton,
 * an empty state, and simple client-side pagination.
 */
export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  pageSize = 10,
  rowKey,
  emptyState,
  onRowClick,
  className,
}: DataTableProps<T>) {
  const [page, setPage] = React.useState(0);
  const pageCount = Math.max(1, Math.ceil(data.length / pageSize));
  const current = Math.min(page, pageCount - 1);

  React.useEffect(() => {
    if (page > pageCount - 1) setPage(pageCount - 1);
  }, [page, pageCount]);

  const rows = React.useMemo(
    () => data.slice(current * pageSize, current * pageSize + pageSize),
    [data, current, pageSize]
  );

  const renderCell = (
    col: DataTableColumn<T>,
    row: T,
    index: number
  ): React.ReactNode => {
    if (col.cell) return col.cell(row, index);
    if (col.accessor) return row[col.accessor] as unknown as React.ReactNode;
    return null;
  };

  const skeletonRows = Math.min(pageSize, 5);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="overflow-hidden rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, i) => (
                <TableHead key={i} className={col.headerClassName}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: skeletonRows }).map((_, r) => (
                <TableRow key={`skeleton-${r}`}>
                  {columns.map((_, c) => (
                    <TableCell key={c}>
                      <Skeleton className="h-4 w-full max-w-[160px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 p-0">
                  {emptyState ?? (
                    <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                      No records found.
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, i) => (
                <TableRow
                  key={rowKey ? rowKey(row, i) : i}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={onRowClick ? "cursor-pointer" : undefined}
                >
                  {columns.map((col, c) => (
                    <TableCell key={c} className={col.className}>
                      {renderCell(col, row, current * pageSize + i)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!isLoading && data.length > pageSize ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Showing {current * pageSize + 1}–
            {Math.min((current + 1) * pageSize, data.length)} of {data.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={current === 0}
            >
              <ChevronLeftIcon className="size-4" />
              Prev
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {current + 1} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={current >= pageCount - 1}
            >
              Next
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
