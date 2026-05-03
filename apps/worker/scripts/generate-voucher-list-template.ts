import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';

async function generateVoucherListTemplate() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Phần mềm kế toán';
  workbook.created = new Date();
  workbook.modified = new Date();

  const ws = workbook.addWorksheet('Danh Sách Phiếu NK', {
    views: [{ state: 'frozen', ySplit: 5 }],
    pageSetup: {
      paperSize: 9,
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        top: 0.7, bottom: 0.7, left: 0.5, right: 0.5,
        header: 0,
        footer: 0
      },
    },
  });

  const headers = [
    { header: 'STT', key: 'stt', width: 6 },
    { header: 'Số Phiếu', key: 'voucher_number', width: 22 },
    { header: 'Ngày Phiếu', key: 'voucher_date', width: 16 },
    { header: 'Trạng Thái', key: 'status', width: 16 },
    { header: 'Người Giao Hàng', key: 'deliverer_name', width: 30 },
    { header: 'Kho Nhập', key: 'warehouse_id', width: 25 },
    { header: 'Đơn Vị', key: 'unit_name', width: 25 },
    { header: 'Bộ Phận', key: 'department_name', width: 25 },
    { header: 'TK Nợ', key: 'debit_account', width: 15 },
    { header: 'TK Có', key: 'credit_account', width: 15 },
    { header: 'Tổng Tiền (VNĐ)', key: 'total_amount_numeric', width: 22 },
    { header: 'Ghi Chú', key: 'reference_source', width: 35 },
  ];

  // Set column mapping and widths (don't set 'header' here to avoid Row 1 overwrite)
  ws.columns = headers.map(h => ({ key: h.key, width: h.width }));

  ws.mergeCells('A1:L1');
  const compNameCell = ws.getCell('A1');
  compNameCell.value = 'CÔNG TY ABC';
  compNameCell.font = { name: 'Times New Roman', size: 14, bold: true };
  compNameCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 22;

  ws.mergeCells('A2:L2');
  const addressCell = ws.getCell('A2');
  addressCell.value = 'Địa chỉ: ABC - MST: 123456789';
  addressCell.font = { name: 'Times New Roman', size: 11, italic: true };
  addressCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 18;

  ws.mergeCells('A3:L3');
  const titleCell = ws.getCell('A3');
  titleCell.value = 'DANH SÁCH PHIẾU NHẬP KHO';
  titleCell.font = { name: 'Times New Roman', size: 16, bold: true, color: { argb: 'FFC00000' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(3).height = 25;

  ws.mergeCells('A4:L4');
  const dateCell = ws.getCell('A4');
  dateCell.value = `Ngày in: ${new Date().toLocaleDateString('vi-VN')}`;
  dateCell.font = { name: 'Times New Roman', size: 10, italic: true };
  dateCell.alignment = { horizontal: 'right', vertical: 'middle' };
  ws.getRow(4).height = 18;

  // Style for header row
  const headerRow = ws.getRow(5);
  headerRow.height = 20;
  headerRow.values = headers.map(h => h.header); // Explicitly set visual headers
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F4E79' },
    };
    cell.font = { name: 'Times New Roman', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  const numberOfEmptyRows = 20;
  const startDataRow = 6;
  const endDataRow = startDataRow + numberOfEmptyRows - 1; // 25

  for (let i = startDataRow; i <= endDataRow; i++) {
    const row = ws.addRow([]); // Add empty row (all cells are null)
    row.height = 18;

    // Default formatting for each cell
    row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    // Auto-increment serial number if Col B is not empty (hidden formula, light gray font)
    row.getCell(1).value = {
      formula: `IF(B${i}="","",ROW()-5)`,
      result: undefined
    };
    row.getCell(1).font = { name: 'Times New Roman', size: 11, color: { argb: 'FF888888' } };

    row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(2).font = { name: 'Times New Roman', size: 11 };
    row.getCell(2).numFmt = '@'; // Text

    row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(3).numFmt = 'dd/mm/yyyy';
    row.getCell(3).font = { name: 'Times New Roman', size: 11 };

    row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(4).font = { name: 'Times New Roman', size: 11 };

    row.getCell(5).alignment = { vertical: 'middle' };
    row.getCell(5).font = { name: 'Times New Roman', size: 11 };

    row.getCell(6).alignment = { vertical: 'middle' };
    row.getCell(6).font = { name: 'Times New Roman', size: 11 };

    row.getCell(7).alignment = { vertical: 'middle' };
    row.getCell(7).font = { name: 'Times New Roman', size: 11 };

    row.getCell(8).alignment = { vertical: 'middle' };
    row.getCell(8).font = { name: 'Times New Roman', size: 11 };

    row.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(9).font = { name: 'Times New Roman', size: 11 };

    row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
    row.getCell(10).font = { name: 'Times New Roman', size: 11 };

    row.getCell(11).alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell(11).numFmt = '#,##0';
    row.getCell(11).font = { name: 'Times New Roman', size: 11 };

    row.getCell(12).alignment = { vertical: 'middle', wrapText: true };
    row.getCell(12).font = { name: 'Times New Roman', size: 11 };

    // Border for the entire row
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Zebra striping (light gray background for even rows)
    if (i % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF2F2F2' },
        };
      });
    }
  }

  const totalRow = ws.addRow([]);
  totalRow.height = 22;
  const totalRowNumber = totalRow.number; // 26

  ws.mergeCells(`A${totalRowNumber}:J${totalRowNumber}`);
  const totalLabelCell = totalRow.getCell(1);
  totalLabelCell.value = 'TỔNG CỘNG';
  totalLabelCell.font = { name: 'Times New Roman', size: 12, bold: true };
  totalLabelCell.alignment = { horizontal: 'right', vertical: 'middle' };

  const totalValueCell = totalRow.getCell(11);
  totalValueCell.value = {
    formula: `SUBTOTAL(9,K${startDataRow}:K${endDataRow})`,
    result: 0
  };
  totalValueCell.numFmt = '#,##0';
  totalValueCell.font = { name: 'Times New Roman', size: 12, bold: true, color: { argb: 'FFC00000' } };
  totalValueCell.alignment = { horizontal: 'right', vertical: 'middle' };

  // Thick border for total row
  totalRow.eachCell((cell, colNumber) => {
    cell.border = {
      top: { style: 'medium' },
      left: colNumber === 1 || colNumber === 11 ? { style: 'medium' } : { style: 'thin' },
      bottom: { style: 'medium' },
      right: colNumber === 11 || colNumber === 12 ? { style: 'medium' } : { style: 'thin' },
    };
  });

  const statusLabels = {
    draft: 'Bản nháp',
    posted: 'Đã đăng',
    cancelled: 'Đã hủy',
  };

  const statusValidation = {
    type: 'list' as const,
    allowBlank: true,
    formulae: [`"${Object.values(statusLabels).join(',')}"`],
    showErrorMessage: true,
    errorTitle: 'Trạng thái không hợp lệ',
    error: `Vui lòng chọn trạng thái từ danh sách (${Object.values(statusLabels).join(', ')}).`,
  };

  for (let i = startDataRow; i <= endDataRow; i++) {
    ws.getCell(`D${i}`).dataValidation = statusValidation;
  }

  ws.autoFilter = `A5:L5`;

  const outputPath = path.resolve(process.cwd(), './packages/templates/danh_sach_phieu_nhap_kho.xlsx');
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  await workbook.xlsx.writeFile(outputPath);
  console.log(`Data entry template has been created at: ${outputPath}`);
}

generateVoucherListTemplate().catch(console.error);