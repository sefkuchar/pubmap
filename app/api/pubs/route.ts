import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { NewPubEntry, PubEntry } from '../../../../types';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'scraper', 'test_dataset.json');
    const raw = fs.readFileSync(filePath, 'utf8');
    const newData = JSON.parse(raw) as NewPubEntry[];
    
    // Transform to PubEntry format
    const transformed: PubEntry[] = newData.map((item) => {
      const address = item.street && item.city 
        ? `${item.street}, ${item.city}`
        : item.street || item.city || undefined;
      
      return {
        ...item,
        name: item.title,
        priceKc: null,
        lat: undefined,
        lng: undefined,
        address: address,
        beersRaw: item.categoryName || '',
      };
    });
    
    return NextResponse.json(transformed, { status: 200 });
  } catch (e:any) {
    return NextResponse.json({ error: 'Failed to read pubs data', details: e.message }, { status: 500 });
  }
}
