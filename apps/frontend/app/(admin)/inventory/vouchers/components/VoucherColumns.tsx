import React from 'react';
import { ColumnDef } from '@/components/shared/DataTable/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, FileText, Edit, Trash } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { createCurrencyFormatter, createDateFormatter } from '@/lib/formatter';
import { ParamValue } from 'next/dist/server/request/params';

export type Voucher = {
  id: string;
  voucherNo: string;
  date: string;
  supplier: string;
  totalAmount: number;
  status: 'draft' | 'posted' | 'cancelled';
  creator: string;
};

const getStatusBadge = (
  status: Voucher['status'],
  t: (key: string, options?: any) => string
) => {
  switch (status) {
    case 'posted':
      return (
        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none shadow-none">
          {t('status.posted', { fallback: 'Posted' })}
        </Badge>
      );
    case 'draft':
      return (
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-none">
          {t('status.draft', { fallback: 'Draft' })}
        </Badge>
      );
    case 'cancelled':
      return (
        <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-200 border-none shadow-none">
          {t('status.cancelled', { fallback: 'Cancelled' })}
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const DateCell = React.memo(({ date, locale, timezone }: { date: string, locale: ParamValue, timezone: string }) => {
  return (
    <span>
      {createDateFormatter(locale, timezone).format(new Date(date))}
    </span>
  );
});

export const getVoucherColumns = (
  t: (key: string, options?: any) => string,
  locale: ParamValue,
  timezone: string,
): ColumnDef<Voucher>[] => [
  {
    id: 'voucherNo',
    header: t('voucherNo', { fallback: 'Voucher No' }),
    cell: (row) => <span className="font-semibold">{row.voucherNo}</span>,
    sortable: true,
  },
  {
    id: 'date',
    header: t('date', { fallback: 'Date' }),
    cell: (row) => <DateCell date={row.date} locale={locale} timezone={timezone} />,
    sortable: true,
  },
  {
    id: 'supplier',
    header: t('supplier', { fallback: 'Supplier' }),
    cell: (row) => row.supplier,
    sortable: true,
  },
  {
    id: 'totalAmount',
    header: t('totalAmount', { fallback: 'Total Amount' }),
    className: 'text-right justify-end',
    cell: (row) => (
      <span className="font-medium">
        {createCurrencyFormatter(locale).format(row.totalAmount)}
      </span>
    ),
    sortable: true,
  },
  {
    id: 'creator',
    header: t('creator', { fallback: 'Creator' }),
    cell: (row) => row.creator,
  },
  {
    id: 'status',
    header: t('status.status', { fallback: 'Status' }),
    className: 'w-32 flex-none text-center',
    cell: (row) => getStatusBadge(row.status, t),
  },
  {
    id: 'actions',
    header: '',
    className: 'w-20 flex-none justify-end text-right',
    cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <FileText className="mr-2 h-4 w-4" /> View Details
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Edit className="mr-2 h-4 w-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive">
            <Trash className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];