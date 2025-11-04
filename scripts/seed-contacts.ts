/**
 * Seed script to create test contacts
 * Run with: npx tsx scripts/seed-contacts.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const testContacts = [
  {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    tags: ['customer', 'vip'],
    customFields: { company: 'Acme Corp', position: 'CEO' },
    socialHandles: { twitter: '@johndoe', linkedin: 'johndoe' },
  },
  {
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '+1 (555) 234-5678',
    tags: ['customer', 'lead'],
    customFields: { company: 'Tech Inc', position: 'CTO' },
    socialHandles: { twitter: '@janesmith' },
  },
  {
    name: 'Bob Johnson',
    email: 'bob.johnson@example.com',
    phone: '+1 (555) 345-6789',
    tags: ['prospect'],
    customFields: { company: 'StartupXYZ' },
    socialHandles: {},
  },
  {
    name: 'Alice Williams',
    email: 'alice.williams@example.com',
    phone: '+1 (555) 456-7890',
    tags: ['customer', 'enterprise'],
    customFields: { company: 'BigCorp', position: 'VP Sales' },
    socialHandles: { linkedin: 'alicewilliams' },
  },
  {
    name: 'Charlie Brown',
    email: 'charlie.brown@example.com',
    phone: '+1 (555) 567-8901',
    tags: ['lead'],
    customFields: {},
    socialHandles: {},
  },
];

async function main() {
  console.log('🌱 Seeding contacts...');

  for (const contact of testContacts) {
    const created = await prisma.contact.create({
      data: contact,
    });
    console.log(`✅ Created contact: ${created.name} (${created.id})`);
  }

  console.log('✨ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding contacts:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
