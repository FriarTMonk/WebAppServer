/**
 * Convert hebrew-dictionary.js to the format needed for StrongsDefinition interface
 *
 * Input format (from hebrew-dictionary.js):
 * {
 *   "H1": {
 *     "lemma": "אָב",
 *     "xlit": "ʼâb",
 *     "pron": "awb",
 *     "derivation": "a primitive word;",
 *     "strongs_def": "father, in a literal and immediate, or figurative and remote application",
 *     "kjv_def": "chief, (fore-) father(-less), [idiom] patrimony, principal. Compare names in 'Abi-'."
 *   }
 * }
 *
 * Output format (StrongsDefinition):
 * {
 *   "H1": {
 *     "number": "H1",
 *     "transliteration": "ʼâb",
 *     "pronunciation": "awb",
 *     "definition": "father, in a literal and immediate, or figurative and remote application; chief, (fore-) father(-less), patrimony, principal",
 *     "lemma": "אָב",
 *     "derivation": "a primitive word",
 *     "usage": "chief, (fore-) father(-less), patrimony, principal"
 *   }
 * }
 */

const fs = require('fs');
const path = require('path');

// Load the Hebrew dictionary
const hebrewDict = require('./hebrew-dictionary.js');

// Convert the dictionary
const convertedDict = {};
let totalEntries = 0;

for (const [strongsNum, entry] of Object.entries(hebrewDict)) {
  totalEntries++;

  // Clean up strings (remove leading/trailing spaces and semicolons)
  const strongsDef = (entry.strongs_def || '').trim().replace(/;$/, '');
  const kjvDef = (entry.kjv_def || '').trim().replace(/;$/, '').replace(/\.$/, '');
  const derivation = (entry.derivation || '').trim().replace(/;$/, '');
  const xlit = (entry.xlit || '').trim();
  const pron = (entry.pron || '').trim();
  const lemma = (entry.lemma || '').trim();

  // Combine strongs_def and kjv_def for a fuller definition
  // Remove special markers like [idiom], [phrase]
  const cleanKjvDef = kjvDef.replace(/\[idiom\]/g, '').replace(/\[phrase\]/g, '').trim();

  let definition = strongsDef;
  if (cleanKjvDef && !strongsDef.toLowerCase().includes(cleanKjvDef.toLowerCase())) {
    definition = strongsDef ? `${strongsDef}; ${cleanKjvDef}` : cleanKjvDef;
  }

  convertedDict[strongsNum] = {
    number: strongsNum,
    transliteration: xlit,
    pronunciation: pron,
    definition: definition || 'No definition available',
    lemma: lemma,  // Keep the Hebrew word
    derivation: derivation || undefined,
    usage: cleanKjvDef || undefined,
  };
}

// Output as JSON
const outputPath = path.join(__dirname, 'hebrew-definitions.json');
fs.writeFileSync(
  outputPath,
  JSON.stringify(convertedDict, null, 2),
  'utf8'
);

console.log(`✅ Converted ${totalEntries} Hebrew Strong's entries`);
console.log(`📝 Output written to: ${outputPath}`);
console.log(`📊 File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);

// Show a sample entry
const sampleKey = Object.keys(convertedDict)[0];
console.log('\n📖 Sample entry:');
console.log(JSON.stringify({ [sampleKey]: convertedDict[sampleKey] }, null, 2));
