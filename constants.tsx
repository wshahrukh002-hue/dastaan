
import React from 'react';
import { Story } from './types';

export const SAMPLE_STORIES: Story[] = [
  {
    id: '1',
    title: 'کوشش اور ہمت (The Power of Effort)',
    description: 'A classic moral story about a hardworking ant and a lazy grasshopper.',
    content: `ایک دفعہ کا ذکر ہے کہ ایک چیونٹی سخت گرمی میں دانے اکٹھے کر رہی تھی۔ اس کا مقصد سردیوں کے لیے خوراک جمع کرنا تھا۔ قریب ہی ایک ٹڈا آرام کر رہا تھا اور چیونٹی کا مذاق اڑا رہا تھا۔ لیکن جب سردیاں آئیں تو ٹڈے کے پاس کھانے کو کچھ نہ تھا، جبکہ چیونٹی سکون سے اپنی محنت کا پھل کھا رہی تھی۔`
  },
  {
    id: '2',
    title: 'سچائی کی جیت (Victory of Truth)',
    description: 'An immersive tale about a shepherd boy and the importance of honesty.',
    content: `کسی گاؤں میں ایک چرواہا رہتا تھا جو روز اپنی بھیڑیں چرانے جنگل جاتا تھا۔ ایک دن اس نے مذاق میں چلانا شروع کیا "شیر آیا، شیر آیا"۔ گاؤں والے بچانے آئے تو وہ ہنسنے لگا۔ لیکن جب سچ میں شیر آیا تو کوئی اس کی مدد کو نہ آیا۔ اس کہانی سے ہمیں سبق ملتا ہے کہ جھوٹ کا انجام ہمیشہ برا ہوتا ہے۔`
  },
  {
    id: '3',
    title: 'خوابوں کی دنیا (World of Dreams)',
    description: 'A gentle bedtime story for children about a magical journey.',
    content: `رات کے سائے گہرے ہو رہے تھے اور ستارے آسمان پر چمک رہے تھے۔ ننھے علی نے آنکھیں بند کیں تو وہ ایک ایسی دنیا میں پہنچ گیا جہاں درختوں پر مٹھائیاں لگی تھیں اور پرندے باتیں کرتے تھے۔ یہ اس کے خوابوں کی وہ خوبصورت دنیا تھی جہاں صرف خوشیاں ہی خوشیاں تھیں۔`
  }
];

export const BACKGROUND_TRACKS = [
  { name: 'None', url: '' },
  { name: 'Lofi Study', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' }, // Placeholder
  { name: 'Nature Ambience', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' }, // Placeholder
  { name: 'Soft Piano', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' } // Placeholder
];

export const Icons = {
  Play: () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
    </svg>
  ),
  Stop: () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
    </svg>
  ),
  Download: () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M7.5 12l4.5 4.5m0 0 4.5-4.5M12 3v13.5" />
    </svg>
  ),
  Magic: () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  )
};
