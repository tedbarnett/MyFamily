/**
 * Import Family Data Script
 * 
 * Imports family data from a JSON file exported by export-family-data.ts.
 * Use this to seed a new project or restore data from backup.
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
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq, sql } from 'drizzle-orm';
import ws from 'ws';
import * as fs from 'fs';
import { families, familyMembers, people, quizResults } from '../shared/schema';

neonConfig.webSocketConstructor = ws;

interface ExportData {
  exportedAt: string;
  version: string;
  families: any[];
  familyMembers: any[];
  people: any[];
  quizResults: any[];
}

async function importFamilyData(jsonFilePath: string, clearExisting: boolean) {
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not set');
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
    console.error('ERROR: Invalid export file format');
    process.exit(1);
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

    // Import families first
    if (data.families && data.families.length > 0) {
      for (const family of data.families) {
        // Check if family already exists by slug
        const existing = await db.select().from(families).where(eq(families.slug, family.slug));
        
        if (existing.length > 0) {
          console.log(`  - Skipping family "${family.slug}" (already exists)`);
          continue;
        }

        await db.insert(families).values({
          id: family.id,
          slug: family.slug,
          name: family.name,
          seniorName: family.seniorName,
          passwordHash: family.passwordHash,
          joinCode: family.joinCode,
          categorySettings: family.categorySettings,
          createdAt: family.createdAt ? new Date(family.createdAt) : new Date(),
          isActive: family.isActive ?? true,
        });
        console.log(`  - Imported family: ${family.name} (${family.slug})`);
      }
    }

    // Import family members
    if (data.familyMembers && data.familyMembers.length > 0) {
      for (const member of data.familyMembers) {
        // Check if member already exists
        const existing = await db.select().from(familyMembers).where(eq(familyMembers.id, member.id));
        
        if (existing.length > 0) {
          console.log(`  - Skipping member "${member.name}" (already exists)`);
          continue;
        }

        await db.insert(familyMembers).values({
          id: member.id,
          familyId: member.familyId,
          email: member.email,
          name: member.name,
          passwordHash: member.passwordHash || '',
          role: member.role,
          createdAt: member.createdAt ? new Date(member.createdAt) : new Date(),
          lastLoginAt: member.lastLoginAt ? new Date(member.lastLoginAt) : null,
          isActive: member.isActive ?? true,
        });
        console.log(`  - Imported family member: ${member.name}`);
      }
    }

    // Import people
    if (data.people && data.people.length > 0) {
      for (const person of data.people) {
        // Check if person already exists
        const existing = await db.select().from(people).where(eq(people.id, person.id));
        
        if (existing.length > 0) {
          console.log(`  - Skipping person "${person.name}" (already exists)`);
          continue;
        }

        await db.insert(people).values({
          id: person.id,
          familyId: person.familyId,
          name: person.name,
          fullName: person.fullName,
          category: person.category,
          relationship: person.relationship,
          born: person.born,
          passed: person.passed,
          location: person.location,
          phone: person.phone,
          email: person.email,
          spouseId: person.spouseId,
          parentIds: person.parentIds,
          photoData: person.photoData,
          thumbnailData: person.thumbnailData,
          photos: person.photos,
          eyeCenterY: person.eyeCenterY,
          summary: person.summary,
          sortOrder: person.sortOrder ?? 0,
          voiceNoteData: person.voiceNoteData,
          lastVisit: person.lastVisit,
          visitHistory: person.visitHistory,
        });
        console.log(`  - Imported person: ${person.name} (${person.relationship})`);
      }
    }

    // Import quiz results
    if (data.quizResults && data.quizResults.length > 0) {
      for (const quiz of data.quizResults) {
        // Check if quiz result already exists
        const existing = await db.select().from(quizResults).where(eq(quizResults.id, quiz.id));
        
        if (existing.length > 0) {
          continue; // Silently skip quiz results
        }

        await db.insert(quizResults).values({
          id: quiz.id,
          familyId: quiz.familyId,
          score: quiz.score,
          totalQuestions: quiz.totalQuestions,
          completedAt: quiz.completedAt ? new Date(quiz.completedAt) : new Date(),
        });
      }
      console.log(`  - Imported ${data.quizResults.length} quiz result(s)`);
    }

    console.log('\n✅ Import complete!');

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
  console.log('Usage: npx tsx scripts/import-family-data.ts <json-file> [--clear]');
  console.log('');
  console.log('Options:');
  console.log('  --clear    Clear existing data before importing');
  console.log('');
  console.log('Examples:');
  console.log('  npx tsx scripts/import-family-data.ts family-export.json');
  console.log('  npx tsx scripts/import-family-data.ts family-export.json --clear');
  process.exit(1);
}

if (clearExisting) {
  console.log('\n⚠️  WARNING: --clear flag detected!');
  console.log('This will DELETE ALL existing data before importing.');
  console.log('Press Ctrl+C within 3 seconds to cancel...\n');
  
  setTimeout(() => {
    importFamilyData(jsonFilePath, clearExisting);
  }, 3000);
} else {
  importFamilyData(jsonFilePath, clearExisting);
}
