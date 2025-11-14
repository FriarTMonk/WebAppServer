#!/usr/bin/env node

/**
 * Validation script for Bible verse JSON files
 *
 * Usage: node validate-verses.js [translation-code]
 * Example: node validate-verses.js niv
 * Or validate all: node validate-verses.js
 */

const fs = require('fs');
const path = require('path');

const TRANSLATIONS = ['kjv', 'asv', 'niv', 'esv', 'nasb', 'nkjv', 'nlt', 'ylt'];

const BIBLE_BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles',
  'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations',
  'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah',
  'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai',
  'Zechariah', 'Malachi',
  'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans',
  '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
  'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
  '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews',
  'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
  'Jude', 'Revelation',
  // Alternative names
  'Psalm', 'Song of Songs', '1st Corinthians', '2nd Corinthians',
  '1st Samuel', '2nd Samuel', '1st Kings', '2nd Kings',
  '1st Chronicles', '2nd Chronicles', '1st Thessalonians', '2nd Thessalonians',
  '1st Timothy', '2nd Timothy', '1st Peter', '2nd Peter',
  '1st John', '2nd John', '3rd John'
];

function validateVerse(verse, index, translationCode) {
  const errors = [];
  const warnings = [];

  // Check required fields
  if (!verse.book) {
    errors.push(`Missing 'book' field`);
  } else if (typeof verse.book !== 'string') {
    errors.push(`'book' must be a string, got ${typeof verse.book}`);
  } else if (!BIBLE_BOOKS.includes(verse.book)) {
    warnings.push(`Unknown book name: '${verse.book}' (may need to be added to validation list)`);
  }

  if (verse.chapter === undefined || verse.chapter === null) {
    errors.push(`Missing 'chapter' field`);
  } else if (typeof verse.chapter !== 'number') {
    errors.push(`'chapter' must be a number, got ${typeof verse.chapter}`);
  } else if (verse.chapter < 1) {
    errors.push(`'chapter' must be >= 1, got ${verse.chapter}`);
  }

  if (verse.verse === undefined || verse.verse === null) {
    errors.push(`Missing 'verse' field`);
  } else if (typeof verse.verse !== 'number') {
    errors.push(`'verse' must be a number, got ${typeof verse.verse}`);
  } else if (verse.verse < 1) {
    errors.push(`'verse' must be >= 1, got ${verse.verse}`);
  }

  if (!verse.text) {
    errors.push(`Missing 'text' field`);
  } else if (typeof verse.text !== 'string') {
    errors.push(`'text' must be a string, got ${typeof verse.text}`);
  } else if (verse.text.trim().length === 0) {
    errors.push(`'text' cannot be empty`);
  }

  if (!verse.translation) {
    warnings.push(`Missing 'translation' field (optional but recommended)`);
  } else if (verse.translation.toUpperCase() !== translationCode.toUpperCase()) {
    warnings.push(`'translation' is '${verse.translation}' but expected '${translationCode.toUpperCase()}'`);
  }

  // Check optional strongs field
  if (verse.strongs !== undefined) {
    if (!Array.isArray(verse.strongs)) {
      errors.push(`'strongs' must be an array, got ${typeof verse.strongs}`);
    } else {
      verse.strongs.forEach((strong, i) => {
        if (!strong.word || !strong.number || strong.position === undefined) {
          errors.push(`strongs[${i}] missing required fields (word, number, position)`);
        }
        if (strong.number && !/^[HG]\d+$/.test(strong.number)) {
          warnings.push(`strongs[${i}].number '${strong.number}' doesn't match expected format (H#### or G####)`);
        }
      });
    }
  }

  return { errors, warnings };
}

