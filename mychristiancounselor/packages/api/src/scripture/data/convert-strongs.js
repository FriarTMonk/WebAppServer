#!/usr/bin/env node
/**
 * Convert Bible JSON files with inline Strong's numbers to the required format
 * with a separate strongs array
 */

const fs = require('fs');
const path = require('path');

function extractStrongsFromText(text) {
  const strongs = [];
  let position = 1;

  // Pattern to match words with Strong's numbers like: word{H1234} or word{H1234}{(H8804)}
  const pattern = /(\S+?)(\{[HG]\d+\}(?:\{[^}]+\})*)/g;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const word = match[1];
    const strongsCodes = match[2];

    // Extract all Strong's numbers from the codes (e.g., {H1234}{(H8804)})
    const numberPattern = /\{([HG]\d+)\}/g;
    let numberMatch;

    while ((numberMatch = numberPattern.exec(strongsCodes)) !== null) {
      strongs.push({
        word: word,
        number: numberMatch[1],
        position: position
      });
    }

    position++;
  }

  return strongs;
}

function cleanText(text) {
  // Remove Strong's numbers and their grammatical codes from text
  // Pattern matches {H1234} or {H1234}{(H8804)} or {G1234}{(G8804)}
  return text.replace(/\{[HG]\d+\}(?:\{[^}]+\})?/g, '').trim();
}

function convertVerse(verse) {
  const cleanedText = cleanText(verse.text);
  const strongs = extractStrongsFromText(verse.text);

  return {
    book: verse.book_name || verse.book,
    chapter: verse.chapter,
    verse: verse.verse,
    text: cleanedText,
    translation: verse.translation || 'KJV', // Will be overridden by translation param
    strongs: strongs.length > 0 ? strongs : undefined
  };
}

function convertFile(inputPath, outputPath, translation) {
  console.log(`\nConverting ${inputPath}...`);
  console.log(`Reading file...`);

  const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

  // The input has metadata and verses
  const verses = data.verses || data;

  if (!Array.isArray(verses)) {
    console.error('Error: Input data is not in expected format (expected array of verses)');
    return;
  }

  console.log(`Found ${verses.length} verses`);
  console.log(`Converting verses...`);

  const convertedVerses = verses.map((verse, index) => {
    if ((index + 1) % 5000 === 0) {
      console.log(`  Processed ${index + 1}/${verses.length} verses...`);
    }

    const converted = convertVerse(verse);
    converted.translation = translation; // Override with correct translation
    return converted;
  });

  console.log(`Writing to ${outputPath}...`);
  fs.writeFileSync(outputPath, JSON.stringify(convertedVerses, null, 2), 'utf8');

  console.log(`✓ Successfully converted ${convertedVerses.length} verses`);

  // Show sample
  console.log(`\nSample verse (Genesis 1:1):`);
  console.log(JSON.stringify(convertedVerses[0], null, 2));
}

function main() {
  const dataDir = __dirname;

  const files = [
    { input: 'kjv-verses.json', output: 'kjv-verses-formatted.json', translation: 'KJV' },
    { input: 'asv-verses.json', output: 'asv-verses-formatted.json', translation: 'ASV' }
  ];

  console.log('='.repeat(60));
  console.log('Bible Verse Format Converter');
  console.log('Converting inline Strong\'s numbers to structured format');
  console.log('='.repeat(60));

  for (const file of files) {
    const inputPath = path.join(dataDir, file.input);
    const outputPath = path.join(dataDir, file.output);

    if (!fs.existsSync(inputPath)) {
      console.log(`\n⚠️  Skipping ${file.input} - file not found`);
      continue;
    }

    try {
      convertFile(inputPath, outputPath, file.translation);
    } catch (error) {
      console.error(`\n❌ Error converting ${file.input}:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Conversion complete!');
  console.log('='.repeat(60));
  console.log('\nNext steps:');
  console.log('1. Review the generated *-formatted.json files');
  console.log('2. If satisfied, replace the original files:');
  console.log('   mv kjv-verses-formatted.json kjv-verses.json');
  console.log('   mv asv-verses-formatted.json asv-verses.json');
  console.log('3. Run: cd packages/api && npm run seed');
}

main();
