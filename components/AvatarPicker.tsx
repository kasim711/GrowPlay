import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AVATARS, Avatar } from '@/constants/avatars';

interface AvatarPickerProps {
  selected: string | null;
  onSelect: (avatar: Avatar) => void;
}

export default function AvatarPicker({ selected, onSelect }: AvatarPickerProps) {
  return (
    <View style={styles.grid}>
      {AVATARS.map((avatar) => {
        const isSelected = selected === avatar.id;
        return (
          <TouchableOpacity
            key={avatar.id}
            style={[
              styles.card,
              isSelected && { borderColor: avatar.color, shadowColor: avatar.color },
            ]}
            activeOpacity={0.7}
            onPress={() => onSelect(avatar)}
          >
            {/* Glow ring */}
            {isSelected && (
              <View style={[styles.glowRing, { borderColor: avatar.color }]} />
            )}

            {/* Emoji circle */}
            <View
              style={[
                styles.emojiCircle,
                { backgroundColor: avatar.color + '20' },
                isSelected && { backgroundColor: avatar.color + '35' },
              ]}
            >
              <Text style={styles.emoji}>{avatar.emoji}</Text>
            </View>

            {/* Name */}
            <Text
              style={[
                styles.name,
                isSelected && { color: avatar.color },
              ]}
            >
              {avatar.name}
            </Text>

            {/* Gender tag */}
            <Text style={styles.genderTag}>
              {avatar.gender === 'male' ? '♂' : '♀'}
            </Text>

            {/* Checkmark */}
            {isSelected && (
              <View style={[styles.checkmark, { backgroundColor: avatar.color }]}>
                <Text style={styles.checkText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 8,
  },
  card: {
    width: '29%',
    backgroundColor: '#111111',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#222222',
    position: 'relative',
    overflow: 'hidden',
  },
  glowRing: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 18,
    borderWidth: 2,
    opacity: 0.6,
  },
  emojiCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emoji: {
    fontSize: 32,
  },
  name: {
    color: '#ccc',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  genderTag: {
    color: '#555',
    fontSize: 10,
    marginTop: 2,
  },
  checkmark: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
