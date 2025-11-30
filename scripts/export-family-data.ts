/**
 * Export Family Data Script
 * 
 * Exports all data for a family (or all families) to a JSON file.
 * This can be used for backup, migration, or seeding a new project.
 * 
 * Note: Analytics data (page views) is NOT exported as it's not meaningful
 * when migrating to a new instance. Password hashes are excluded for security.
 * 
 * Usage:
 *   npx tsx scripts/export-family-data.ts [family-slug]
 * 
 * Examples:
 *   npx tsx scripts/export-family-data.ts              # Export all families
 *   npx tsx scripts/export-family-data.ts demo-family  # Export specific family
 * 
 * Requirements:
 *   - DATABASE_URL environment variable must be set
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import ws from 'ws';
import * as fs from 'fs';
import * as path from 'path';
import { families, familyMembers, people, quizResults } from '../shared/schema';

neonConfig.webSocketConstructor = ws;

interface ExportData {
  exportedAt: string;
  version: string;
  notes: string[];
  families: any[];
  familyMembers: any[];
  people: any[];
  quizResults: any[];
}

async function exportFamilyData(familySlug?: string) {
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not set');
    console.error('Make sure you are running this in the Replit environment or have set DATABASE_URL');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool });

  console.log('Connecting to database...');

  try {
    let familyData: any[];
    
    if (familySlug) {
      console.log(`Exporting data for family: ${familySlug}`);
      familyData = await db.select().from(families).where(eq(families.slug, familySlug));
      
      if (familyData.length === 0) {
        console.error(`ERROR: Family with slug "${familySlug}" not found`);
        process.exit(1);
      }
    } else {
      console.log('Exporting all families...');
      familyData = await db.select().from(families);
    }

    const familyIds = familyData.map(f => f.id);
    console.log(`Found ${familyData.length} family(ies)`);

    // Export family members
    let membersData: any[] = [];
    for (const familyId of familyIds) {
      const members = await db.select().from(familyMembers).where(eq(familyMembers.familyId, familyId));
      membersData = [...membersData, ...members];
    }
    console.log(`Found ${membersData.length} family member(s)`);

    // Export people
    let peopleData: any[] = [];
    for (const familyId of familyIds) {
      const ppl = await db.select().from(people).where(eq(people.familyId, familyId));
      peopleData = [...peopleData, ...ppl];
    }
    console.log(`Found ${peopleData.length} person record(s)`);

    // Export quiz results
    let quizData: any[] = [];
    for (const familyId of familyIds) {
      const quizzes = await db.select().from(quizResults).where(eq(quizResults.familyId, familyId));
      quizData = [...quizData, ...quizzes];
    }
    console.log(`Found ${quizData.length} quiz result(s)`);

    // Sanitize families - remove password hashes for security
    const sanitizedFamilies = familyData.map(f => ({
      id: f.id,
      slug: f.slug,
      name: f.name,
      seniorName: f.seniorName,
      joinCode: f.joinCode,
      categorySettings: f.categorySettings,
      createdAt: f.createdAt,
      isActive: f.isActive,
      // Note: passwordHash is intentionally excluded for security
    }));

    // Sanitize family members - remove password hashes for security
    const sanitizedMembers = membersData.map(m => ({
      id: m.id,
      familyId: m.familyId,
      email: m.email,
      name: m.name,
      role: m.role,
      createdAt: m.createdAt,
      lastLoginAt: m.lastLoginAt,
      isActive: m.isActive,
      // Note: passwordHash is intentionally excluded for security
    }));

    // Export all person fields
    const exportedPeople = peopleData.map(p => ({
      id: p.id,
      familyId: p.familyId,
      name: p.name,
      fullName: p.fullName,
      category: p.category,
      relationship: p.relationship,
      born: p.born,
      passed: p.passed,
      location: p.location,
      phone: p.phone,
      email: p.email,
      spouseId: p.spouseId,
      parentIds: p.parentIds,
      photoData: p.photoData,
      thumbnailData: p.thumbnailData,
      photos: p.photos,
      eyeCenterY: p.eyeCenterY,
      summary: p.summary,
      sortOrder: p.sortOrder,
      voiceNoteData: p.voiceNoteData,
      lastVisit: p.lastVisit,
      visitHistory: p.visitHistory,
    }));

    const exportData: ExportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      notes: [
        'Password hashes are excluded for security - users will need to set new passwords',
        'Analytics data (page views) is not exported',
        'To import: npx tsx scripts/import-family-data.ts <this-file.json>',
      ],
      families: sanitizedFamilies,
      familyMembers: sanitizedMembers,
      people: exportedPeople,
      quizResults: quizData,
    };

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = familySlug 
      ? `family-export-${familySlug}-${timestamp}.json`
      : `family-export-all-${timestamp}.json`;
    const outputPath = path.join(process.cwd(), filename);

    // Write to file
    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
    
    console.log(`\nExport complete!`);
    console.log(`Output file: ${outputPath}`);
    console.log(`\nSummary:`);
    console.log(`  - Families: ${sanitizedFamilies.length}`);
    console.log(`  - Family Members: ${sanitizedMembers.length}`);
    console.log(`  - People: ${exportedPeople.length}`);
    console.log(`  - Quiz Results: ${quizData.length}`);

    // Calculate file size
    const stats = fs.statSync(outputPath);
    const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`  - File Size: ${fileSizeMB} MB`);
    
    console.log(`\nNotes:`);
    console.log(`  - Password hashes were NOT exported (security)`);
    console.log(`  - Analytics data was NOT exported`);
    console.log(`  - After importing, set new join codes and passwords as needed`);

  } catch (error) {
    console.error('Export failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the export
const familySlug = process.argv[2];
exportFamilyData(familySlug);