function validateFile(translationCode) {
  const fileName = `${translationCode.toLowerCase()}-verses.json`;
  const filePath = path.join(__dirname, fileName);

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Validating: ${fileName}`);
  console.log('='.repeat(60));

  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return { success: false, fileExists: false };
  }

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.log(`❌ Error reading file: ${error.message}`);
    return { success: false, fileExists: true };
  }

  // Check if it's HTML instead of JSON
  if (content.trim().startsWith('<!DOCTYPE') || content.trim().startsWith('<html')) {
    console.log(`❌ File contains HTML instead of JSON`);
    console.log(`   This file needs to be replaced with actual verse data`);
    return { success: false, fileExists: true, isHtml: true };
  }

  let verses;
  try {
    verses = JSON.parse(content);
  } catch (error) {
    console.log(`❌ Invalid JSON: ${error.message}`);
    return { success: false, fileExists: true };
  }

  if (!Array.isArray(verses)) {
    console.log(`❌ JSON must be an array of verse objects`);
    return { success: false, fileExists: true };
  }

  console.log(`📊 Found ${verses.length.toLocaleString()} verses`);

  let errorCount = 0;
  let warningCount = 0;
  const maxErrorsToShow = 10;
  const maxWarningsToShow = 5;

  verses.forEach((verse, index) => {
    const { errors, warnings } = validateVerse(verse, index, translationCode);

    if (errors.length > 0 && errorCount < maxErrorsToShow) {
      console.log(`\n❌ Verse ${index + 1} (${verse.book || '?'} ${verse.chapter || '?'}:${verse.verse || '?'}):`);
      errors.forEach(err => console.log(`   - ${err}`));
      errorCount += errors.length;
    }

    if (warnings.length > 0 && warningCount < maxWarningsToShow) {
      console.log(`\n⚠️  Verse ${index + 1} (${verse.book || '?'} ${verse.chapter || '?'}:${verse.verse || '?'}):`);
      warnings.forEach(warn => console.log(`   - ${warn}`));
      warningCount += warnings.length;
    }
  });

  if (errorCount > maxErrorsToShow) {
    console.log(`\n... and ${errorCount - maxErrorsToShow} more errors (showing first ${maxErrorsToShow})`);
  }

  if (warningCount > maxWarningsToShow) {
    console.log(`\n... and ${warningCount - maxWarningsToShow} more warnings (showing first ${maxWarningsToShow})`);
  }

  if (errorCount === 0 && warningCount === 0) {
    console.log(`\n✅ All ${verses.length.toLocaleString()} verses are valid!`);

    // Show sample verse
    if (verses.length > 0) {
      console.log(`\n📖 Sample verse (first entry):`);
      console.log(JSON.stringify(verses[0], null, 2));
    }

    return { success: true, fileExists: true, verseCount: verses.length };
  } else {
    console.log(`\n❌ Validation failed: ${errorCount} errors, ${warningCount} warnings`);
    return { success: false, fileExists: true, errorCount, warningCount };
  }
}

function main() {
  const args = process.argv.slice(2);
  const translationsToValidate = args.length > 0 ? args.map(t => t.toLowerCase()) : TRANSLATIONS;

  console.log('Bible Verse JSON Validator');
  console.log(`Validating: ${translationsToValidate.join(', ').toUpperCase()}`);

  const results = {};
  translationsToValidate.forEach(code => {
    results[code] = validateFile(code);
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log('='.repeat(60));

  let totalValid = 0;
  let totalInvalid = 0;
  let totalMissing = 0;
  let totalHtml = 0;

  Object.entries(results).forEach(([code, result]) => {
    const status = !result.fileExists ? '❌ Missing' :
                   result.isHtml ? '❌ HTML file' :
                   result.success ? `✅ Valid (${result.verseCount.toLocaleString()} verses)` :
                   `❌ Invalid (${result.errorCount || 0} errors)`;

    console.log(`${code.toUpperCase().padEnd(6)} : ${status}`);

    if (!result.fileExists) totalMissing++;
    else if (result.isHtml) totalHtml++;
    else if (result.success) totalValid++;
    else totalInvalid++;
  });

  console.log(`\n✅ Valid: ${totalValid}  ❌ Invalid: ${totalInvalid}  ❌ Missing: ${totalMissing}  ❌ HTML: ${totalHtml}`);

  if (totalInvalid + totalMissing + totalHtml === 0) {
    console.log(`\n🎉 All files are valid! Ready to seed the database.`);
    console.log(`\nRun: npm run seed`);
  } else {
    console.log(`\n⚠️  Some files need attention before seeding.`);
  }

  process.exit(totalInvalid + totalMissing + totalHtml > 0 ? 1 : 0);
}

main();
