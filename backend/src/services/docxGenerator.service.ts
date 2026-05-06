import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

export interface DocxOptions {
  title?: string;
  font?: string;
  fontSize?: number;
  pageSize?: 'A4' | 'Letter' | 'Legal';
  headerFooter?: boolean;
}

export async function generate(markdownContent: string, options: DocxOptions): Promise<Buffer> {
  const font = options.font ?? 'Calibri';
  const fontSize = (options.fontSize ?? 12) * 2; // docx uses half-points

  const paragraphs = parseMarkdown(markdownContent, font, fontSize);

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { size: getPageSize(options.pageSize ?? 'A4') },
        },
        children: paragraphs,
      },
    ],
    styles: {
      default: {
        document: { run: { font, size: fontSize } },
      },
    },
  });

  return Packer.toBuffer(doc);
}

function parseMarkdown(markdown: string, font: string, fontSize: number): Paragraph[] {
  const lines = markdown.split('\n');
  const paragraphs: Paragraph[] = [];

  for (const line of lines) {
    if (line.startsWith('# ')) {
      paragraphs.push(new Paragraph({ text: line.slice(2), heading: HeadingLevel.HEADING_1 }));
    } else if (line.startsWith('## ')) {
      paragraphs.push(new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2 }));
    } else if (line.startsWith('### ')) {
      paragraphs.push(new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3 }));
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      paragraphs.push(new Paragraph({ text: line.slice(2), bullet: { level: 0 } }));
    } else if (line.trim() === '') {
      paragraphs.push(new Paragraph({ text: '' }));
    } else {
      paragraphs.push(new Paragraph({ children: [new TextRun({ text: line, font, size: fontSize })] }));
    }
  }

  return paragraphs;
}

function getPageSize(size: string): { width: number; height: number } {
  switch (size) {
    case 'Letter': return { width: 12240, height: 15840 };
    case 'Legal': return { width: 12240, height: 20160 };
    default: return { width: 11906, height: 16838 }; // A4
  }
}
