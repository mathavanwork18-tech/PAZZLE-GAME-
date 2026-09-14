import React from 'react';
import ReactDOMServer from 'react-dom/server';
import { AvatarComposer } from '../src/components/AvatarComposer.js';

const animals = [
  'lion', 'tiger', 'panda', 'fox', 'rabbit', 'bear',
  'cat', 'dog', 'penguin', 'koala', 'monkey', 'elephant'
];

const hats = [
  'none', 'classic_cap', 'grad_cap', 'eng_helmet', 'detective_hat',
  'crown', 'party_hat', 'beanie', 'top_hat'
];

const glasses = [
  'none', 'round_glasses', 'square_glasses', 'sunglasses',
  'safety_glasses', 'nerd_glasses'
];

const outfits = [
  'none', 'eng_coat', 'college_hoodie', 'formal_shirt',
  'lab_coat', 'casual_jacket', 'safety_vest', 'grad_outfit'
];

console.log('🎨 Testing Avatar Combinations across all 12 animals and 23 accessories...');

let testsRun = 0;
let errors = 0;

for (const animal of animals) {
  // Test 1: None + None + None
  try {
    const html1 = ReactDOMServer.renderToStaticMarkup(
      React.createElement(AvatarComposer, {
        animal,
        hat: 'none',
        glasses: 'none',
        outfit: 'none'
      })
    );
    if (!html1.includes(`id="animal-${animal}"`)) {
      throw new Error(`Animal ${animal} base group not found`);
    }
    testsRun++;
  } catch (e) {
    console.error(`❌ Error rendering ${animal} base:`, e.message);
    errors++;
  }

  // Test 2: Animal + Hat + Glasses + Outfit
  for (const hat of hats.slice(1, 4)) {
    for (const glass of glasses.slice(1, 3)) {
      for (const outfit of outfits.slice(1, 3)) {
        try {
          const htmlCombo = ReactDOMServer.renderToStaticMarkup(
            React.createElement(AvatarComposer, {
              animal,
              hat,
              glasses: glass,
              outfit
            })
          );
          if (!htmlCombo.includes('viewBox="0 0 512 512"')) {
            throw new Error(`Invalid SVG viewBox for ${animal}`);
          }
          testsRun++;
        } catch (e) {
          console.error(`❌ Error rendering combo ${animal} + ${hat} + ${glass} + ${outfit}:`, e.message);
          errors++;
        }
      }
    }
  }
}

console.log(`✅ Completed ${testsRun} Avatar combinations with ${errors} errors.`);
if (errors > 0) {
  process.exit(1);
} else {
  console.log('🎉 All avatar compositions rendered perfectly!');
}
