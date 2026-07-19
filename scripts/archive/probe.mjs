import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';

const zipPath = 'C:/Users/dylan/Child Neuro Handbook Word/Headaches.docx';
const zip = new AdmZip(zipPath);
const xml = zip.readAsText('word/document.xml');
const paras = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
paras.slice(0, 60).forEach(p => {
  const text = (p.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)||[]).map(t=>t.replace(/<[^>]+>/g,'')).join('');
  const sz = p.match(/w:sz w:val="(\d+)"/)?.[1];
  if (text.trim()) console.log(JSON.stringify({sz: sz ? parseInt(sz) : null, text: text.slice(0,80)}));
});
