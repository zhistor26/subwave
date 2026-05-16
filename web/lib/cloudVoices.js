// Curated default voices per cloud TTS provider. OpenAI voices are plain ids;
// ElevenLabs ids are the stock library voice ids. Shared by the Personas page
// (per-persona voice) and the Settings page (the shared Cloud-engine default).
// A free-text "Custom voice id…" override sits next to every dropdown, so this
// list only needs the common picks — not every voice the providers offer.
export const CLOUD_VOICES = {
  openai: [
    { id: 'alloy',   label: 'Alloy' },
    { id: 'ash',     label: 'Ash' },
    { id: 'ballad',  label: 'Ballad' },
    { id: 'coral',   label: 'Coral' },
    { id: 'echo',    label: 'Echo' },
    { id: 'fable',   label: 'Fable' },
    { id: 'nova',    label: 'Nova' },
    { id: 'onyx',    label: 'Onyx' },
    { id: 'sage',    label: 'Sage' },
    { id: 'shimmer', label: 'Shimmer' },
  ],
  elevenlabs: [
    { id: '21m00Tcm4TlvDq8ikWAM', label: 'Rachel' },
    { id: 'AZnzlk1XvdvUeBnXmlld', label: 'Domi' },
    { id: 'EXAVITQu4vr4xnSDxMaL', label: 'Sarah' },
    { id: 'ErXwobaYiN019PkySvjV', label: 'Antoni' },
    { id: 'MF3mGyEYCl7XYWbV9V6O', label: 'Elli' },
    { id: 'TxGEqnHWrfWFTfGW9XjX', label: 'Josh' },
    { id: 'VR6AewLTigWG4xSOukaG', label: 'Arnold' },
    { id: 'pNInz6obpgDQGcFmaJgB', label: 'Adam' },
    { id: 'yoZ06aMxZJJ28mfd3POQ', label: 'Sam' },
  ],
};
