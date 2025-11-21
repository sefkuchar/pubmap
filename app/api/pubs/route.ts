import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'scraper', 'zizkov_pubs.json');
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    return NextResponse.json(data, { status: 200 });
  } catch (e:any) {
    return NextResponse.json({ error: 'Failed to read pubs data', details: e.message }, { status: 500 });
  }
}
