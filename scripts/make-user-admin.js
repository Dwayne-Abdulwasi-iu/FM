const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function makeUserAdmin() {
  try {
    // Get the user's email from command line argument
    const email = process.argv[2]
    
    if (!email) {
      console.error('Please provide an email address: node make-user-admin.js user@example.com')
      process.exit(1)
    }

    // Update the user to be admin
    const user = await prisma.user.update({
      where: { email },
      data: { isAdmin: true }
    })

    console.log(`Successfully made ${user.email} an admin`)
    console.log(`User ID: ${user.id}`)
    console.log(`Admin status: ${user.isAdmin}`)
  } catch (error) {
    console.error('Error making user admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

makeUserAdmin()