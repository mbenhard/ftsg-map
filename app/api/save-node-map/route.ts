import { NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { join } from 'path'

export async function POST(req: Request) {
  try {
    const data = await req.json()
    
    // Write to the data file
    const filePath = join(process.cwd(), 'data', 'node-map.json')
    await writeFile(filePath, JSON.stringify(data, null, 2))
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving node map:', error)
    return NextResponse.json(
      { error: 'Failed to save node map' },
      { status: 500 }
    )
  }
} 