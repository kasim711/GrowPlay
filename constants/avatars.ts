// 7 COC-style trading avatars — male & female options
export interface Avatar {
  id: string;
  name: string;
  emoji: string;
  color: string;       // accent/background color
  gender: 'male' | 'female';
}

export const AVATARS: Avatar[] = [
  {
    id: 'bull_king',
    name: 'Bull King',
    emoji: '🐂',
    color: '#00C853',
    gender: 'male',
  },
  {
    id: 'bear_queen',
    name: 'Bear Queen',
    emoji: '🐻',
    color: '#E040FB',
    gender: 'female',
  },
  {
    id: 'wolf_trader',
    name: 'Wolf Trader',
    emoji: '🐺',
    color: '#448AFF',
    gender: 'male',
  },
  {
    id: 'fox_maven',
    name: 'Fox Maven',
    emoji: '🦊',
    color: '#FF6D00',
    gender: 'female',
  },
  {
    id: 'eagle_eye',
    name: 'Eagle Eye',
    emoji: '🦅',
    color: '#FFD600',
    gender: 'male',
  },
  {
    id: 'phoenix_rise',
    name: 'Phoenix Rise',
    emoji: '🔥',
    color: '#FF1744',
    gender: 'female',
  },
  {
    id: 'dragon_mogul',
    name: 'Dragon Mogul',
    emoji: '🐉',
    color: '#7C4DFF',
    gender: 'male',
  },
];

export const getAvatarById = (id: string | null | undefined): Avatar => {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
};
