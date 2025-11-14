#!/usr/bin/env node

/**
 * Conversion script to transform nested JSON format to flat array format
 *
 * Input format:  { "Book": { "chapter": { "verse": "text" } } }
 * Output format: [ { book, chapter, verse, text, translation } ]
 *
 * Usage: node convert-format.js <translation-code>
 * Example: node convert-format.js niv
 */

const fs = require('fs');
const path = require('path');

function convertFormat(translationCode) {
  const inputFile = `${translationCode.toLowerCase()}-verses.json`;
  const inputPath = path.join(__dirname, inputFile);
  const outputFile = `${translationCode.toLowerCase()}-verses.json`;
  const outputPath = path.join(__dirname, outputFile);
  const backupPath = path.join(__dirname, `${translationCode.toLowerCase()}-verses.backup.json`);

  console.log(`\nConverting ${translationCode.toUpperCase()}...`);
  console.log(`Reading: ${inputFile}`);

  if (!fs.existsSync(inputPath)) {
    console.log(`❌ File not found: ${inputPath}`);
    return false;
  }

  let nestedData;
  try {
    const content = fs.readFileSync(inputPath, 'utf8');
    nestedData = JSON.parse(content);
  } catch (error) {
    console.log(`❌ Error reading/parsing file: ${error.message}`);
    return false;
  }

  // Check if already in array format
  if (Array.isArray(nestedData)) {
    console.log(`✅ File is already in array format (${nestedData.length} verses)`);
    return true;
  }

  // Backup original file
  fs.copyFileSync(inputPath, backupPath);
  console.log(`📦 Backed up original to: ${path.basename(backupPath)}`);

  const verses = [];
  const translationUpper = translationCode.toUpperCase();

  // Convert nested structure to flat array
  Object.entries(nestedData).forEach(([book, chapters]) => {
    if (typeof chapters !== 'object' || chapters === null) {
      console.log(`⚠️  Skipping invalid book: ${book}`);
      return;
    }

    Object.entries(chapters).forEach(([chapterStr, verseObj]) => {
      const chapter = parseInt(chapterStr, 10);

      if (typeof verseObj !== 'object' || verseObj === null) {
        console.log(`⚠️  Skipping invalid chapter: ${book} ${chapter}`);
        return;
      }

      Object.entries(verseObj).forEach(([verseStr, text]) => {
        const verse = parseInt(verseStr, 10);

        if (typeof text !== 'string') {
          console.log(`⚠️  Skipping invalid verse: ${book} ${chapter}:${verse}`);
          return;
        }

        verses.push({
          book,
          chapter,
          verse,
          text,
          translation: translationUpper
        });
      });
    });
  });

  // Sort verses by book order, then chapter, then verse
  const bookOrder = [
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
    'Jude', 'Revelation'
  ];

  verses.sort((a, b) => {
    const bookCompare = bookOrder.indexOf(a.book) - bookOrder.indexOf(b.book);
    if (bookCompare !== 0) return bookCompare;
    if (a.chapter !== b.chapter) return a.chapter - b.chapter;
    return a.verse - b.verse;
  });

  console.log(`✅ Converted ${verses.length.toLocaleString()} verses`);

  // Write output file
  try {
    fs.writeFileSync(outputPath, JSON.stringify(verses, null, 2), 'utf8');
    console.log(`💾 Saved to: ${outputFile}`);
    console.log(`\n📖 Sample verse:`);
    console.log(JSON.stringify(verses[0], null, 2));
    return true;
  } catch (error) {
    console.log(`❌ Error writing file: ${error.message}`);
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: node convert-format.js <translation-code> [translation-code...]');
    console.log('Example: node convert-format.js niv esv nasb');
    process.exit(1);
  }

  console.log('Bible Verse Format Converter');
  console.log('Converting from nested object to flat array format\n');

  let successCount = 0;
  let failureCount = 0;

  args.forEach(code => {
    const success = convertFormat(code);
    if (success) successCount++;
    else failureCount++;
  });

  console.log('\n' + '='.repeat(60));
  console.log(`SUMMARY: ${successCount} succeeded, ${failureCount} failed`);
  console.log('='.repeat(60));

  if (failureCount === 0) {
    console.log('\n✅ All conversions completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Validate: node validate-verses.js ' + args.join(' '));
    console.log('2. Seed database: npm run seed');
  }

  process.exit(failureCount > 0 ? 1 : 0);
}

main();
