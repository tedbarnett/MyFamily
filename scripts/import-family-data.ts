/**
 * Import Family Data Script
 * 
 * Imports family data from a JSON file exported by export-family-data.ts.
 * Use this to seed a new project or restore data from backup.
 * 
 * Note: Password hashes are not imported for security. After import,
 * you'll need to set new passwords/join codes as needed.
 * 
 * Usage:
 *   npx tsx scripts/import-family-data.ts <json-file> [--clear]
 * 
 * Options:
 *   --clear    Clear existing data before importing (use with caution!)
 * 
 * Examples:
 *   npx tsx scripts/import-family-data.ts family-export.json
 *   npx tsx scripts/import-family-data.ts family-export.json --clear
 * 
 * Requirements:
 *   - DATABASE_URL environment variable must be set
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import ws from 'ws';
import * as fs from 'fs';
import { families, familyMembers, people, quizResults, pageViews } from '../shared/schema';

neonConfig.webSocketConstructor = ws;

interface ExportData {
  exportedAt: string;
  version: string;
  notes?: string[];
  _instructions?: string[]; // Template instructions - ignored during import
  families: any[];
  familyMembers: any[];
  people: any[];
  quizResults: any[];
}

async function importFamilyData(jsonFilePath: string, clearExisting: boolean) {
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not set');
    console.error('Make sure you are running this in the Replit environment or have set DATABASE_URL');
    process.exit(1);
  }

  // Check if file exists
  if (!fs.existsSync(jsonFilePath)) {
    console.error(`ERROR: File not found: ${jsonFilePath}`);
    process.exit(1);
  }

  // Read and parse the JSON file
  console.log(`Reading data from: ${jsonFilePath}`);
  let data: ExportData;
  try {
    const content = fs.readFileSync(jsonFilePath, 'utf-8');
    data = JSON.parse(content);
  } catch (error) {
    console.error('ERROR: Failed to parse JSON file:', error);
    process.exit(1);
  }

  // Validate the data structure
  if (!data.version || !data.families) {
    console.error('ERROR: Invalid export file format. Required fields: version, families');
    process.exit(1);
  }

  // Check for template instructions
  if (data._instructions) {
    console.log('Note: Template instructions detected and will be ignored during import.');
  }

  console.log(`Export file created: ${data.exportedAt}`);
  console.log(`Version: ${data.version}`);
  console.log(`\nData to import:`);
  console.log(`  - Families: ${data.families?.length || 0}`);
  console.log(`  - Family Members: ${data.familyMembers?.length || 0}`);
  console.log(`  - People: ${data.people?.length || 0}`);
  console.log(`  - Quiz Results: ${data.quizResults?.length || 0}`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool });

  console.log('\nConnecting to database...');

  try {
    if (clearExisting) {
      console.log('\n⚠️  Clearing existing data...');
      
      // Delete in reverse order of dependencies
      await db.delete(pageViews);
      console.log('  - Cleared page views');
      
      await db.delete(quizResults);
      console.log('  - Cleared quiz results');
      
      await db.delete(people);
      console.log('  - Cleared people');
      
      await db.delete(familyMembers);
      console.log('  - Cleared family members');
      
      await db.delete(families);
      console.log('  - Cleared families');
    }

    console.log('\nImporting data...');
    
    let importedFamilies = 0;
    let skippedFamilies = 0;
    let importedMembers = 0;
    let skippedMembers = 0;
    let importedPeople = 0;
    let skippedPeople = 0;
    let importedQuizzes = 0;

    // Import families first
    if (data.families && data.families.length > 0) {
      for (const family of data.families) {
        // Check if family already exists by slug or id
        const existingBySlug = await db.select().from(families).where(eq(families.slug, family.slug));
        const existingById = await db.select().from(families).where(eq(families.id, family.id));
        
        if (existingBySlug.length > 0 || existingById.length > 0) {
          console.log(`  - Skipping family "${family.slug}" (already exists)`);
          skippedFamilies++;
          continue;
        }

        await db.insert(families).values({
          id: family.id,
          slug: family.slug,
          name: family.name,
          seniorName: family.seniorName || 'Family',
          passwordHash: null, // Don't import password hashes
          joinCode: family.joinCode,
          categorySettings: family.categorySettings,
          createdAt: family.createdAt ? new Date(family.createdAt) : new Date(),
          isActive: family.isActive ?? true,
        });
        console.log(`  ✓ Imported family: ${family.name} (${family.slug})`);
        importedFamilies++;
      }
    }

    // Import family members
    if (data.familyMembers && data.familyMembers.length > 0) {
      for (const member of data.familyMembers) {
        // Check if member already exists by id or email within same family
        const existingById = await db.select().from(familyMembers).where(eq(familyMembers.id, member.id));
        
        if (existingById.length > 0) {
          console.log(`  - Skipping member "${member.name}" (already exists)`);
          skippedMembers++;
          continue;
        }

        // Verify family exists
        const familyExists = await db.select().from(families).where(eq(families.id, member.familyId));
        if (familyExists.length === 0) {
          console.log(`  - Skipping member "${member.name}" (family not found)`);
          skippedMembers++;
          continue;
        }

        await db.insert(familyMembers).values({
          id: member.id,
          familyId: member.familyId,
          email: member.email,
          name: member.name,
          passwordHash: '', // Empty password - user must set new one
          role: member.role || 'editor',
          createdAt: member.createdAt ? new Date(member.createdAt) : new Date(),
          lastLoginAt: member.lastLoginAt ? new Date(member.lastLoginAt) : null,
          isActive: member.isActive ?? true,
        });
        console.log(`  ✓ Imported family member: ${member.name}`);
        importedMembers++;
      }
    }

    // Import people
    if (data.people && data.people.length > 0) {
      for (const person of data.people) {
        // Check if person already exists
        const existingById = await db.select().from(people).where(eq(people.id, person.id));
        
        if (existingById.length > 0) {
          console.log(`  - Skipping person "${person.name}" (already exists)`);
          skippedPeople++;
          continue;
        }

        // Verify family exists
        const familyExists = await db.select().from(families).where(eq(families.id, person.familyId));
        if (familyExists.length === 0) {
          console.log(`  - Skipping person "${person.name}" (family not found)`);
          skippedPeople++;
          continue;
        }

        await db.insert(people).values({
          id: person.id,
          familyId: person.familyId,
          name: person.name,
          fullName: person.fullName || null,
          category: person.category,
          relationship: person.relationship,
          born: person.born || null,
          passed: person.passed || null,
          location: person.location || null,
          phone: person.phone || null,
          email: person.email || null,
          spouseId: person.spouseId || null,
          parentIds: person.parentIds || null,
          photoData: person.photoData || null,
          thumbnailData: person.thumbnailData || null,
          photos: person.photos || null,
          eyeCenterY: person.eyeCenterY || null,
          summary: person.summary || null,
          sortOrder: person.sortOrder ?? 0,
          voiceNoteData: person.voiceNoteData || null,
          lastVisit: person.lastVisit || null,
          visitHistory: person.visitHistory || null,
        });
        console.log(`  ✓ Imported person: ${person.name} (${person.relationship})`);
        importedPeople++;
      }
    }

    // Import quiz results
    if (data.quizResults && data.quizResults.length > 0) {
      for (const quiz of data.quizResults) {
        // Check if quiz result already exists
        const existingById = await db.select().from(quizResults).where(eq(quizResults.id, quiz.id));
        
        if (existingById.length > 0) {
          continue; // Silently skip existing quiz results
        }

        // Verify family exists
        const familyExists = await db.select().from(families).where(eq(families.id, quiz.familyId));
        if (familyExists.length === 0) {
          continue; // Skip quiz results for non-existent families
        }

        await db.insert(quizResults).values({
          id: quiz.id,
          familyId: quiz.familyId,
          score: quiz.score,
          totalQuestions: quiz.totalQuestions,
          completedAt: quiz.completedAt ? new Date(quiz.completedAt) : new Date(),
        });
        importedQuizzes++;
      }
      if (importedQuizzes > 0) {
        console.log(`  ✓ Imported ${importedQuizzes} quiz result(s)`);
      }
    }

    console.log('\n✅ Import complete!');
    console.log(`\nSummary:`);
    console.log(`  - Families: ${importedFamilies} imported, ${skippedFamilies} skipped`);
    console.log(`  - Family Members: ${importedMembers} imported, ${skippedMembers} skipped`);
    console.log(`  - People: ${importedPeople} imported, ${skippedPeople} skipped`);
    console.log(`  - Quiz Results: ${importedQuizzes} imported`);
    
    if (importedMembers > 0) {
      console.log(`\n⚠️  Note: Family member passwords were not imported.`);
      console.log(`   Users will need to set new passwords through the admin interface.`);
    }

  } catch (error) {
    console.error('\nImport failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const jsonFilePath = args.find(arg => !arg.startsWith('--'));
const clearExisting = args.includes('--clear');

if (!jsonFilePath) {
  console.log('Import Family Data Script');
  console.log('=========================');
  console.log('');
  console.log('Usage: npx tsx scripts/import-family-data.ts <json-file> [--clear]');
  console.log('');
  console.log('Options:');
  console.log('  --clear    Clear ALL existing data before importing (DESTRUCTIVE!)');
  console.log('');
  console.log('Examples:');
  console.log('  npx tsx scripts/import-family-data.ts family-export.json');
  console.log('  npx tsx scripts/import-family-data.ts family-export.json --clear');
  console.log('');
  console.log('Notes:');
  console.log('  - Password hashes are not imported for security');
  console.log('  - Existing records are skipped (use --clear to replace all)');
  console.log('  - DATABASE_URL environment variable must be set');
  process.exit(1);
}

if (clearExisting) {
  console.log('\n⚠️  WARNING: --clear flag detected!');
  console.log('This will DELETE ALL existing data before importing.');
  console.log('This includes all families, people, photos, and quiz results.');
  console.log('');
  console.log('Press Ctrl+C within 5 seconds to cancel...\n');
  
  setTimeout(() => {
    importFamilyData(jsonFilePath, clearExisting);
  }, 5000);
} else {
  importFamilyData(jsonFilePath, clearExisting);
}
