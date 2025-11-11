#!/usr/bin/env node
import 'dotenv/config'
import prisma from '../src/lib/prisma.mjs'

async function main(){
  const candidate = await prisma.designMedia.findFirst({
    where: {
      OR: [
        { fileUrl: { startsWith: '/uploads/' } },
        { design: { thumbnailUrl: null } },
        { design: { thumbnailUrl: '' } },
      ],
    },
    include: { design: true },
  })
  if (!candidate) {
    const any = await prisma.designMedia.findFirst({ include: { design: true } })
    if (!any) { console.error('No DesignMedia found'); process.exit(1) }
    console.log('Candidate (fallback):', { id: any.id, fileUrl: any.fileUrl, designId: any.design?.id })
    return
  }
  console.log('Candidate:', { id: candidate.id, fileUrl: candidate.fileUrl, designId: candidate.design?.id })
}
main().catch((e)=>{ console.error(e); process.exit(1) })
