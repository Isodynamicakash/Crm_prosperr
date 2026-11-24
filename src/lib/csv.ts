/** Downloads rows as a CSV that Excel opens correctly (UTF-8 with BOM, quoted cells). */
export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const cell = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const text = '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n') + '\r\n';
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The import's own column names, with two example rows (example.com addresses; replace them with real leads). */
export const LEADS_SAMPLE: string[][] = [
  ['Company', 'Website', 'City', 'Industry', 'Employees', 'Licences', 'Lead source', 'First name', 'Last name', 'Designation', 'Department',
    'Email', 'Phone', 'LinkedIn', 'BDR email', 'Remarks'],
  ['Example Foods Pvt Ltd', 'examplefoods.example.com', 'Bengaluru', 'Retail / e-commerce', '1200', '450', 'LinkedIn', 'Asha', 'Rao', 'Head - HR', 'HR',
    'asha.rao@examplefoods.example.com', '+91 98450 12345', 'https://www.linkedin.com/in/example-asha-rao', '', 'Met at HR summit, asked for a deck'],
  ['Example Foods Pvt Ltd', 'examplefoods.example.com', 'Bengaluru', 'Retail / e-commerce', '1200', '450', 'LinkedIn', 'Vikram', 'Shah', 'CFO', 'Finance',
    'vikram.shah@examplefoods.example.com', '98450 67890', '', '', ''],
];

export const PEOPLE_SAMPLE: string[][] = [
  ['Name', 'Designation', 'Email', 'Phone', 'LinkedIn'],
  ['Asha Rao', 'Head - HR', 'asha.rao@example.com', '+91 98450 12345', 'https://www.linkedin.com/in/example-asha-rao'],
  ['Vikram Shah', 'CFO', 'vikram.shah@example.com', '98450 67890', ''],
];
