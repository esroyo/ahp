export function escapeHtml(text: string) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

export function dataToHtmlTable(data?: any, columns?: string[]): string {
  // Handle different input types
  if (!data) {
    return '<table></table>';
  }

  let rows = [];
  let headers = [];

  // Convert data to array of objects format
  if (Array.isArray(data)) {
    rows = data;
    // Get all unique keys from all objects
    const allKeys = new Set();
    rows.forEach(row => {
      if (typeof row === 'object' && row !== null) {
        Object.keys(row).forEach(key => allKeys.add(key));
      }
    });
    headers = Array.from(allKeys);
  } else if (typeof data === 'object') {
    // Check if values are objects (nested structure like your example)
    const firstValue = Object.values(data)[0];
    if (typeof firstValue === 'object' && firstValue !== null && !Array.isArray(firstValue)) {
      // Convert nested object structure to array of objects
      rows = Object.entries(data).map(([key, value]) => ({
        '(index)': key,
        ...value
      }));
      // Get headers from the nested object keys
      const allKeys = new Set();
      Object.values(data).forEach(obj => {
        if (typeof obj === 'object' && obj !== null) {
          Object.keys(obj).forEach(key => allKeys.add(key));
        }
      });
      headers = ['(index)', ...Array.from(allKeys)];
    } else {
      // Convert simple object to array of key-value pairs
      rows = Object.entries(data).map(([key, value]) => ({
        '(index)': key,
        'Value': value
      }));
      headers = ['(index)', 'Value'];
    }
  }

  // Filter columns if specified
  if (columns && Array.isArray(columns)) {
    headers = headers.filter(h => columns.includes(h));
  }

  // Build HTML
  let html = '<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">\n';
  
  // Add header row
  html += '  <thead>\n    <tr>\n';
  html += '      <th>(index)</th>\n';
  headers.forEach(header => {
    if (header !== '(index)') {
      html += `      <th>${escapeHtml(String(header))}</th>\n`;
    }
  });
  html += '    </tr>\n  </thead>\n';

  // Add body rows
  html += '  <tbody>\n';
  rows.forEach((row, index) => {
    html += '    <tr>\n';
    
    // Use the (index) value from the row if it exists, otherwise use numeric index
    const indexValue = (typeof row === 'object' && row !== null && '(index)' in row) 
      ? row['(index)'] 
      : index;
    html += `      <td>${escapeHtml(String(indexValue))}</td>\n`;
    
    if (typeof row === 'object' && row !== null) {
      headers.forEach(header => {
        if (header !== '(index)') {
          const value = row[header];
          const displayValue = value === undefined ? '' : 
                             value === null ? 'null' : 
                             String(value);
          html += `      <td>${escapeHtml(displayValue)}</td>\n`;
        }
      });
    } else {
      html += `      <td>${escapeHtml(String(row))}</td>\n`;
    }
    
    html += '    </tr>\n';
  });
  html += '  </tbody>\n';
  
  html += '</table>';
  
  return html;
}

const htmlRegex = /<\/?[a-z][\s\S]*>/i;
export function containsHtml(str: string) {
  if (!str || typeof str !== 'string') {
    return false;
  }
  return htmlRegex.test(str);
}
