/**
 * Import prospects from marketing list CSV
 *
 * Usage: npx ts-node scripts/import-prospects.ts <csv-file-path> <created-by-user-id>
 *
 * Schema Structure:
 * - Prospect = Organization (church/ministry)
 * - ProspectContact = Person at the organization (can have multiple)
 *
 * CSV Structure (expected 40 fields):
 * - Company → Prospect.organizationName
 * - Company Domain → Prospect.website
 * - Type → Prospect.industry
 * - Employees → Prospect.estimatedSize
 * - First Name + Last Name → ProspectContact.name
 * - Email → ProspectContact.email
 * - Contact Direct Dial OR Company Phone → ProspectContact.phone
 * - Contact Job Title → ProspectContact.title
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import csv from 'csv-parser';

const prisma = new PrismaClient();

interface CsvRow {
  'First Name': string;
  'Last Name': string;
  Email: string;
  'Contact Job Title': string;
  'Management Level': string;
  'Contact City': string;
  'Contact State': string;
  'Contact Country': string;
  Company: string;
  'Company Address': string;
  'Company City': string;
  'Company State': string;
  'Company Phone': string;
  'Contact Direct Dial': string;
  'Company Domain': string;
  Employees: string;
  Revenue: string;
  Type: string;
  'Founded Year': string;
  'Contact LinkedIn': string;
}

interface ContactData {
  name: string;
  email: string;
  phone: string | null;
  title: string | null;
  isPrimary: boolean;
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && !email.toLowerCase().includes('noemail');
}

function normalizePhone(phone: string | undefined | null): string | null {
  if (!phone || phone.trim() === '') return null;

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Must be 10 or 11 digits (with country code)
  if (digits.length === 10) {
    return `+1-${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits[0] === '1') {
    return `+1-${digits.slice(1, 4)}-${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  return null; // Invalid format
}

function normalizeWebsite(domain: string | undefined | null): string | null {
  if (!domain || domain.trim() === '') return null;

  let url = domain.trim().toLowerCase();

  // Add protocol if missing
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  return url;
}

function mapEmployeesToSize(employees: string | undefined | null): string | null {
  if (!employees || employees.trim() === '') return null;

  const count = parseInt(employees, 10);
  if (isNaN(count)) return null;

  if (count <= 10) return 'Small (1-10)';
  if (count <= 50) return 'Small (11-50)';
  if (count <= 200) return 'Medium (51-200)';
  if (count <= 500) return 'Medium (201-500)';
  if (count <= 1000) return 'Large (501-1000)';
  return 'Mega (1000+)';
}

function buildOrganizationNotes(row: CsvRow): string {
  const parts: string[] = [];

  if (row['Company Address'] || row['Company City'] || row['Company State']) {
    const address = [row['Company Address'], row['Company City'], row['Company State']]
      .filter(Boolean)
      .join(', ');
    if (address) parts.push(`Address: ${address}`);
  }

  if (row['Revenue'] && row['Revenue'] !== '$0') {
    parts.push(`Revenue: ${row['Revenue']}`);
  }

  if (row['Founded Year']) {
    parts.push(`Founded: ${row['Founded Year']}`);
  }

  if (row['Company Phone']) {
    parts.push(`Main Phone: ${row['Company Phone']}`);
  }

  return parts.length > 0 ? parts.join('\n') : '';
}

function transformRow(row: CsvRow): { organization: string; contact: ContactData } | null {
  // Validate required fields
  if (!row.Company || !row['First Name'] || !row['Last Name'] || !row.Email) {
    console.warn('⚠️  Skipping row with missing required fields:', {
      company: row.Company,
      name: `${row['First Name']} ${row['Last Name']}`,
      email: row.Email,
    });
    return null;
  }

  // Validate email
  if (!validateEmail(row.Email)) {
    console.warn('⚠️  Skipping row with invalid email:', row.Email);
    return null;
  }

  return {
    organization: row.Company.trim(),
    contact: {
      name: `${row['First Name'].trim()} ${row['Last Name'].trim()}`,
      email: row.Email.trim().toLowerCase(),
      phone: normalizePhone(row['Contact Direct Dial'] || row['Company Phone']),
      title: row['Contact Job Title']?.trim() || null,
      isPrimary: false, // Will be set for first contact per organization
    },
  };
}

async function importProspects(csvFilePath: string, createdById: string) {
  console.log('📊 Starting prospect import...');
  console.log(`   CSV File: ${csvFilePath}`);
  console.log(`   Created By: ${createdById}`);
  console.log('');

  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: createdById },
    select: { id: true, email: true, isSalesRep: true, isPlatformAdmin: true },
  });

  if (!user) {
    throw new Error(`User not found: ${createdById}`);
  }

  if (!user.isSalesRep && !user.isPlatformAdmin) {
    throw new Error(`User ${user.email} is not a sales rep or platform admin`);
  }

  console.log(`✅ User verified: ${user.email}`);
  console.log('');

  // Phase 1: Read CSV and group by organization
  console.log('📖 Phase 1: Reading CSV and grouping by organization...');
  const organizationsMap = new Map<string, {
    data: CsvRow;
    contacts: ContactData[];
  }>();
  let rowCount = 0;
  let skipped = 0;

  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row: CsvRow) => {
        rowCount++;

        const transformed = transformRow(row);
        if (!transformed) {
          skipped++;
          return;
        }

        const { organization, contact } = transformed;

        if (!organizationsMap.has(organization)) {
          organizationsMap.set(organization, {
            data: row,
            contacts: [],
          });
        }

        organizationsMap.get(organization)!.contacts.push(contact);

        // Progress indicator every 1000 rows
        if (rowCount % 1000 === 0) {
          console.log(`   Processed ${rowCount} rows... (${organizationsMap.size} organizations, ${skipped} skipped)`);
        }
      })
      .on('end', async () => {
        console.log('');
        console.log(`✅ CSV parsing complete: ${rowCount} rows processed`);
        console.log(`   Organizations: ${organizationsMap.size}`);
        console.log(`   Skipped: ${skipped}`);
        console.log('');

        if (organizationsMap.size === 0) {
          console.error('❌ No valid prospects to import');
          return resolve();
        }

        // Phase 2: Import to database
        console.log('💾 Phase 2: Importing to database...');
        let prospectsCreated = 0;
        let prospectsExisting = 0;
        let contactsCreated = 0;
        let contactsDuplicate = 0;
        let contactsFailed = 0;

        let progress = 0;
        const total = organizationsMap.size;

        for (const [orgName, { data, contacts }] of organizationsMap) {
          progress++;

          try {
            // Mark first contact as primary
            if (contacts.length > 0) {
              contacts[0].isPrimary = true;
            }

            // Create or find existing Prospect
            let prospect = await prisma.prospect.findFirst({
              where: {
                organizationName: orgName,
                createdById,
              },
            });

            if (prospect) {
              prospectsExisting++;
            } else {
              // Create new Prospect
              prospect = await prisma.prospect.create({
                data: {
                  organizationName: orgName,
                  website: normalizeWebsite(data['Company Domain']),
                  industry: data.Type?.trim() || null,
                  estimatedSize: mapEmployeesToSize(data.Employees),
                  notes: buildOrganizationNotes(data),
                  createdById,
                },
              });
              prospectsCreated++;
            }

            // Create ProspectContacts
            for (const contact of contacts) {
              try {
                await prisma.prospectContact.create({
                  data: {
                    prospectId: prospect.id,
                    name: contact.name,
                    email: contact.email,
                    phone: contact.phone,
                    title: contact.title,
                    isPrimary: contact.isPrimary,
                  },
                });
                contactsCreated++;
              } catch (error: any) {
                if (error.code === 'P2002') {
                  // Unique constraint violation (duplicate email for this prospect)
                  contactsDuplicate++;
                } else {
                  console.error(`   Failed to create contact ${contact.email} for ${orgName}:`, error.message);
                  contactsFailed++;
                }
              }
            }

            // Progress indicator every 100 organizations
            if (progress % 100 === 0) {
              console.log(`   Progress: ${progress}/${total} organizations (${prospectsCreated} new, ${prospectsExisting} existing, ${contactsCreated} contacts)`);
            }
          } catch (error: any) {
            console.error(`   Failed to process organization ${orgName}:`, error.message);
          }
        }

        console.log('');
        console.log('═══════════════════════════════════════════════════════');
        console.log('✅ IMPORT COMPLETE');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`📊 Total rows in CSV: ${rowCount}`);
        console.log(`🏢 Organizations processed: ${organizationsMap.size}`);
        console.log(`   ✅ New prospects created: ${prospectsCreated}`);
        console.log(`   ℹ️  Existing prospects found: ${prospectsExisting}`);
        console.log(`👤 Contacts:`);
        console.log(`   ✅ Created: ${contactsCreated}`);
        console.log(`   ⚠️  Duplicates skipped: ${contactsDuplicate}`);
        console.log(`   ❌ Failed: ${contactsFailed}`);
        console.log(`⚠️  Invalid rows skipped: ${skipped}`);
        console.log('═══════════════════════════════════════════════════════');

        resolve();
      })
      .on('error', (error: Error) => {
        console.error('❌ CSV parsing error:', error);
        reject(error);
      });
  });
}

// Main execution
const args = process.argv.slice(2);

if (args.length !== 2) {
  console.error('Usage: npx ts-node scripts/import-prospects.ts <csv-file-path> <created-by-user-id>');
  console.error('');
  console.error('Example:');
  console.error('  npx ts-node scripts/import-prospects.ts /path/to/prospects.csv abc-123-user-id');
  process.exit(1);
}

const [csvFilePath, createdById] = args;

if (!fs.existsSync(csvFilePath)) {
  console.error(`❌ File not found: ${csvFilePath}`);
  process.exit(1);
}

importProspects(csvFilePath, createdById)
  .then(() => {
    console.log('');
    console.log('✅ Import script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    console.error('❌ Import failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
