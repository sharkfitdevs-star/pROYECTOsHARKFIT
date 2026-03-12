#!/usr/bin/env node
// Recursively scan frontend/src for files with table import and replace tags
const fs = require('fs');
const path = require('path');

function walk(dir, cb) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(dirent => {
    const full = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      walk(full, cb);
    } else if (/\.jsx?$/.test(dirent.name) || /\.tsx?$/.test(dirent.name)) {
      cb(full);
    }
  });
}

const base = path.resolve(__dirname, '../frontend/src');
const files = [];

walk(base, f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes('@/components/ui/table')) {
    files.push(f);
    let s = content;
    s = s.replace(/import \{[\s\S]*?\} from "@\/components\/ui\/table";?/g, '');
    s = s.replace(/<Table>/g, '<table className="w-full text-sm">');
    s = s.replace(/<\/Table>/g, '</table>');
    s = s.replace(/<TableHeader>/g, '<thead>');
    s = s.replace(/<\/TableHeader>/g, '</thead>');
    s = s.replace(/<TableHead>/g, '<th className="text-left p-2 font-medium">');
    s = s.replace(/<\/TableHead>/g, '</th>');
    s = s.replace(/<TableBody>/g, '<tbody>');
    s = s.replace(/<\/TableBody>/g, '</tbody>');
    s = s.replace(/<TableRow>/g, '<tr className="border-b hover:bg-gray-50">');
    s = s.replace(/<\/TableRow>/g, '</tr>');
    s = s.replace(/<TableCell>/g, '<td className="p-2">');
    s = s.replace(/<\/TableCell>/g, '</td>');
    if (s !== content) {
      fs.writeFileSync(f, s, 'utf8');
    }
  }
});
console.log('Processed files:', files.length);
files.forEach(f=>console.log(f));
